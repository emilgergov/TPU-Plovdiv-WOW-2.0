/**
 * KT134 isolated test. Native service binding only, no production D1 binding.
 * Preserve prior synthetic preview and storage smoke endpoints untouched.
 */
import existing from './kt134-staging-preview-worker.mjs';
import {createKt134NativeAuthProxy} from './kt134-kt125-native-auth-proxy.mjs';
import {createKt134NativeCaseReader} from './kt134-native-case-http.mjs';
import {createKt134NativeCaseList} from './kt134-native-case-list.mjs';
import {createKt134NativeAutomaticHandler} from './kt134-native-automatic-route.mjs';
import {createKt134NativeCaseRegistration} from './kt134-native-new-case-registration.mjs';
import {createKt134NativeOriginalTransport} from './kt134-native-original-transport.mjs';
import autoUI from './KT134_PROTECTED_INTEGRATION_UI.html';
import dashboardUI from './KT134_EMBEDDED_DASHBOARD.html';
import approvedE1Reader from './kt134-e1-approved-reader-text.mjs';
import {createKt134NativeStage1Completion} from './kt134-native-stage1-completion.mjs';
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
  // New dossier uses the SAME native KT126 sequence and original-file store
  // as classic E1. No parallel registry, no new identity architecture.
  if(path==='/kt134/new-case/register'){
   if(!nativeFetch)return json({error:'KT125_NATIVE_NOT_CONFIGURED'},503);
   try{
    const register=createKt134NativeCaseRegistration({nativeFetch});
    const result=await register({request,intakeValidated:true});
    return json(result,201);
   }catch(error){
    const code=/^[A-Z0-9_]{5,90}$/.test(error?.code||'')?
      error.code:'KT134_NATIVE_REGISTRATION_UNAVAILABLE';
    return json({error:code},code==='KT125_LOGIN_REQUIRED'?401:
     code==='KT125_CASE_CREATE_FORBIDDEN'?403:422);
   }
  }
  if(path.startsWith('/kt134/new-case/original/')){
   if(!nativeFetch)return json({error:'KT125_NATIVE_NOT_CONFIGURED'},503);
   try{
    const transfer=createKt134NativeOriginalTransport({nativeFetch});
    return json(await transfer(request));
   }catch(error){
    const code=/^[A-Z0-9_]{5,90}$/.test(error?.code||'')?
      error.code:'KT134_NATIVE_ORIGINAL_WRITE_UNAVAILABLE';
    return json({error:code},code==='KT125_LOGIN_REQUIRED'?401:
      code==='KT125_CASE_ACCESS_DENIED'?403:422);
   }
  }
  if(path==='/kt134/e1/approved-reader.js'){
   if(request.method!=='GET')return json({error:'METHOD_NOT_ALLOWED'},405);
   return new Response(approvedE1Reader,{headers:{
    'content-type':'text/javascript; charset=utf-8',
    'cache-control':'private, max-age=1800','x-content-type-options':'nosniff'}});
  }
  if(path==='/kt134/new-case/complete-stage1'){
   if(request.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
   if(!nativeFetch||!env.KT134_EG_NATIVE?.fetch||!env.KT134_EG_ACCESS_TOKEN)
    return json({error:'KT134_E1_SERVICES_UNAVAILABLE'},503);
   try{
    const handler=createKt134NativeStage1Completion({
      nativeFetch,egFetch:env.KT134_EG_NATIVE.fetch.bind(env.KT134_EG_NATIVE),
      egAccessToken:env.KT134_EG_ACCESS_TOKEN});
    const result=await handler({request});
    return json(result);
   }catch(error){
    const code=/^[A-Z0-9_]{5,90}$/.test(error?.code||'')?
      error.code:'KT134_E1_UNAVAILABLE';
    return json({error:code},code==='KT125_LOGIN_REQUIRED'?401:
      code==='KT125_CASE_ACCESS_DENIED'||code==='KT125_CASE_WRITE_DENIED'?403:
      code==='KT126_STAGE1_REVISION_CONFLICT'?409:422);
   }
  }
  if(path==='/kt134/automatic/draft'||path==='/kt134/automatic/draft-events'){
   if(!nativeFetch)return json({error:'KT125_NATIVE_NOT_CONFIGURED'},503);
   if(!env.KT134_EG_ACCESS_TOKEN)return json({error:'KT134_EG_SECRET_NOT_PAIRED'},503);
   if(!env.KT134_EG_NATIVE?.fetch)return json({error:'KT134_EG_SERVICE_NOT_BOUND'},503);
   const draft=createKt134NativeAutomaticHandler({
    nativeFetch,nativeRpc:env.KT125_IDENTITY_RPC,
    egWorkerBase:'https://tpu-plovdiv-kt134-eg-test.emilgergov.workers.dev',
    egAccessToken:env.KT134_EG_ACCESS_TOKEN,
    fetchImpl:env.KT134_EG_NATIVE.fetch.bind(env.KT134_EG_NATIVE)
   });
   return draft(request);
  }
  if(path==='/kt134/profile'&&request.method==='GET'){
   const cookie=request.headers.get('cookie')||'';
   if(!cookie||cookie.length>8000)return Response.redirect(new URL('/auth/login',request.url),303);
   if(!nativeFetch)return json({error:'KT125_NATIVE_NOT_CONFIGURED'},503);
   let profile;
   try{
    profile=await nativeFetch(new Request(nativeOrigin+'/member',{
     headers:{Accept:'text/html',Cookie:cookie},redirect:'manual'
    }));
   }catch{return json({error:'KT125_PROFILE_UNAVAILABLE'},503);}
   if([301,302,303,307,308,401,403].includes(profile.status))
    return Response.redirect(new URL('/auth/login',request.url),303);
   if(!profile.ok||!(profile.headers.get('content-type')||'').includes('text/html'))
    return json({error:'KT125_PROFILE_UNAVAILABLE'},502);
   const headers=new Headers(profile.headers);
   headers.set('Cache-Control','private, no-store');
   headers.set('X-Frame-Options','DENY');
   const response=new Response(profile.body,{status:profile.status,headers});
   return new HTMLRewriter()
    .on('a[href="/module/"]',{element(el){el.setAttribute('href','/kt134/dashboard');}})
    .on('a[href="/member"]',{element(el){el.setAttribute('href','/kt134/profile');}})
    .on('head',{element(el){el.append('<style>body{background:radial-gradient(ellipse at 15% 70%,#235944,transparent 55%),#0a251b!important}main{width:min(92%,580px)!important;margin-inline:auto!important}h1{font-family:Georgia,serif!important;color:#f6d698!important}a[href="/kt134/dashboard"]{background:linear-gradient(#ffe9b2,#d7a33e)!important;color:#102b22!important;border-radius:12px}</style>',{html:true});}})
    .transform(response);
  }
  if(path==='/kt134/dashboard'){
   if(request.method!=='GET')return json({error:'METHOD_NOT_ALLOWED'},405);
   return new Response(dashboardUI,{headers:{
     'content-type':'text/html; charset=utf-8',
     'cache-control':'no-store, private','x-content-type-options':'nosniff',
     'referrer-policy':'no-referrer',
     'content-security-policy':"default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data: https://emilgergov.github.io; connect-src 'self'; frame-src 'self'; base-uri 'none'; frame-ancestors 'none'"
   }});
  }
  if(path==='/kt134/final-test'){
   if(request.method!=='GET')return json({error:'METHOD_NOT_ALLOWED'},405);
   // The HTML never supplies authentication facts to the server; those are
   // independently verified on every native-KT125 case request.
   return new Response(autoUI,{headers:{'content-type':'text/html; charset=utf-8',
     'cache-control':'no-store, private','x-content-type-options':'nosniff',
     'referrer-policy':'no-referrer','x-frame-options':'SAMEORIGIN',
     'content-security-policy':"default-src 'self'; script-src 'unsafe-inline' 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'unsafe-inline'; connect-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; worker-src 'self' blob: https://cdnjs.cloudflare.com; img-src 'self' data: blob: https://emilgergov.github.io; form-action 'self'; base-uri 'none'; frame-ancestors 'self'"}});
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
   if(typeof env.KT125_IDENTITY_RPC?.getCaseContext!=='function')
     return json({ready:false,reason:'KT125_RPC_METHOD_NOT_AVAILABLE'},503);
   try{
    // Invalid throwaway cookie; native KT125 MUST refuse it. No user case
    // UUID, session, or document is sent to this operational probe.
    const rejected=await env.KT125_IDENTITY_RPC.getCaseContext({
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
    const hint=String(error?.message||'').replace(/[^A-Za-z0-9 .:()_\\/-]/g,'').slice(0,130);
    return json({ready:false,reason:'KT125_RPC_PROBE_UNAVAILABLE',
      errorKind:kind,errorHint:hint},503)
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
