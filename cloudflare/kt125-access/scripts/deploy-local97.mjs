import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {KT125_INVITATION_SCHEMA} from '../src/staff-invitations.mjs';
import {KT125_REQUEST_SCHEMA} from '../src/access-requests.mjs';
import {LOCAL_SCHEMA} from '../src/local-auth/common.mjs';
const account='90df5489417e4b53179a852c446aeed1',legacy='tpu-plovdiv-kt125-private',local='tpu-plovdiv-kt125-local-auth';
const token=process.env.CF_TOKEN;if(!token)throw Error('Deployment credential missing');
const base='https://api.cloudflare.com/client/v4/accounts/'+account,headers={Authorization:'Bearer '+token};
async function api(path,method='GET',body){
 const r=await fetch(base+path,{method,headers:{...headers,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
 const d=await r.json().catch(()=>null);
 if(!r.ok||!d?.success)throw Error('Cloudflare '+method+' '+path.split('?')[0]+': HTTP '+r.status+'; codes '+JSON.stringify(d?.errors?.map(e=>e.code)||[]));return d.result;
}
const settings=await api('/workers/scripts/'+legacy+'/settings');
const existingBindings=settings.bindings||[],dbBinding=existingBindings.find(b=>b.name==='KT125_DB'&&b.type==='d1');
if(!dbBinding?.id)throw Error('Existing private D1 binding missing; no resources changed');
const query=async(sql,params=[])=>api('/d1/database/'+dbBinding.id+'/query','POST',{sql,params});
const principals=await query("SELECT DISTINCT organization_id FROM kt125_users WHERE active=1 AND role='egmaster'");
const orgs=principals.flatMap(r=>r.results||[]).map(x=>x.organization_id);
if(orgs.length!==1||!/^[A-Za-z0-9_-]{1,160}$/.test(orgs[0]))throw Error('Existing organization is ambiguous');
const subdomain=await api('/workers/subdomain');if(!/^[a-z0-9-]+$/i.test(subdomain.subdomain||''))throw Error('Existing workers.dev subdomain missing');
const origin='https://'+local+'.'+subdomain.subdomain+'.workers.dev';
// Do not replace an existing native-auth service or its password secret.
const probe=await fetch(base+'/workers/scripts/'+local+'/settings',{headers,signal:AbortSignal.timeout(30000)});
const found=await probe.json().catch(()=>null);
if(probe.status!==404||found?.success)throw Error('Local service already exists or absence cannot be established; refusing overwrite');
mkdirSync('dist/local97-backup',{recursive:true});
writeFileSync('dist/local97-backup/private-settings.json',JSON.stringify(settings,null,2));
const oldCode=await fetch(base+'/workers/scripts/'+legacy,{headers,signal:AbortSignal.timeout(30000)});
if(!oldCode.ok)throw Error('Cannot back up existing Worker source');
writeFileSync('dist/local97-backup/private-source.multipart',Buffer.from(await oldCode.arrayBuffer()));
writeFileSync('dist/local97-backup/private-source-content-type.txt',oldCode.headers.get('content-type')||'');
// Additive tables and revocation trigger only; no existing identities or cases rewritten.
for(const sql of [...KT125_INVITATION_SCHEMA,...KT125_REQUEST_SCHEMA,...LOCAL_SCHEMA])await query(sql);
console.log('LOCAL97_ADDITIVE_SCHEMA: ready; existing organization and identities retained');
async function upload(name,bundle,metadata){
 const form=new FormData();form.set('metadata',new Blob([JSON.stringify({main_module:'worker.mjs',...metadata})],{type:'application/json'}));
 form.set('worker.mjs',new Blob([readFileSync(bundle)],{type:'application/javascript+module'}),'worker.mjs');
 return api('/workers/scripts/'+name,'PUT',form);
}
const plain=(name,text)=>({type:'plain_text',name,text});
await upload(local,'dist/kt125-local-auth-worker.mjs',{
 compatibility_date:'2026-07-30',compatibility_flags:['nodejs_compat'],
 migrations:{new_tag:'local97-password-kdf',steps:[{new_sqlite_classes:['PasswordKdf']}]},
 bindings:[{type:'d1',name:'KT125_DB',id:dbBinding.id},plain('KT125_LOCAL_ENABLED','true'),plain('KT125_LOCAL_ORIGIN',origin),plain('KT125_REQUEST_ORGANIZATION',orgs[0]),
  plain('KT125_SMTP_HOST','mail.plovdiv.riew.gov.bg'),plain('KT125_SMTP_USER','gergov@plovdiv.riew.gov.bg'),plain('KT125_SMTP_FROM','gergov@plovdiv.riew.gov.bg'),
  {type:'secret_text',name:'KT125_AUTH_SECRET',text:randomBytes(32).toString('hex')},
  {type:'durable_object_namespace',name:'KT125_PASSWORDS',class_name:'PasswordKdf'},
  {type:'service',name:'KT125_LOCAL_AUTH',service:local,entrypoint:'LocalAuthService'}]
});
await api('/workers/scripts/'+local+'/subdomain','POST',{enabled:true,previews_enabled:false});
let live=false;
for(let n=0;n<8;n++){
 const r=await fetch(origin+'/auth/register',{redirect:'manual',signal:AbortSignal.timeout(15000)}).catch(()=>null);
 if(r?.status===200&&(await r.text()).includes('name="password"')){live=true;break;}
 await new Promise(resolve=>setTimeout(resolve,2500));
}
if(!live)throw Error('New registration service did not pass public GET check; existing admin code remains unchanged');
console.log('LOCAL97_REGISTRATION_LIVE: '+origin+'/auth/register');
// Abort rather than erase any secret. Preserve all existing ordinary bindings;
// secret values remain entirely inside Cloudflare via keep_bindings.
const retained=existingBindings.filter(b=>b.type!=='secret_text'&&!['KT125_LOCAL_ORIGIN','KT125_LOCAL_AUTH'].includes(b.name));
const metadata={compatibility_date:settings.compatibility_date||'2026-07-30',compatibility_flags:settings.compatibility_flags||[],keep_bindings:['secret_text'],
 bindings:[...retained,plain('KT125_LOCAL_ORIGIN',origin),{type:'service',name:'KT125_LOCAL_AUTH',service:local,entrypoint:'LocalAuthService'}]};
for(const key of ['observability','logpush','placement','limits','tail_consumers'])if(settings[key]!==undefined)metadata[key]=settings[key];
await upload(legacy,'dist/kt125-private-worker.mjs',metadata);
const after=await api('/workers/scripts/'+legacy+'/settings');
const beforeSecrets=existingBindings.filter(b=>b.type==='secret_text').map(b=>b.name).sort(),afterSecrets=(after.bindings||[]).filter(b=>b.type==='secret_text').map(b=>b.name).sort();
if(JSON.stringify(beforeSecrets)!==JSON.stringify(afterSecrets))throw Error('Unexpected secret binding change; inspect stored backup');
for(const b of retained){if(!(after.bindings||[]).some(x=>x.name===b.name&&x.type===b.type))throw Error('Existing binding not retained: '+b.name)}
console.log('LOCAL97_ADMIN_BRIDGE: published; previous secret bindings retained');
console.log('LOCAL97_SMTP: NOT CONFIGURED; no email or user activation attempted');
writeFileSync('dist/local97-deployment.json',JSON.stringify({origin,registration:origin+'/auth/register',login:origin+'/auth/login',smtpReady:false,legacyAdminUpdated:true},null,2));
