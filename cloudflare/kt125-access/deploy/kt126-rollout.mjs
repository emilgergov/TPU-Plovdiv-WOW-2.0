import {readFileSync} from 'node:fs';
import {REGISTRY_SCHEMA} from '../src/kt126/schema.mjs';
const account='90df5489417e4b53179a852c446aeed1',base='https://api.cloudflare.com/client/v4/accounts/'+account;
const headers={Authorization:'Bearer '+process.env.CF_TOKEN};
const native='tpu-plovdiv-kt125-local-auth',author='tpu-plovdiv-ai-author-v27';
async function api(path,options={}){const r=await fetch(base+path,{...options,headers:{...headers,...options.headers}});const d=await r.json();if(!r.ok||!d.success)throw Error('Cloudflare operation failed HTTP '+r.status+' codes '+JSON.stringify(d.errors?.map(x=>x.code)));return d.result}
const path=name=>'/workers/scripts/'+name;
const nativeBefore=await api(path(native)+'/settings'),authorBefore=await api(path(author)+'/settings');
const names=x=>(x||[]).map(b=>b.name+':'+b.type).sort().join('|');
const db=nativeBefore.bindings.find(b=>b.name==='KT125_DB'&&b.type==='d1');
if(!db?.id||!nativeBefore.bindings.some(b=>b.name==='KT125_AUTH_SECRET'&&b.type==='secret_text')||!nativeBefore.bindings.some(b=>b.name==='KT125_PASSWORDS'&&b.type==='durable_object_namespace'))throw Error('Unexpected native service configuration');
const healthURL='https://'+author+'.emilgergov.workers.dev/health',healthBefore=await fetch(healthURL).then(r=>r.json());
if(healthBefore.stage4Contract!=='KT115_EXPERT_PREVIEW_V1'||healthBefore.stage5Contract!=='KT117_DOCUMENT_DRAFT_V1')throw Error('Unexpected author contract');
async function deploy(name,before,file,bindings){
 const metadata={main_module:'worker.mjs',compatibility_date:before.compatibility_date,compatibility_flags:before.compatibility_flags||[],keep_bindings:['secret_text'],bindings:bindings.filter(b=>b.type!=='secret_text')};
 for(const key of ['observability','logpush','placement','limits','tail_consumers'])if(before[key]!==undefined)metadata[key]=before[key];
 const form=new FormData();form.set('metadata',new Blob([JSON.stringify(metadata)],{type:'application/json'}));form.set('worker.mjs',new Blob([readFileSync(file)],{type:'application/javascript+module'}),'worker.mjs');
 await api(path(name),{method:'PUT',body:form});
 let after;for(let attempt=0;attempt<12;attempt++){after=await api(path(name)+'/settings');if(names(after.bindings)===names(bindings))break;await new Promise(resolve=>setTimeout(resolve,1500));}
 if(names(after.bindings)!==names(bindings)){const expected=names(bindings).split('|'),actual=names(after.bindings).split('|');console.log('BINDING_NAMES_ONLY',JSON.stringify({service:name,missing:expected.filter(x=>!actual.includes(x)),extra:actual.filter(x=>!expected.includes(x))}));throw Error('Unexpected binding change in '+name);}
 for(const binding of before.bindings.filter(b=>b.type==='secret_text'))if(!after.bindings.some(b=>b.name===binding.name&&b.type==='secret_text'))throw Error('Secret binding missing');
 return after;
}
// Only new tables. Never migrate existing account rows or renumber previous cases.
for(const sql of REGISTRY_SCHEMA)await api('/d1/database/'+db.id+'/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql,params:[]})});
const columns=await api('/d1/database/'+db.id+'/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql:'PRAGMA table_info(kt126_files)',params:[]})});
if(!columns[0]?.results?.some(x=>x.name==='source_id'))throw Error('Unexpected pre-existing KT126 schema; rollout left disabled');
const binding={name:'KT126_REGISTRY',type:'service',service:native,entrypoint:'LocalAuthService'};
const existing=authorBefore.bindings.find(b=>b.name===binding.name);if(existing&&(existing.type!==binding.type||existing.service!==native||existing.entrypoint!==binding.entrypoint))throw Error('Unexpected registry service binding');
const authorBindings=[...authorBefore.bindings.filter(b=>b.name!==binding.name),binding];
const nativeBindings=[...nativeBefore.bindings.filter(b=>b.name!=='KT126_REGISTRY_ENABLED'),{name:'KT126_REGISTRY_ENABLED',type:'plain_text',text:'true'}];
let nativePublished=false;
try{
 // The existing native service already exposes the disabled, tested private RPC.
 // Publish the author boundary first; only then expose the Stage 1 UI.
 await deploy(author,authorBefore,'dist/kt126-author.mjs',authorBindings);
 nativePublished=true;await deploy(native,nativeBefore,'dist/kt126-native.mjs',nativeBindings);
 await new Promise(r=>setTimeout(r,7000));
 const origin='https://'+native+'.emilgergov.workers.dev';
 for(const route of ['/auth/login','/auth/register','/auth/admin','/auth/forgot']){const r=await fetch(origin+route);if(r.status!==200||!(await r.text()).includes('data-layout="local100"'))throw Error('Native login layout changed');}
 for(const route of ['/kt126/client.js','/kt126/registry']){const r=await fetch(origin+route,{redirect:'manual'});if(r.status!==403)throw Error('Unauthenticated registry surface is exposed');}
 for(const route of ['/subject-improve','/stage4-proposal','/stage5-document']){
  const r=await fetch('https://'+author+'.emilgergov.workers.dev'+route,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-KT126-Case':'11111111-1111-4111-8111-111111111111','X-KT126-Session':'invalid'},body:JSON.stringify({caseId:'11111111-1111-4111-8111-111111111111'})});if(r.status!==403)throw Error('Private author registry guard did not reject an invalid session');
 }
 const healthAfter=await fetch(healthURL).then(r=>r.json());for(const key of ['service','status','stage4Contract','stage5Contract','apiKeyConfigured','aiGenerationEnabled'])if(healthAfter[key]!==healthBefore[key])throw Error('Author readiness or contracts changed');
 console.log('KT126_ROLLOUT_OK: private yearly registry, Stage 1 confirmation/omission, original-file integrity, same-case supplements, saved expert drafts, Word archive; existing secret bindings, native accounts, author contracts and R6 legal logic retained. No production test cases or paid AI calls created.');
}catch(error){
 if(nativePublished){const disabled=[...nativeBindings.filter(b=>b.name!=='KT126_REGISTRY_ENABLED'),{name:'KT126_REGISTRY_ENABLED',type:'plain_text',text:'false'}];await deploy(native,nativeBefore,'dist/kt126-native.mjs',disabled);console.log('KT126 rollout disabled after a failed live check; existing access UI remains available.');}
 throw error;
}
