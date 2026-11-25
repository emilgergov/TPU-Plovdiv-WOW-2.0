/**
 * KT134 long-lived staging verification against the ALREADY created Cloudflare
 * resources. GET only, no provisioning, no source retrieval, no D1 SQL/R2 reads.
 * Redacted verdicts, never token values or full API response bodies.
 */
const D1_ID='9f977144-c6f1-4fbf-8262-5c48b818bfb1';
const TEST_WORKER='tpu-plovdiv-kt134-test';
const TEST_BUCKET='kt134-isolated-r2-2026';
const GATEWAY='kt133-tpu-plovdiv-kt125-local-auth';
const allowed=new Set(['d1','r2_bucket']);
const asArray=x=>Array.isArray(x)?x:[];
export function assessExistingKT134Staging({testWorker,gateway,backend,d1Record}={}){
 const bindings=asArray(testWorker?.bindings);
 const services=asArray(gateway?.bindings).filter(b=>b.type==='service');
 const production=asArray(backend?.bindings).filter(b=>b.type==='d1');
 const d1=bindings.filter(b=>b.type==='d1'&&b.name==='DB');
 const r2=bindings.filter(b=>b.type==='r2_bucket'&&b.name==='BUCKET');
 const prodDb=production[0]?.id;
 const findings={
  exactBindings:bindings.length===2&&bindings.every(b=>allowed.has(b.type)),
  stagingD1:d1.length===1&&d1[0].id===D1_ID&&d1Record?.uuid===D1_ID&&d1Record?.name==='kt134-isolated-d1-2026',
  stagingR2:r2.length===1&&r2[0].bucket_name===TEST_BUCKET,
  productionSeparated:services.length===1&&services[0].service!==TEST_WORKER&&
    prodDb&&prodDb!==D1_ID,
  noProductionServiceBinding:bindings.every(b=>b.type!=='service'),
  noBrowserSecrets:bindings.every(b=>!['secret_text','secret_key','plain_text','vars','kv_namespace'].includes(b.type))
 };
 return Object.freeze({ready:Object.values(findings).every(Boolean),checks:Object.freeze(findings),
  requiresLiveFunctionalGate:true,mayModifyProduction:false});
}
const direct=process.argv[1]?.endsWith('/kt134-existing-staging-audit.mjs')||
 process.argv[1]==='kt134-auto/kt134-existing-staging-audit.mjs';
if(direct){
 const account=process.env.KT134_CF_ACCOUNT;
 const token=process.env.CLOUDFLARE_API_TOKEN;
 if(process.env.GITHUB_REF_NAME!=='kt134-auto-mode-isolated')throw Error('Not isolated branch');
 if(!/^[0-9a-f]{32}$/i.test(account||'')||!token)throw Error('Missing GET-only verification credentials');
 async function get(path){
  const res=await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+'/'+path,{
   headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(25000)});
  let obj;try{obj=await res.json()}catch{}
  if(!res.ok||!obj?.success||!obj.result)throw Error('GET-only staging verification unavailable: '+path.split('/')[0]+' (HTTP '+res.status+')');
  return obj.result;
 }
 const [testWorker,gateway,d1Record]=await Promise.all([
  get('workers/scripts/'+TEST_WORKER+'/settings'),
  get('workers/scripts/'+GATEWAY+'/settings'),
  get('d1/database/'+D1_ID)
 ]);
 const services=asArray(gateway.bindings).filter(b=>b.type==='service');
 if(services.length!==1||!/^[-\w]+$/.test(services[0].service))throw Error('Unverified production backend identity');
 const backend=await get('workers/scripts/'+services[0].service+'/settings');
 const outcome=assessExistingKT134Staging({testWorker,gateway,backend,d1Record});
 for(const [key,ok] of Object.entries(outcome.checks))console.log('KT134 staging '+key+': '+(ok?'PASS':'BLOCK'));
 console.log('KT134 staging verdict: '+(outcome.ready?'RESOURCES_BOUND_ISOLATED':'NOT_VERIFIED'));
 console.log('No write operations. Verified bindings are necessary but not sufficient for app readiness.');
 if(!outcome.ready)process.exitCode=1;
}
