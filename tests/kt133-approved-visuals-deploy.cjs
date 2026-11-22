'use strict';
// KT133 approved visuals — only additive public gateway patch; never writes user data or backend Worker.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const ACCOUNT=process.env.CF_ACCOUNT,TOKEN=process.env.CF_TOKEN;
assert.ok(ACCOUNT&&TOKEN,'Cloudflare access not available');
const target='kt133-tpu-plovdiv-kt125-local-auth';
const root='https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT+'/workers/scripts/'+target;
const publicRoot='https://'+target+'.emilgergov.workers.dev';
const fileBase='https://raw.githubusercontent.com/emilgergov/TPU-Plovdiv-WOW-2.0/83542c056d8c9c9a8b6cbfd71b96d1056782e970/kt80/';
async function cf(uri,options={}){
 const response=await fetch(uri,{...options,headers:{Authorization:'Bearer '+TOKEN,...options.headers},signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error('Cloudflare HTTP '+response.status+' on '+new URL(uri).pathname);
 const ct=response.headers.get('content-type')||'';
 if(ct.includes('application/json')){
  const j=await response.json();
  if(!j.success)throw Error('Cloudflare API error codes: '+(j.errors||[]).map(e=>e.code).join(','));
  return j;
 }
 return response;
}
const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
const parseDeployments=j=>{
 const arr=j.result?.deployments||j.result?.items||[];
 assert.ok(arr.length>0,'No deployed version to safeguard');
 const d=arr.slice().sort((x,y)=>Date.parse(y.created_on||0)-Date.parse(x.created_on||0))[0];
 assert.ok(Array.isArray(d.versions)&&d.versions.length>=1,'Unrecognized production deployment');
 const total=d.versions.reduce((n,v)=>n+v.percentage,0);
 assert.ok(Math.abs(total-100)<0.01,'Unexpected production traffic split');
 return d.versions.map(x=>({version_id:x.version_id,percentage:x.percentage}));
};
function settingsMetadata(j){
 assert.equal(j.success,true);
 const settings=j.result||{};
 const oldBindings=settings.bindings||[];
 assert.equal(oldBindings.length,2,'KT133 gateway bindings unexpectedly changed');
 assert.equal(oldBindings.filter(b=>b.type==='service').length,1);
 assert.equal(oldBindings.filter(b=>b.type==='plain_text').length,1);
 const bindings=oldBindings.map(b=>{
  if(b.type==='service'){
   assert.ok(b.name&&b.service);
   return {name:b.name,type:'service',service:b.service,...(b.environment?{environment:b.environment}:{})};
  }
  assert.ok(b.name&&typeof b.text==='string');
  return {name:b.name,type:'plain_text',text:b.text};
 });
 const metadata={main_module:'kt133-visual-gateway.mjs',bindings,compatibility_date:settings.compatibility_date||'2026-10-01',
 ...(settings.compatibility_flags?.length?{compatibility_flags:settings.compatibility_flags}:{})};
 return {metadata,bindings};
}
async function getJson(uri){return await cf(uri)}
function versions(j){
 const a=Array.isArray(j.result)?j.result:j.result?.items||[];
 return a.map(v=>v.id||v.version_id).filter(Boolean);
}
async function publicGet(endpoint){
 return fetch(publicRoot+endpoint,{redirect:'manual',signal:AbortSignal.timeout(18000),headers:{'Cache-Control':'no-cache'}});
}
async function main(){
 // Read-only validation before any Cloudflare mutation.
 const [current,settings,deployments,currentVersions]=await Promise.all([
  cf(root),getJson(root+'/settings'),getJson(root+'/deployments'),getJson(root+'/versions?per_page=20')
 ]);
 const [css,js]=await Promise.all(['KT133_APPROVED_VISUALS.css','KT133_APPROVED_VISUALS.js'].map(n=>fetch(fileBase+n,{signal:AbortSignal.timeout(15000)})));
 assert.ok(css.ok&&js.ok,'Immutable approved visual assets unavailable');
 assert.ok((await css.text()).length>10000,'CSS incomplete');
 assert.ok((await js.text()).length>10000,'JS incomplete');
 const oldDeployment=parseDeployments(deployments);
 const beforeVersions=new Set(versions(currentVersions));
 const {metadata,bindings:expectedBindings}=settingsMetadata(settings);
 const original=await current.text();
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'kt133visual-'));
 const sourcePath=path.join(tmp,'protected-gateway-multipart.txt');
 const candidatePath=path.join(tmp,'candidate.mjs');
 fs.writeFileSync(sourcePath,original);
 const built=spawnSync(process.execPath,['tests/kt133-proxy-visuals-patch.cjs',sourcePath,candidatePath],{encoding:'utf8'});
 if(built.status!==0)throw Error('Original gateway patch refused: '+(built.stderr||'').slice(0,350));
 const candidate=fs.readFileSync(candidatePath,'utf8');
 assert.ok(candidate.includes('__kt133_approved_visuals.css')&&candidate.includes('__kt133_approved_visuals.js'));
 const syntax=spawnSync(process.execPath,['--check',candidatePath],{encoding:'utf8'});
 if(syntax.status!==0)throw Error('Candidate syntax invalid');
 console.log('PRECHECK PASS: visual assets, protected proxy code, two exact bindings, rollback deployment');
 let changed=false;
 try{
  const form=new FormData();
  form.set('metadata',new Blob([JSON.stringify(metadata)],{type:'application/json'}),'metadata.json');
  form.set('kt133-visual-gateway.mjs',new Blob([candidate],{type:'application/javascript+module'}),'kt133-visual-gateway.mjs');
  changed=true; // PUT can activate a version even if response check later fails.
  await cf(root,{method:'PUT',body:form});
  const updatedVersions=versions(await getJson(root+'/versions?per_page=20'));
  const added=updatedVersions.find(id=>!beforeVersions.has(id));
  assert.ok(added,'Could not identify newly uploaded version');
  await cf(root+'/deployments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({strategy:'percentage',versions:[{version_id:added,percentage:100}]})});
  const afterSettings=(await getJson(root+'/settings')).result.bindings||[];
  assert.equal(afterSettings.length,2,'Worker binding count changed after deployment');
  const rebinding=afterSettings.map(b=>b.type==='service'?{name:b.name,type:'service',service:b.service,...(b.environment?{environment:b.environment}:{})}:{name:b.name,type:b.type,text:b.text});
  assert.ok(same(rebinding,expectedBindings),'Gateway service and text bindings altered');
  const login=await publicGet('/auth/login');
  assert.ok(login.status>=200&&login.status<500,'Login entry no longer responds normally');
  const proof=await Promise.all(['/__kt133_approved_visuals.css','/__kt133_approved_visuals.js'].map(publicGet));
  assert.ok(proof.every(x=>x.status===200),'Approved visual endpoints unavailable on KT133');
  const [liveCss,liveJs]=await Promise.all(proof.map(x=>x.text()));
  assert.ok(liveCss.length>10000&&liveJs.length>10000,'Visual files truncated at live KT133 entry');
  console.log('DEPLOY SUCCESS: KT133 gateway now serves approved visuals; login, original backend and two bindings preserved.');
  console.log('Verification URL: '+publicRoot+'/auth/login');
  changed=false;
 }catch(e){
  if(changed){
   console.error('KT133 deployment check failed. Attempting immediate rollback to prior deployed version.');
   try{
    await cf(root+'/deployments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({strategy:'percentage',versions:oldDeployment})});
    console.error('ROLLBACK SUCCESS: original KT133 deployment restored.');
   }catch(rollbackError){console.error('ROLLBACK NOT CONFIRMED:',rollbackError.message);}
  }
  throw e;
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
}
main().catch(e=>{console.error('KT133 visual-only deployment not accepted:',e.message);process.exitCode=1;});
