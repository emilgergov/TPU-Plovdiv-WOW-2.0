import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createKt134NativeAuthProxy} from './kt134-kt125-native-auth-proxy.mjs';
const url='https://tpu-plovdiv-kt134-test.emilgergov.workers.dev';
const req=(path,method='GET',body='')=>new Request(url+path,{method,
 headers:{...(method==='POST'?{'origin':url,'content-type':'application/x-www-form-urlencoded'}:{})},
 ...(method==='POST'?{body}:{})});
test('native KT125 login is same-origin, HttpOnly, no alternate password store',async()=>{
 let count=0;
 const handle=createKt134NativeAuthProxy({nativeFetch:async request=>{
  count++;assert.equal(new URL(request.url).pathname,'/auth/login');
  assert.equal(request.method,'POST');
  return new Response(null,{status:303,headers:{
   'set-cookie':'kt125-session=opaque; Path=/; HttpOnly; Secure; SameSite=Lax',
   'location':'/module'
  }});
 }});
 const r=await handle(req('/auth/login','POST','username=test&password=test'));
 assert.equal(r.status,303);assert.equal(count,1);
 assert.equal(r.headers.get('location'),url+'/kt134/entry');
 assert.match(r.headers.get('set-cookie'),/HttpOnly/);
});
test('cross-origin submission never reaches native login',async()=>{
 let count=0;
 const handle=createKt134NativeAuthProxy({nativeFetch:async()=>{count++;return new Response('')}})
 const r=await handle(new Request(url+'/auth/login',{method:'POST',
  headers:{'origin':'https://evil.example','content-type':'application/x-www-form-urlencoded'},
  body:'username=u&password=p'}));
 assert.equal(r.status,403);assert.equal(count,0);
});
test('arbitrary upstream redirects cannot escape staged login',async()=>{
 const handle=createKt134NativeAuthProxy({nativeFetch:async()=>new Response(null,{
  status:302,headers:{location:'https://attacker.example/credentials'}
 })});
 const r=await handle(req('/auth/login'));assert.equal(r.status,502);
});
test('unrecognized auth paths cannot act as open proxy',async()=>{
 const handle=createKt134NativeAuthProxy({nativeFetch:async()=>{throw Error('should not call')}});
 assert.equal(await handle(req('/kt126/registry')),null);
});

test('browser GET without Origin is forwarded with the native trusted KT125 Origin',async()=>{
 const handle=createKt134NativeAuthProxy({nativeFetch:async upstream=>{
  assert.equal(upstream.method,'GET');
  assert.equal(upstream.headers.get('origin'),'https://tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev');
  assert.equal(upstream.headers.get('referer'),'https://tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev/auth/login');
  return new Response('<form method="post"></form>',{status:200,
   headers:{'content-type':'text/html'}});
 }});
 const r=await handle(req('/auth/login'));
 assert.equal(r.status,200);
 assert.match(await r.text(),/<form/);
});
