import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const account='90df5489417e4b53179a852c446aeed1',base='https://api.cloudflare.com/client/v4/accounts/'+account;
const native='tpu-plovdiv-kt125-local-auth',author='tpu-plovdiv-ai-author-v27',router='kt131-tpu-plovdiv-kt125-local-auth';
const origin='https://kt131-'+native+'.emilgergov.workers.dev';
const headers={Authorization:'Bearer '+process.env.CF_TOKEN};
async function api(path,options={}){
 const response=await fetch(base+path,{...options,headers:{...headers,...options.headers}});
 const data=await response.json();if(!response.ok||!data.success)throw Error('Cloudflare HTTP '+response.status+' codes '+JSON.stringify(data.errors?.map(x=>x.code)));return data.result;
}
const postJSON=(route,body)=>api(route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const path=name=>'/workers/scripts/'+name;
const getDeployment=async name=>(await api(path(name)+'/deployments')).deployments[0];
const active=deployment=>{const serving=deployment.versions.filter(v=>v.percentage>0);if(serving.length!==1||serving[0].percentage!==100)throw Error('Expected one unchanged stable version at 100%');return serving[0].version_id};
const nativeBefore=await getDeployment(native),authorBefore=await getDeployment(author);
const nativeStable=active(nativeBefore),authorStable=active(authorBefore);
const nativeSettings=await api(path(native)+'/settings'),authorSettings=await api(path(author)+'/settings');
if(!nativeSettings.bindings.some(b=>b.name==='KT125_AUTH_SECRET'&&b.type==='secret_text')||!authorSettings.bindings.some(b=>b.name==='OPENAI_API_KEY'&&b.type==='secret_text'))throw Error('Required existing secret bindings missing');
if(!['https://'+native+'.emilgergov.workers.dev',origin].includes(nativeSettings.bindings.find(b=>b.name==='KT125_LOCAL_ORIGIN')?.text))throw Error('Unexpected native origin configuration');
const liveBefore=await fetch('https://'+native+'.emilgergov.workers.dev/auth/login');if(liveBefore.status!==200||(await liveBefore.text()).includes('КТ131 · ТЕСТОВА ВЕРСИЯ'))throw Error('Stable public login is not unchanged');
async function upload(name,settings,file,overrides=[],alias){
 const replaced=new Set(overrides.map(b=>b.name));
 const metadata={main_module:'worker.mjs',compatibility_date:settings.compatibility_date,compatibility_flags:settings.compatibility_flags||[],bindings:[...settings.bindings.filter(b=>!replaced.has(b.name)).map(b=>({name:b.name,type:'inherit'})),...overrides],annotations:{'workers/message':'KT131 isolated editor test; production stable version remains at 100%','workers/commit_sha':process.env.GITHUB_SHA||'',...(alias?{'workers/alias':alias}:{})}};
 const form=new FormData();form.set('metadata',new Blob([JSON.stringify(metadata)],{type:'application/json'}));form.set('worker.mjs',new Blob([readFileSync(file)],{type:'application/javascript+module'}),'worker.mjs');
 const version=await api(path(name)+'/versions?bindings_inherit=strict',{method:'POST',body:form});if(!/^[0-9a-f-]{36}$/.test(version.id||''))throw Error('Missing uploaded version ID');console.log('UPLOADED_PREVIEW_VERSION',JSON.stringify({service:name,id:version.id,alias:alias||null,hasPreview:version.metadata?.has_preview??version.resources?.script?.hasPreview}));return version.id;
}
const authorVersion=await upload(author,authorSettings,'dist/kt131-author-preview.mjs');
const nativeVersion=await upload(native,nativeSettings,'dist/kt131-native-preview.mjs',[
 {name:'KT125_LOCAL_ORIGIN',type:'plain_text',text:origin},
 {name:'KT131_AUTHOR_VERSION',type:'plain_text',text:authorVersion}
],'kt131');
let authorOverrideEnabled=false,nativeOverrideEnabled=false;
try{
 // Version overrides require inclusion in the deployment. The tested candidate
 // is explicitly 0%; ordinary public requests continue to use the old version.
 if(active(await getDeployment(author))!==authorStable||active(await getDeployment(native))!==nativeStable)throw Error('Stable deployment changed concurrently');
 await postJSON(path(author)+'/deployments',{strategy:'percentage',versions:[{version_id:authorStable,percentage:100},{version_id:authorVersion,percentage:0}]});authorOverrideEnabled=true;
 await postJSON(path(native)+'/deployments',{strategy:'percentage',versions:[{version_id:nativeStable,percentage:100},{version_id:nativeVersion,percentage:0}]});nativeOverrideEnabled=true;
 const metadata={main_module:'worker.mjs',compatibility_date:nativeSettings.compatibility_date,bindings:[{name:'KT131_NATIVE',type:'service',service:native},{name:'KT131_NATIVE_VERSION',type:'plain_text',text:nativeVersion}]};
 const form=new FormData();form.set('metadata',new Blob([JSON.stringify(metadata)],{type:'application/json'}));form.set('worker.mjs',new Blob([readFileSync('dist/kt131-router.mjs')],{type:'application/javascript+module'}),'worker.mjs');
 await api(path(router),{method:'PUT',body:form});
 await postJSON(path(router)+'/subdomain',{enabled:true,previews_enabled:false});
 let ready=false;
 for(let attempt=0;attempt<18;attempt++){
  try{const r=await fetch(origin+'/kt131/readiness',{signal:AbortSignal.timeout(15000)});const d=await r.json().catch(()=>({}));if(attempt===0||attempt===17)console.log('PREVIEW_READINESS',JSON.stringify({status:r.status,preview:d.preview,authorVersionConfirmed:d.authorVersionConfirmed,invalidSessionDenied:d.invalidSessionDenied}));if(r.ok&&d.authorVersionConfirmed&&d.invalidSessionDenied){ready=true;break}}catch{}
  await new Promise(r=>setTimeout(r,3000));
 }
 if(!ready)throw Error('Preview version routing did not pass readiness checks');
 const login=await fetch(origin+'/auth/login');if(login.status!==200||!(await login.text()).includes('КТ131 · ТЕСТОВА ВЕРСИЯ'))throw Error('Preview login not ready');
 for(const route of ['/kt126/client.js','/kt126/registry'])if((await fetch(origin+route,{redirect:'manual'})).status!==403)throw Error('Unauthenticated preview access not denied');
 if(active(await getDeployment(native))!==nativeStable||active(await getDeployment(author))!==authorStable)throw Error('Public stable version changed');
 const liveLogin=await fetch('https://'+native+'.emilgergov.workers.dev/auth/login');if(liveLogin.status!==200||(await liveLogin.text()).includes('КТ131 · ТЕСТОВА ВЕРСИЯ'))throw Error('Public login changed');
 mkdirSync('kt131-preview-qa',{recursive:true});writeFileSync('kt131-preview-qa/deployment.json',JSON.stringify({origin,authorVersion,nativeVersion,stableNativeVersion:nativeStable,stableAuthorVersion:authorStable,publicTrafficUnchanged:true,privateSessionGuard:true},null,2));
 console.log('KT131_PREVIEW_READY '+origin+'/auth/login');
}catch(error){
 if(nativeOverrideEnabled)await postJSON(path(native)+'/deployments',{strategy:'percentage',versions:[{version_id:nativeStable,percentage:100}]});
 if(authorOverrideEnabled)await postJSON(path(author)+'/deployments',{strategy:'percentage',versions:[{version_id:authorStable,percentage:100}]});
 throw error;
}
