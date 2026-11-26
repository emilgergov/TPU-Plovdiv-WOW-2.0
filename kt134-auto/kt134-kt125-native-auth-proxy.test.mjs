import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createKt134NativeAuthProxy} from './kt134-kt125-native-auth-proxy.mjs';
const url='https://tpu-plovdiv-kt134-test.emilgergov.workers.dev';
const native='https://tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev';
const publicForm='<html><form method="post" action="/auth/login"><input name="username"><input name="password" type="password"></form></html>';
function get(){return new Request(url+'/auth/login',{method:'GET',
 headers:{cookie:'kt125_session=stale; kt134_test=old'}})}
async function nonceFrom(handle){
 const response=await handle(get());
 assert.equal(response.status,200);
 const html=await response.text();
 const token=html.match(/name="kt134_login_csrf" value="([A-Za-z0-9_-]+)"/)?.[1];
 const cookie=response.headers.get('set-cookie')||'';
 assert.ok(token,'login token injected into actual native form');
 assert.ok(cookie.includes('__Host-kt134_login_csrf='+token),'host-only cookie matches form');
 assert.match(cookie,/SameSite=Strict/);
 assert.match(cookie,/HttpOnly/);
 return {token,cookie:'__Host-kt134_login_csrf='+token,html};
}
function proxy(upstream){
 return createKt134NativeAuthProxy({nativeFetch:async r=>{
  if(r.method==='GET'){
   assert.equal(r.headers.get('cookie'),null,'stale browser cookie not forwarded on GET');
   assert.equal(r.headers.get('origin'),native);
   return new Response(publicForm,{status:200,headers:{'content-type':'text/html'}});
  }
  return upstream(r);
 }});
}
function post({token,cookie,origin=url,site='same-origin'}){
 const form=new URLSearchParams({username:'',password:'',kt134_login_csrf:token||''});
 return new Request(url+'/auth/login',{method:'POST',headers:{
  ...(origin===undefined||origin==='__ABSENT__'?{}:{origin}),
  ...(site?{'sec-fetch-site':site}:{}),
  'content-type':'application/x-www-form-urlencoded',
  ...(cookie?{cookie}: {})
 },body:form.toString()});
}
test('GET returns real KT125 form with one-time host-only CSRF token',async()=>{
 const handle=proxy(()=>{throw Error('POST unexpected')});
 const {html}=await nonceFrom(handle);
 assert.match(html,/action="\/auth\/login"/);
 assert.match(html,/kt134_login_csrf/);
});
test('normal same-origin form POST forwards native KT125 and strips the one-time CSRF field',async()=>{
 let posted=0;
 const handle=proxy(async r=>{
  posted++;
  assert.equal(r.headers.get('origin'),native);
  assert.equal(r.headers.get('referer'),native+'/auth/login');
  assert.equal(r.headers.get('cookie'),null);
  const form=new URLSearchParams(await r.text());
  assert.equal(form.get('username'),'');
  assert.equal(form.get('kt134_login_csrf'),null);
  return new Response('Invalid login',{status:400,headers:{'content-type':'text/html'}});
 });
 const {token,cookie}=await nonceFrom(handle);
 const result=await handle(post({token,cookie}));
 assert.equal(result.status,400);assert.equal(posted,1);
});
for(const origin of ['__ABSENT__','null']){
 test('privacy-hardened browser login POST with Origin '+String(origin)+' is allowed only with one-time token',async()=>{
  let posts=0;
  const handle=proxy(async()=>{
   posts++;return new Response('Native login form rejected empty credentials',{status:400,
    headers:{'content-type':'text/html'}});
  });
  const {token,cookie}=await nonceFrom(handle);
  const result=await handle(post({token,cookie,origin}));
  assert.equal(result.status,400);assert.equal(posts,1);
  assert.doesNotMatch(await result.text(),/ORIGIN_REJECTED/);
 });
}
test('foreign Origin is rejected even if a valid token is supplied',async()=>{
 let posts=0;const handle=proxy(async()=>{posts++;return new Response('NEVER')});
 const {token,cookie}=await nonceFrom(handle);
 const result=await handle(post({token,cookie,origin:'https://attacker.example'}));
 assert.equal(result.status,403);assert.equal(posts,0);
 assert.equal((await result.json()).error,'ORIGIN_REJECTED');
});
test('cross-site fetch metadata blocks CSRF even with token',async()=>{
 let posts=0;const handle=proxy(async()=>{posts++;return new Response('NEVER')});
 const {token,cookie}=await nonceFrom(handle);
 const result=await handle(post({token,cookie,origin:'__ABSENT__',site:'cross-site'}));
 assert.equal(result.status,403);assert.equal(posts,0);
});
test('no one-time form token cannot enter native KT125 password flow',async()=>{
 let posts=0;const handle=proxy(async()=>{posts++;return new Response('NEVER')});
 const result=await handle(post({token:'',cookie:'',origin:'__ABSENT__'}));
 assert.equal(result.status,403);assert.equal((await result.json()).error,'LOGIN_FORM_EXPIRED');
 assert.equal(posts,0);
});
test('open redirect after native login is rejected',async()=>{
 const handle=proxy(async()=>new Response(null,{status:302,
  headers:{location:'https://attacker.example/credentials'}}));
 const {token,cookie}=await nonceFrom(handle);
 const result=await handle(post({token,cookie}));
 assert.equal(result.status,502);
});
test('valid native login redirect and session cookie remain protected',async()=>{
 const handle=proxy(async()=>new Response(null,{status:303,
  headers:{location:'/module',
   'set-cookie':'kt125-session=opaque; Path=/; HttpOnly; Secure; SameSite=Lax'}}));
 const {token,cookie}=await nonceFrom(handle);
 const result=await handle(post({token,cookie}));
 assert.equal(result.status,303);
 assert.equal(result.headers.get('location'),url+'/kt134/final-test');
 assert.match(result.headers.get('set-cookie'),/HttpOnly/);
});
test('unrecognized paths cannot be proxied to native KT125',async()=>{
 const handle=proxy(async()=>{throw Error('should not call')});
 assert.equal(await handle(new Request(url+'/kt126/registry')),null);
});

for(const path of ['/', '/dashboard', '/app', '/cases', '/module', '/kt125/portal']){
 test('trusted native post-login redirect '+path+' resolves to the isolated case entry',async()=>{
  const handle=proxy(async()=>new Response(null,{status:303,headers:{
   location:path,
   'set-cookie':'kt125-session=opaque; Path=/; HttpOnly; Secure; SameSite=Lax'
  }}));
  const {token,cookie}=await nonceFrom(handle);
  const result=await handle(post({token,cookie}));
  assert.equal(result.status,303);
  assert.equal(result.headers.get('location'),url+'/kt134/final-test');
  assert.match(result.headers.get('set-cookie'),/HttpOnly/);
 });
}
test('cross-host native login redirect is always rejected',async()=>{
 const handle=proxy(async()=>new Response(null,{status:303,
  headers:{location:'https://kt133-tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev/app'}}));
 const {token,cookie}=await nonceFrom(handle);
 const result=await handle(post({token,cookie}));
 assert.equal(result.status,502);
 assert.equal((await result.json()).error,'KT125_UNEXPECTED_LOGIN_REDIRECT');
});
