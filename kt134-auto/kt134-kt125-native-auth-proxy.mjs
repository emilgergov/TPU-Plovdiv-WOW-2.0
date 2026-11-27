/**
 * KT134 test-only pass-through of the EXISTING KT125 local login.
 * No additional password database or credential validation.
 * The user's credentials travel over HTTPS directly from the staging form
 * through the same Cloudflare-account service binding to native KT125.
 * No tokens, passwords or responses are logged/cached/stored.
 */
const nativeOrigin='https://tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev';
const LOGIN_CSRF_COOKIE='__Host-kt134_login_csrf';
const LOGIN_CSRF_FIELD='kt134_login_csrf';
function nonce(){
 const bytes=crypto.getRandomValues(new Uint8Array(24));
 let binary='';for(const b of bytes)binary+=String.fromCharCode(b);
 return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function cookieValue(cookie,name){
 const matches=String(cookie||'').split(';').map(x=>x.trim())
  .filter(x=>x.startsWith(name+'='));
 return matches.length===1?matches[0].slice(name.length+1):'';
}
function equalNonce(a,b){
 if(!/^[A-Za-z0-9_-]{32}$/.test(a)||!/^[A-Za-z0-9_-]{32}$/.test(b))return false;
 let delta=0;for(let i=0;i<32;i++)delta|=a.charCodeAt(i)^b.charCodeAt(i);
 return delta===0;
}
function loginFormWithNonce(html,token){
 let injected=false;
 const updated=html.replace(/(<form\b[^>]*\baction=["']\/auth\/login["'][^>]*>)/i,(form)=>{
  injected=true;
  return form+'<input type="hidden" name="'+LOGIN_CSRF_FIELD+'" value="'+token+'">';
 });
 return injected?updated:null;
}
const json=(data,status)=>new Response(JSON.stringify(data),{status,headers:{
 'content-type':'application/json; charset=utf-8','cache-control':'no-store',
 'x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
function cleanCookieScope(cookie) {
 if(!cookie)return '';
 // Only remove an upstream Domain attribute when it specifies our native
 // trusted worker; preserve HttpOnly, Secure, SameSite and Path.
 const pieces=cookie.split(';');
 const attributes=pieces.slice(1).filter(x=>{
  const t=x.trim();
  if(!/^domain=/i.test(t))return true;
  const host=t.slice(7).trim().replace(/^\./,'').toLowerCase();
  if(host!==new URL(nativeOrigin).hostname)throw Error('UNEXPECTED_LOGIN_COOKIE_DOMAIN');
  return false;
 });
 return [pieces[0],...attributes].join(';');
}
function redirectTarget(value,visibleOrigin) {
 if(!value||Array.from(value).some(c=>c.charCodeAt(0)<32))return null;
 const native=new URL(nativeOrigin);
 let next;
 try{next=new URL(value,native)}catch{return null}
 // Never follow external redirects or change the native scheme/host.
 if(next.origin!==native.origin||next.username||next.password)return null;
 const path=next.pathname;
 // Existing KT125 redirects successful login into its own application
 // (e.g. /, /dashboard, /module). KT134 has its own separate, protected
 // test dashboard: route all native application redirects ONLY to the unified dashboard.
 if(['/auth/login','/auth/logout','/auth/forgot','/auth/reset'].some(
  p=>path===p||path.startsWith(p+'/')))
  return visibleOrigin+path+next.search;
 // On successful KT125 authentication return to the unified WOW dashboard.
 return visibleOrigin+'/kt134/profile';
}
export function createKt134NativeAuthProxy({nativeFetch,upstreamOrigin=nativeOrigin}={}){
 if(typeof nativeFetch!=='function'||upstreamOrigin!==nativeOrigin)
  throw Error('KT125_NATIVE_SERVICE_NOT_CONFIGURED');
 return async function handle(request){
  const u=new URL(request.url);
  if(!['/auth/login','/auth/logout'].includes(u.pathname))return null;
  if(!['GET','POST'].includes(request.method))return json({error:'METHOD_NOT_ALLOWED'},405);
  if(u.pathname==='/auth/logout'&&request.method!=='POST')
   return json({error:'METHOD_NOT_ALLOWED'},405);
  const origin=request.headers.get('origin');
  const cookie=request.headers.get('cookie')||'';
  let verifiedPostBody;
  if(request.method==='POST'){
    const type=request.headers.get('content-type')||'';
    if(!type.startsWith('application/x-www-form-urlencoded'))
      return json({error:'FORM_REQUIRED'},415);
    if(Number(request.headers.get('content-length')||0)>16000)
      return json({error:'LOGIN_BODY_TOO_LARGE'},413);
    // A same-origin HTML form may arrive with Origin absent or "null" in
    // privacy-hardened browsers. For this case require the one-time form
    // token and a host-only Secure SameSite cookie. Never accept an explicit
    // foreign Origin or a cross-site Fetch-Metadata request.
    if(origin!==null&&origin!=='null'&&origin!==u.origin)
      return json({error:'ORIGIN_REJECTED'},403);
    if(request.headers.get('sec-fetch-site')==='cross-site')
      return json({error:'ORIGIN_REJECTED'},403);
    const raw=await request.text();
    if(raw.length>16000)return json({error:'LOGIN_BODY_TOO_LARGE'},413);
    const form=new URLSearchParams(raw);
    const submitted=form.get(LOGIN_CSRF_FIELD)||'';
    const stored=cookieValue(cookie,LOGIN_CSRF_COOKIE);
    if(!equalNonce(submitted,stored))
      return json({error:'LOGIN_FORM_EXPIRED',detail:'REOPEN_LOGIN_FORM'},403);
    form.delete(LOGIN_CSRF_FIELD);
    verifiedPostBody=form.toString();
  }
  const headers=new Headers();
  headers.set('Accept','text/html');
  // The native KT125 origin guard also checks forwarded GET requests.
  // A browser navigation GET normally has no Origin header, but a
  // service-bound request must represent the native KT125 origin.
  headers.set('Origin',nativeOrigin);
  headers.set('Referer',nativeOrigin+'/auth/login');
  if(request.method==='POST'){
   headers.set('Content-Type','application/x-www-form-urlencoded');
   headers.set('Origin',nativeOrigin);
  }
  // GET /auth/login is a public login form: do NOT forward stale KT134
  // browser cookies to the separate native KT125 origin. Only POST and
  // logout are permitted to carry a user's existing native cookie.
  if(cookie&&cookie.length<8000&&request.method!=='GET'){
    const filtered=cookie.split(';').map(x=>x.trim())
      .filter(x=>x&&!x.startsWith(LOGIN_CSRF_COOKIE+'=')).join('; ');
    if(filtered)headers.set('Cookie',filtered);
  }
  const body=request.method==='POST'?verifiedPostBody:undefined;
  const target=nativeOrigin+u.pathname;
  let response;
  try{
   response=await nativeFetch(new Request(target,{
    method:request.method,headers,body,redirect:'manual'
   }));
  }catch{return json({error:'KT125_LOGIN_SERVICE_UNAVAILABLE'},503)}
  const outgoing=new Headers();
  const pass=['content-type','cache-control','set-cookie','location'];
  for(const key of pass){
   const val=response.headers.get(key);
   if(!val)continue;
   if(key==='set-cookie') {
    try{outgoing.set(key,cleanCookieScope(val))}
    catch{return json({error:'KT125_LOGIN_COOKIE_REJECTED'},502)}
   }else if(key==='location'){
    const safe=redirectTarget(val,u.origin);
    if(!safe)return json({error:'KT125_UNEXPECTED_LOGIN_REDIRECT'},502);
    outgoing.set('Location',safe);
   }else outgoing.set(key,val);
  }
  if(request.method==='GET'&&u.pathname==='/auth/login'&&response.ok){
    const type=response.headers.get('content-type')||'';
    if(!/text\/html/i.test(type))return json({error:'KT125_LOGIN_FORM_INVALID'},502);
    const html=await response.text();
    const token=nonce();
    const safeHtml=loginFormWithNonce(html,token);
    if(!safeHtml)return json({error:'KT125_LOGIN_FORM_INVALID'},502);
    outgoing.append('Set-Cookie',LOGIN_CSRF_COOKIE+'='+token+
      '; Path=/; Max-Age=600; Secure; HttpOnly; SameSite=Strict');
    outgoing.set('Referrer-Policy','same-origin');
    outgoing.set('Cache-Control','no-store, private');
    const themedHtml=safeHtml.replace(/<\/head>/i,"<style id=\"wow-approved-login\">\nbody{min-height:100vh;background:radial-gradient(ellipse at 15% 68%,#23594499,transparent 55%),radial-gradient(ellipse at 88% 12%,#8e783b38,transparent 48%),linear-gradient(145deg,#153a2e,#071e17 62%,#102920)!important;color:#fff2d7!important}\nbody::before{content:\"\";position:fixed;inset:12vh 0 0;pointer-events:none;opacity:.2;background:repeating-radial-gradient(ellipse at -12% 34%,transparent 0 24px,#dabc71 25px 26px,transparent 27px 49px) left top/18vw 33vh no-repeat,repeating-radial-gradient(ellipse at 112% 66%,transparent 0 24px,#dabc71 25px 26px,transparent 27px 49px) right bottom/18vw 33vh no-repeat}\nmain{width:min(92%,530px)!important;margin:clamp(24px,8vh,84px) auto!important;position:relative}\nmain h1{font:clamp(29px,5vw,44px)/1.1 Georgia,serif!important;color:#f6d698!important}\nform[action=\"/auth/login\"]{max-width:none}\nform[action=\"/auth/login\"] fieldset{display:block!important;min-width:0}\nform[action=\"/auth/login\"] fieldset>div{display:block!important}\nform[action=\"/auth/login\"] input:not([type=hidden]){display:block;width:100%;box-sizing:border-box;border:1px solid #8a8060;border-radius:10px;background:#09251d!important;color:#fff2d7!important}\nform[action=\"/auth/login\"] button{width:100%;border-radius:12px;background:linear-gradient(#ffe9b2,#d7a33e)!important;color:#102b22!important}\nform[action=\"/auth/login\"] :focus-visible{outline:2px solid #ffe5a1;outline-offset:3px}\n</style></head>");
    return new Response(themedHtml,{status:response.status,headers:outgoing});
  }
  if(request.method==='POST'){
    outgoing.append('Set-Cookie',LOGIN_CSRF_COOKIE+
      '=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict');
  }
  outgoing.set('Cache-Control','no-store, private');
  outgoing.set('X-Content-Type-Options','nosniff');
  outgoing.set('Referrer-Policy','no-referrer');
  outgoing.set('X-Frame-Options','DENY');
  // No native service credentials are ever returned unless the backend itself
  // supplies its normal HttpOnly session cookie.
  return new Response(response.body,{status:response.status,headers:outgoing});
 };
}
