/**
 * KT134 isolated Cloudflare staging bootstrap.
 * Production is READ ONLY. Never print credentials, backend Worker source,
 * database IDs, personal dossiers or response bodies.
 *
 * Modes:
 *   plan   — GET only, always safe on branch push;
 *   create — requires exact explicit confirmation and a separate manual run.
 *
 * D1/R2/Worker creation may affect billing. This script never deletes resources.
 */
import {createHash} from 'node:crypto';
const account=process.env.KT134_CF_ACCOUNT||'';
const token=process.env.KT134_CLOUDFLARE_API_TOKEN||'';
const mode=process.env.KT134_PROVISION_MODE||'plan';
const confirmation=process.env.KT134_CONFIRMATION||'';
const branch=process.env.GITHUB_REF_NAME||'';
const expectedBranch='kt134-auto-mode-isolated';
const gw='kt133-tpu-plovdiv-kt125-local-auth';
const w='kt134-isolated-sandbox-2026';
const dbName='kt134-isolated-d1-2026';
const bucketName='kt134-isolated-r2-2026';
const root='https://api.cloudflare.com/client/v4/';
const abort=message=>{throw Error(message)};
if(branch!==expectedBranch)abort('Refused: not on isolated branch');
if(!/^[a-f0-9]{32}$/i.test(account))abort('Invalid Cloudflare account');
if(!token)abort('Cloudflare secret missing');
if(!['plan','create'].includes(mode))abort('Unsupported mode');
// KT134 staging resources were created and bound on 2026-11-25.
// Retire the creation path permanently: reuse tpu-plovdiv-kt134-test instead.
if(mode==='create')abort('KT134 permanent staging exists: new resource creation disabled');
if(mode==='create'&&confirmation!=='CREATE_KT134_ISOLATED_ONLY')abort('Explicit isolated creation confirmation required');
if([w,dbName,bucketName].some(x=>!x.startsWith('kt134-isolated-')))abort('Invalid staging resource name');
const request=async(path,{method='GET',body,headers={}}={})=>{
 const response=await fetch(root+path,{method,headers:{
  Authorization:'Bearer '+token,Accept:'application/json',...headers
 },body,signal:AbortSignal.timeout(25000)});
 let json=null;
 try{json=await response.json()}catch{}
 return {status:response.status,ok:response.ok&&json?.success===true,result:json?.result};
};
const scoped=(part)=>'accounts/'+account+'/'+part;
const gateway=await request(scoped('workers/scripts/'+gw+'/settings'));
if(!gateway.ok)abort('Cannot validate original protected gateway');
const services=(gateway.result?.bindings||[]).filter(b=>b.type==='service');
if(services.length!==1||!services[0].service)abort('KT125 service identity ambiguous');
const backendName=services[0].service;
const backend=await request(scoped('workers/scripts/'+backendName+'/settings'));
if(!backend.ok)abort('Cannot validate original KT125 backend');
const originalD1=(backend.result?.bindings||[]).filter(b=>b.type==='d1');
if(originalD1.length!==1||!originalD1[0].id)abort('Production D1 identity ambiguous');
const prodD1=originalD1[0].id;
if(w===gw||w===backendName||[w,dbName,bucketName].some(x=>/kt125|kt133|production|prod/i.test(x)))abort('Protected resource name overlap');
const worker=await request(scoped('workers/scripts/'+w+'/settings'));
const databases=await request(scoped('d1/database'));
const r2=await request(scoped('r2/buckets'));
if(!databases.ok||!Array.isArray(databases.result))abort('Cannot enumerate D1 databases safely');
const dbMatch=databases.result.filter(x=>x.name===dbName);
if(dbMatch.some(x=>x.uuid===prodD1))abort('Test D1 points to production');
if(worker.status!==404&&!worker.ok)abort('Cannot establish test Worker identity/status');
if(!r2.ok) {
 console.log('PLAN: existing protected gateway and backend readable; D1 enumeration readable.');
 console.log('BLOCKED: R2 bucket enumeration is not authorized (HTTP '+r2.status+').');
 if(mode==='create')abort('Creation prohibited without R2 read/list permission');
 process.exit(0);
}
const buckets=Array.isArray(r2.result?.buckets)?r2.result.buckets:Array.isArray(r2.result)?r2.result:null;
if(!buckets)abort('R2 listing shape unrecognized; refusing mutation');
const bucketMatch=buckets.filter(x=>x.name===bucketName);
const staged={
 worker:worker.ok,
 d1:dbMatch.length===1,
 r2:bucketMatch.length===1
};
if(dbMatch.length>1||bucketMatch.length>1)abort('Duplicate staged resource identity');
console.log('Existing staging: '+JSON.stringify(staged));
console.log('Prod backend and D1 identity: verified without disclosure.');
if(mode==='plan'){
 console.log('PLAN ONLY: no resources created, no passwords or D1 records touched.');
 console.log('Create mode requires manual workflow dispatch and exact confirmation.');
 process.exit(0);
}
// Prevent tampering with an existing worker/bucket or partial run: nothing
// is overwritten, re-used as "owned", connected, or deleted automatically.
if(Object.values(staged).some(Boolean))abort('At least one staging resource already exists: manual isolation review required');
const stagingPrefix='kt134-isolated-';
const ensureEmpty=()=>{if(dbMatch.length||bucketMatch.length||worker.ok)abort('Not a fresh isolated environment')};
ensureEmpty();
// Fail closed without R2 list permission. Execute deterministic create once.
// Creation is intentionally non-transactional; if any step fails, stop without
// cleanup to avoid deleting resources under shared account ownership.
const newD1=await request(scoped('d1/database'),{method:'POST',
 headers:{'Content-Type':'application/json'},body:JSON.stringify({name:dbName})});
if(!newD1.ok||!newD1.result?.uuid||newD1.result.uuid===prodD1)
 abort('D1 creation failed or returned unsafe identity; stop, do not clean up');
console.log('ISOLATED D1: created (identifier withheld)');
const newR2=await request(scoped('r2/buckets'),{method:'POST',
 headers:{'Content-Type':'application/json'},body:JSON.stringify({name:bucketName})});
if(!newR2.ok)abort('R2 creation failed; isolated D1 may exist, no rollback performed');
console.log('ISOLATED private R2: created (no public domain configured)');
// Minimal inert stub Worker; NO production backend or protected service binding.
// The KT134 auto route will be separately installed only after full testing.
const workerScript='export default {async fetch(){return new Response("KT134 isolated staging - disabled",{status:503,headers:{"cache-control":"no-store"}})}}';
const boundary='----kt134-isolated-'+createHash('sha256').update(w).digest('hex').slice(0,12);
const metadata=JSON.stringify({main_module:'index.mjs'});
const bytes=[
 '--'+boundary+'\r\nContent-Disposition: form-data; name="metadata"\r\nContent-Type: application/json\r\n\r\n'+metadata+'\r\n',
 '--'+boundary+'\r\nContent-Disposition: form-data; name="index.mjs"; filename="index.mjs"\r\nContent-Type: application/javascript+module\r\n\r\n'+workerScript+'\r\n',
 '--'+boundary+'--\r\n'
].join('');
const newWorker=await request(scoped('workers/scripts/'+w),{method:'PUT',
 headers:{'Content-Type':'multipart/form-data; boundary='+boundary},body:bytes});
if(!newWorker.ok)abort('Isolated worker creation failed; isolated D1/R2 may exist; do not touch production');
console.log('ISOLATED worker: created inert (HTTP 503, no routes, no production bindings).');
console.log('Provisioning completed; staging remains disabled until separate expert acceptance.');
