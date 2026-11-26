/**
 * KT134 — isolated staging service-binding connectivity gate.
 * Only fetches the public KT125 login page via Cloudflare service binding.
 * No forwarded Cookie, Authorization, request body, or case contents.
 * Keeps the existing preview and isolated storage smoke routes unchanged.
 */
import existing from './kt134-staging-preview-worker.mjs';
const json=(body,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{'content-type':'application/json; charset=utf-8',
 'cache-control':'no-store','x-content-type-options':'nosniff',
 'x-frame-options':'DENY','referrer-policy':'no-referrer'}
});
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname!=='/kt134/kt125-bridge-check')
   return existing.fetch(request,env,ctx);
  if(request.method!=='GET')return json({error:'METHOD_NOT_ALLOWED'},405);
  if(!env.KT125_NATIVE?.fetch)return json({
    bridge:'not_configured',productionChanged:false,caseDataRead:false
  },503);
  try{
   // Explicitly construct a request with ZERO user credentials.
   // Never expose the upstream response body, cookies or auth headers.
   const check=new Request(
     'https://tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev/auth/login',
     {method:'GET',headers:{'accept':'text/html'},redirect:'manual'});
   const response=await env.KT125_NATIVE.fetch(check);
   const pass=response.status>=200&&response.status<400;
   try{await response.body?.cancel()}catch{}
   return json({
     bridge:pass?'native_kt125_service_reachable':'native_kt125_service_not_ready',
     upstreamStatus:response.status,
     authenticated:false,caseDataRead:false,caseDataWritten:false,
     realDossierProcessed:false,realAutomaticRoute:false,
     productionWorkerChanged:false,stagingOnly:true
   },pass?200:503);
  }catch{
   return json({bridge:'native_kt125_service_unreachable',
    authenticated:false,caseDataRead:false,realAutomaticRoute:false,
    productionWorkerChanged:false,stagingOnly:true},503);
  }
 }
};
