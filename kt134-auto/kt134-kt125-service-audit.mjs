/**
 * KT134 verify existing isolated test resources and EXACTLY one native
 * server-side KT125 service binding. GET-only, never touches dossiers.
 */
const ACCOUNT='90df5489417e4b53179a852c446aeed1';
const DB='9f977144-c6f1-4fbf-8262-5c48b818bfb1';
export function assessKt134NativeBridgeBindings(bindings=[]){
 const count=(type,name)=>bindings.filter(b=>b.type===type&&b.name===name);
 const d1=count('d1','DB'),r2=count('r2_bucket','BUCKET');
 const services=bindings.filter(b=>b.type==='service');
 const extras=bindings.filter(b=>!['DB','BUCKET','KT125_NATIVE','KT134_EG_NATIVE','KT134_SMOKE_TOKEN','KT134_EG_ACCESS_TOKEN'].includes(b.name));
 const allowed=bindings.every(b=>(
  (b.name==='DB'&&b.type==='d1')||
  (b.name==='BUCKET'&&b.type==='r2_bucket')||
  (b.name==='KT125_NATIVE'&&b.type==='service')||
  (b.name==='KT134_EG_NATIVE'&&b.type==='service')||
  ((b.name==='KT134_SMOKE_TOKEN'||b.name==='KT134_EG_ACCESS_TOKEN')&&b.type==='secret_text')));
 const serviceValid=services.length<=2&&
  services.every(b=>
   (b.name==='KT125_NATIVE'&&b.service==='tpu-plovdiv-kt125-local-auth')||
   (b.name==='KT134_EG_NATIVE'&&b.service==='tpu-plovdiv-kt134-eg-test'))&&
  services.filter(b=>b.name==='KT125_NATIVE').length===1&&
  services.filter(b=>b.name==='KT134_EG_NATIVE').length<=1;
 return Object.freeze({
  eligible:allowed&&extras.length===0&&d1.length===1&&d1[0].id===DB&&
    r2.length===1&&r2[0].bucket_name==='kt134-isolated-r2-2026'&&
    serviceValid&&bindings.filter(b=>b.name==='KT134_SMOKE_TOKEN').length<=1&&
    bindings.filter(b=>b.name==='KT134_EG_ACCESS_TOKEN').length<=1,
  nativeServicePresent:services.some(b=>b.name==='KT125_NATIVE'),
  egServicePresent:services.some(b=>b.name==='KT134_EG_NATIVE'),
  productionDirectDbBound:bindings.some(b=>b.name==='KT125_DB')
 });
}
const cli=process.argv[1]?.endsWith('kt134-kt125-service-audit.mjs');
if(cli){
 if(process.env.GITHUB_REF_NAME!=='kt134-auto-mode-isolated')
  throw Error('KT134_WRONG_BRANCH');
 const token=process.env.CLOUDFLARE_API_TOKEN;
 if(!token)throw Error('KT134_CLOUDFLARE_TOKEN_UNAVAILABLE');
 const url='https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT+
  '/workers/scripts/tpu-plovdiv-kt134-test/settings';
 const response=await fetch(url,{headers:{Authorization:'Bearer '+token}});
 const data=await response.json();
 if(!response.ok||!data.success)throw Error('KT134_TEST_WORKER_SETTINGS_UNAVAILABLE');
 const verdict=assessKt134NativeBridgeBindings(data.result?.bindings||[]);
 console.log('KT134 isolated bindings verified:',verdict.eligible?'PASS':'BLOCK',
  'native service:',verdict.nativeServicePresent?'bound':'to be bound');
 if(!verdict.eligible||verdict.productionDirectDbBound)throw Error('KT134_INCORRECT_STAGING_BINDINGS');
}
