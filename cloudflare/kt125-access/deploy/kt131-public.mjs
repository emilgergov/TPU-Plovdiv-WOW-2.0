import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const base='https://api.cloudflare.com/client/v4/accounts/90df5489417e4b53179a852c446aeed1';
const native='tpu-plovdiv-kt125-local-auth',author='tpu-plovdiv-ai-author-v27',origin='https://'+native+'.emilgergov.workers.dev',release='V27.36-KT131';
async function api(path,options={}){const r=await fetch(base+path,{...options,headers:{Authorization:'Bearer '+process.env.CF_TOKEN,...options.headers}});const d=await r.json();if(!r.ok||!d.success)throw Error('Cloudflare HTTP '+r.status+' codes '+JSON.stringify(d.errors?.map(e=>e.code)));return d.result;}
const path=n=>'/workers/scripts/'+n;
const deployment=async n=>(await api(path(n)+'/deployments')).deployments[0];
const active=d=>{const a=d.versions.filter(v=>v.percentage>0);if(a.length!==1||a[0].percentage!==100)throw Error('Unexpected production traffic split');return a[0].version_id;};
const before={};for(const n of [native,author])before[n]={deployment:await deployment(n),settings:await api(path(n)+'/settings')};
for(const [n,secret] of [[native,'KT125_AUTH_SECRET'],[author,'OPENAI_API_KEY']])if(!before[n].settings.bindings.some(b=>b.name===secret&&b.type==='secret_text'))throw Error('Required secret binding absent');
const healthBefore=await fetch('https://'+author+'.emilgergov.workers.dev/health').then(r=>r.json());if(!healthBefore.apiKeyConfigured||!healthBefore.aiGenerationEnabled)throw Error('Author not ready before publication');
async function upload(n,file){const s=before[n].settings;const excluded=new Set(n===native?['KT125_LOCAL_ORIGIN','KT131_AUTHOR_VERSION']:[]);const bindings=s.bindings.filter(b=>!excluded.has(b.name)).map(b=>({name:b.name,type:'inherit'}));if(n===native)bindings.push({name:'KT125_LOCAL_ORIGIN',type:'plain_text',text:origin});
 const metadata={main_module:'worker.mjs',compatibility_date:s.compatibility_date,compatibility_flags:s.compatibility_flags||[],bindings,annotations:{'workers/message':'User accepted KT131 public release','workers/commit_sha':process.env.GITHUB_SHA||''}};
 const form=new FormData();form.set('metadata',new Blob([JSON.stringify(metadata)],{type:'application/json'}));form.set('worker.mjs',new Blob([readFileSync(file)],{type:'application/javascript+module'}),'worker.mjs');const v=await api(path(n)+'/versions?bindings_inherit=strict',{method:'POST',body:form});if(!/^[0-9a-f-]{36}$/.test(v.id||''))throw Error('Missing release version');return v.id;}
const versions={};versions[author]=await upload(author,'dist/kt131-public-author.mjs');versions[native]=await upload(native,'dist/kt131-public-native.mjs');
const publish=(n,entries)=>api(path(n)+'/deployments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({strategy:'percentage',versions:entries})});
const changed=[];
try{
 for(const n of [author,native]){if(active(await deployment(n))!==active(before[n].deployment))throw Error('Production changed concurrently');await publish(n,[{version_id:versions[n],percentage:100},...before[n].deployment.versions.filter(v=>v.version_id!==versions[n]).map(v=>({version_id:v.version_id,percentage:0}))]);changed.push(n);}
 let ready=false;
 for(let i=0;i<16;i++){const r=await fetch(origin+'/auth/login',{signal:AbortSignal.timeout(15000)});if(r.status===200&&r.headers.get('X-WOW-Release')===release){ready=true;break;}await new Promise(r=>setTimeout(r,2000));}if(!ready)throw Error('Public release did not become ready');
 for(const route of ['/auth/login','/auth/register','/auth/admin','/auth/forgot']){const r=await fetch(origin+route);const text=await r.text();if(r.status!==200||r.headers.get('X-WOW-Release')!==release||!text.includes('data-layout="local100"')||text.includes('КТ131 · ТЕСТОВА ВЕРСИЯ'))throw Error('Public login verification failed');}
 for(const route of ['/kt126/client.js','/kt126/registry'])if((await fetch(origin+route,{redirect:'manual'})).status!==403)throw Error('Private surface guard failed');
 const hr=await fetch('https://'+author+'.emilgergov.workers.dev/health'),healthAfter=await hr.json();if(hr.headers.get('X-WOW-Release')!==release)throw Error('Author release marker mismatch');for(const k of ['service','status','stage4Contract','stage5Contract','apiKeyConfigured','aiGenerationEnabled'])if(healthBefore[k]!==healthAfter[k])throw Error('Author contract changed');
 for(const route of ['/subject-improve','/stage4-proposal','/stage5-document']){const r=await fetch('https://'+author+'.emilgergov.workers.dev'+route,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-KT126-Case':'11111111-1111-4111-8111-111111111111','X-KT126-Session':'invalid'},body:'{"caseId":"11111111-1111-4111-8111-111111111111"}'});if(r.status!==403||r.headers.get('X-WOW-Release')!==release)throw Error('Author private guard failed');}
 for(const n of [native,author])if(active(await deployment(n))!==versions[n])throw Error('Release traffic mismatch');
 mkdirSync('kt131-public-qa',{recursive:true});writeFileSync('kt131-public-qa/deployment.json',JSON.stringify({release,origin,versions,previous:Object.fromEntries(Object.entries(before).map(([n,b])=>[n,b.deployment.versions])),commit:process.env.GITHUB_SHA,noDatabaseMigration:true,noPaidCalls:true},null,2));
 console.log('KT131_PUBLIC_READY '+origin+'/auth/login');
}catch(error){for(const n of changed.reverse())await publish(n,before[n].deployment.versions.map(v=>({version_id:v.version_id,percentage:v.percentage})));console.log('Previous production versions restored after verification failure');throw error;}
