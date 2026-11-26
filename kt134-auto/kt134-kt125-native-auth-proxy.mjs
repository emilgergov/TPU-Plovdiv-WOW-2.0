/**
 * KT134 test-only pass-through of the EXISTING KT125 local login.
 * No additional password database or credential validation.
 * The user's credentials travel over HTTPS directly from the staging form
 * through the same Cloudflare-account service binding to native KT125.
 * No tokens, passwords or responses are logged/cached/stored.
 */
const nativeOrigin='https://tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev';
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
  if(request.method==='POST'&&origin!==u.origin)return json({error:'ORIGIN_REJECTED'},403);
  if(request.method==='POST'){
    const type=request.headers.get('content-type')||'';
    if(!type.startsWith('application/x-www-form-urlencoded'))
      return json({error:'FORM_REQUIRED'},415);
    if(Number(request.headers.get('content-length')||0)>16000)
      return json({error:'LOGIN_BODY_TOO_LARGE'},413);
  }
  const headers=new Headers();
  headers.set('Accept','text/html');
  if(request.method==='POST'){
   headers.set('Content-Type','application/x-www-form-urlencoded');
   headers.set('Origin',nativeOrigin);
  }
  const cookie=request.headers.get('cookie');
  if(cookie&&cookie.length<8000)headers.set('Cookie',cookie);
  const body=request.method==='POST'?await request.arrayBuffer():undefined;
  if(body&&body.byteLength>16000)return json({error:'LOGIN_BODY_TOO_LARGE'},413);
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
  outgoing.set('Cache-Control','no-store, private');
  outgoing.set('X-Content-Type-Options','nosniff');
  outgoing.set('Referrer-Policy','no-referrer');
  outgoing.set('X-Frame-Options','DENY');
  // No native service credentials are ever returned unless the backend itself
  // supplies its normal HttpOnly session cookie.
  return new Response(response.body,{status:response.status,headers:outgoing});
 };
}
