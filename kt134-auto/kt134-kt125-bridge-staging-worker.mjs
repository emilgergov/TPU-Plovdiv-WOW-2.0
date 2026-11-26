/**
 * KT134 isolated test. Native service binding only, no production D1 binding.
 * Preserve prior synthetic preview and storage smoke endpoints untouched.
 */
import existing from './kt134-staging-preview-worker.mjs';
import {createKt134NativeAuthProxy} from './kt134-kt125-native-auth-proxy.mjs';
import {createKt134NativeCaseReader} from './kt134-native-case-http.mjs';
import {createKt134NativeCaseList} from './kt134-native-case-list.mjs';
import {createKt134NativeAutomaticHandler} from './kt134-native-automatic-route.mjs';
import autoUI from './KT134_PROTECTED_INTEGRATION_UI.html';
const nativeOrigin='https://tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev';
const json=(body,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{'content-type':'application/json; charset=utf-8',
 'cache-control':'no-store','x-content-type-options':'nosniff',
 'x-frame-options':'DENY','referrer-policy':'no-referrer'}
});
const entry=`<!doctype html><html lang="bg"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>КТ134 — защитен тестов вход</title>
<style>body{font:15px/1.6 Verdana,Arial,sans-serif;background:#142c23;color:#f4e9c6;margin:0;padding:7vh 5vw}main{max-width:860px;margin:auto;background:#1d3b30;border:1px solid #a58535;border-radius:18px;padding:28px}h1{color:#e6c56e;font-size:23px}label,input,button{display:block;margin:14px 0}input{width:96%;padding:13px;font:inherit;border-radius:7px}button{padding:12px 22px;border:0;border-radius:8px;background:#e6c56e;color:#14251c;font-weight:bold;cursor:pointer}.note{color:#d4c699}a{color:#eed17f}pre{white-space:pre-wrap;word-break:break-word}</style></head><body><main><h1>КТ134 — проверка на защитената преписка</h1><p>Това е техническа проверка на съществуващия достъп КТ125. Окончателният автоматичен анализ и Word проект още не са публикувани на този екран.</p><p><a href="/auth/login">Вход със съществуващия профил КТ125</a> · <a href="/kt134/final-test">Автоматичен тест с петте гейта</a></p><label for="case">Уникален идентификатор на преписката (UUID)</label><input id="case" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" autocomplete="off"><button id="check">Провери разрешения достъп</button><pre id="out" aria-live="polite"></pre><p class="note">Не въвеждайте пароли или документи в това поле. Не се извършва административно одобрение.</p></main><script>
document.getElementById('check').onclick=async()=>{
 const id=document.getElementById('case').value.trim();
 const out=document.getElementById('out');out.textContent='Проверка...';
 try{const r=await fetch('/kt134/case-status?caseId='+encodeURIComponent(id),{credentials:'same-origin',cache:'no-store'});
 const x=await r.json();out.textContent=r.ok?'Потвърдено право за достъп. Преписка: '+x.caseId+'; ревизия: '+x.revision:'Неуспешна проверка: '+(x.error||r.status)}
 catch{out.textContent='Няма връзка с проверката'}}
</script></body></html>`;
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  const path=url.pathname;
  const nativeFetch=env.KT125_NATIVE?.fetch?.bind(env.KT125_NATIVE);
  if(path==='/auth/login'||path==='/auth/logout'){
   if(!nativeFetch)return json({error:'KT125_NATIVE_NOT_CONFIGURED'},503);
   return createKt134NativeAuthProxy({nativeFetch})(request);
  }
  if(path==='/kt134/automatic/draft'){
   if(!nativeFetch)return json({error:'KT125_NATIVE_NOT_CONFIGURED'},503);
   if(!env.KT134_EG_ACCESS_TOKEN)return json({error:'KT134_EG_SECRET_NOT_PAIRED'},503);
   if(!env.KT134_EG_NATIVE?.fetch)return json({error:'KT134_EG_SERVICE_NOT_BOUND'},503);
   const draft=createKt134NativeAutomaticHandler({
    nativeFetch,nativeRpc:env.KT125_NATIVE,
    egWorkerBase:'https://tpu-plovdiv-kt134-eg-test.emilgergov.workers.dev',
    egAccessToken:env.KT134_EG_ACCESS_TOKEN,
    fetchImpl:env.KT134_EG_NATIVE.fetch.bind(env.KT134_EG_NATIVE)
   });
   return draft(request);
  }
  if(path==='/kt134/final-test'){
   if(request.method!=='GET')return json({error:'METHOD_NOT_ALLOWED'},405);
   // The HTML never supplies authentication facts to the server; those are
   // independently verified on every native-KT125 case request.
   return new Response(autoUI,{headers:{'content-type':'text/html; charset=utf-8',
     'cache-control':'no-store, private','x-content-type-options':'nosniff',
     'referrer-policy':'no-referrer','x-frame-options':'DENY',
     'content-security-policy':"default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"}});
  }
  // Only service readiness, no legal passages or case data are exposed.
  if(path==='/kt134/normative-bridge-check'){
   if(request.method!=='GET')return json({error:'METHOD_NOT_ALLOWED'},405);
   if(!env.KT134_EG_NATIVE?.fetch)return json({ready:false,reason:'EG_SERVICE_MISSING'},503);
   try{
    const reply=await env.KT134_EG_NATIVE.fetch(
      new Request('https://tpu-plovdiv-kt134-eg-test.emilgergov.workers.dev/legal-archive-health',{
        method:'GET',headers:{accept:'application/json'},redirect:'manual'}));
    const data=await reply.json().catch(()=>({}));
    const ready=reply.ok&&data.status==='ready'&&
      /^[a-f0-9]{64}$/i.test(data.archiveSHA256||'')&&
      Number.isInteger(data.exactProvisionsReady)&&data.exactProvisionsReady>=7&&
      Number.isInteger(data.requiredProvisionsVerified)&&data.requiredProvisionsVerified>=7;
    return json({ready,transport:'cloudflare_test_worker_service_binding',
      upstreamStatus:reply.status,legalStatus:data.status||'unknown',
      exactProvisionsReady:data.exactProvisionsReady??null,
      requiredProvisionsVerified:data.requiredProvisionsVerified??null,
      archiveVerified:ready,caseDataRead:false},ready?200:503);
   }catch{return json({ready:false,reason:'EG_SERVICE_BINDING_UNREACHABLE'},503)}
  }
  if(path==='/kt134/automatic-health'){
    if(request.method!=='GET')return json({error:'METHOD_NOT_ALLOWED'},405);
    const configured=!!nativeFetch&&!!env.KT134_EG_NATIVE?.fetch&&typeof env.KT134_EG_ACCESS_TOKEN==='string'&&
      env.KT134_EG_ACCESS_TOKEN.length>=32;
    return json({mode:'isolated_native_kt125_case_to_eg_draft',
      ready:configured,protectedRoute:'/kt134/automatic/draft',
      testScreen:'/kt134/final-test',
      nativeKt125Service:!!nativeFetch,egServerSecretConfigured:configured,
      stage1To5RealDossierVerified:false,
      expertFinalApprovalAutomatic:false,
      productionWorkerChanged:false},configured?200:503);
  }
  if(path==='/kt134/entry'){
   if(request.method!=='GET')return json({error:'METHOD_NOT_ALLOWED'},405);
   return new Response(entry,{headers:{'content-type':'text/html; charset=utf-8',
    'cache-control':'no-store','x-content-type-options':'nosniff',
    'referrer-policy':'no-referrer','x-frame-options':'DENY',
    'content-security-policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"}});
  }
  if(path==='/kt134/native-authorization-health'){
   if(request.method!=='GET')return json({error:'METHOD_NOT_ALLOWED'},405);
   if(typeof env.KT125_NATIVE?.getCaseContext!=='function')
     return json({ready:false,reason:'KT125_RPC_METHOD_NOT_AVAILABLE'},503);
   try{
    // Invalid throwaway cookie; native KT125 MUST refuse it. No user case
    // UUID, session, or document is sent to this operational probe.
    const rejected=await env.KT125_NATIVE.getCaseContext({
      cookie:'',
      caseId:'11111111-1111-4111-8111-111111111111',
      action:'case.edit'
    });
    if(rejected!=null)return json({ready:false,reason:'KT125_RPC_REJECTED_INVALID_SESSION_INCORRECTLY'},503);
    return json({ready:true,source:'KT125_NATIVE_RPC',
      actorVerification:'native_case_edit',rejectsInvalidSession:true,
      realCaseDataRead:false,productionWorkerChanged:false});
   }catch(error){
    const kind=typeof error?.name==='string'&&/^[A-Za-z]{2,40}$/.test(error.name)?error.name:'Unknown';
    return json({ready:false,reason:'KT125_RPC_PROBE_UNAVAILABLE',errorKind:kind},503)
   }
  }
  if(path==='/kt134/available-cases'){
   if(request.method!=='GET')return json({error:'METHOD_NOT_ALLOWED'},405);
   if(!nativeFetch)return json({error:'KT125_NATIVE_NOT_CONFIGURED'},503);
   try{
    const list=createKt134NativeCaseList({nativeFetch});
    const result=await list({request});
    return json(result);
   }catch(error){
    const code=error?.code||'KT125_CASE_LIST_FAILED';
    return json({error:code},code==='KT125_LOGIN_REQUIRED'?401:
      code==='KT126_CASE_LIST_UNAVAILABLE'?503:422);
   }
  }
  if(path==='/kt134/case-status'){
   if(request.method!=='GET')return json({error:'METHOD_NOT_ALLOWED'},405);
   if(!nativeFetch)return json({error:'KT125_NATIVE_NOT_CONFIGURED'},503);
   try{
    const read=createKt134NativeCaseReader({nativeFetch});
    const result=await read({request,caseId:url.searchParams.get('caseId')});
    const payload=result.state;
    const record=payload.record||payload.registry||payload.case||{};
    const rev=record.revision??payload.revision??null;
    return json({caseId:result.caseId,revision:rev,
      authenticatedVia:'KT125_NATIVE_CASE_ACL',readOnly:true});
   }catch(err){
    const code=err?.code||'KT125_CASE_READ_FAILED';
    const status=code==='KT125_LOGIN_REQUIRED'?401:
     code==='KT125_CASE_ACCESS_DENIED'?403:
     code==='KT134_CASE_UUID_REQUIRED'?400:
     code==='KT126_CASE_STATE_UNAVAILABLE'?404:422;
    return json({error:code},status);
   }
  }
  if(path==='/kt134/kt125-bridge-check'){
   if(request.method!=='GET')return json({error:'METHOD_NOT_ALLOWED'},405);
   if(!nativeFetch)return json({bridge:'not_configured'},503);
   try{
    const check=new Request(nativeOrigin+'/auth/login',{
      method:'GET',headers:{'accept':'text/html'},redirect:'manual'});
    const response=await nativeFetch(check);
    const pass=response.status>=200&&response.status<400;
    try{await response.body?.cancel()}catch{}
    return json({bridge:pass?'native_kt125_service_reachable':'native_kt125_service_not_ready',
      upstreamStatus:response.status,authenticated:false,
      caseDataRead:false,caseDataWritten:false,realDossierProcessed:false,
      realAutomaticRoute:false,productionWorkerChanged:false,stagingOnly:true},pass?200:503);
   }catch{return json({bridge:'native_kt125_service_unreachable',
    authenticated:false,caseDataRead:false,realAutomaticRoute:false,
    productionWorkerChanged:false,stagingOnly:true},503)}
  }
  return existing.fetch(request,env,ctx);
 }
};
