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
 if(!value)return null;
 const native=new URL(nativeOrigin);
 let next;
 try{next=new URL(value,native)}catch{return null}
 if(next.origin!==native.origin)return null;
 if(/^\/(?:module(?:\/|$)|user$)/.test(next.pathname))
  return visibleOrigin+'/kt134/entry';
 if(/^\/(?:auth\/(?:login|logout|forgot|reset)|kt125\/local-auth)/.test(next.pathname))
  return visibleOrigin+next.pathname+next.search;
 return null;
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
    return new Response(safeHtml,{status:response.status,headers:outgoing});
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
