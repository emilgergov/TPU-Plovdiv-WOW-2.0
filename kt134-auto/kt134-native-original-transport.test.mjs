import test from 'node:test';
import assert from 'node:assert/strict';
import {createKt134NativeOriginalTransport} from './kt134-native-original-transport.mjs';
const ID='7d895a17-e947-4c61-9f31-7e887cef0117';
const BASE='https://tpu-plovdiv-kt134-test.emilgergov.workers.dev';
function req(stage,body,contentType){
 return new Request(BASE+'/kt134/new-case/original/'+ID+'/'+stage,{
  method:'POST',headers:{origin:BASE,cookie:'kt125_session=synthetic',
   ...(contentType?{'content-type':contentType}:{})},
  ...(body===undefined?{}:{body})
 });
}
const receipt=()=>new Response(JSON.stringify({sourceId:'SOURCE-ONE',ok:true}),{
 headers:{'content-type':'application/json'}});
test('metadata sent to the original KT126 storage with same session',async()=>{
 let calls=0;const send=createKt134NativeOriginalTransport({nativeFetch:async r=>{
  calls++;assert.equal(new URL(r.url).pathname,'/kt126/registry/'+ID+'/source/start');
  assert.equal(r.headers.get('cookie'),'kt125_session=synthetic');
  assert.equal((await r.json()).filename,'dossier.zip');return receipt()
 }});
 const metadata={filename:'dossier.zip',size:100,sha256:'a'.repeat(64)};
 const result=await send(req('start',JSON.stringify(metadata),'application/json'));
 assert.equal(calls,1);assert.equal(result.caseId,ID);
 assert.equal(result.storedInKT134,false);
});
test('binary chunks never written to a parallel store',async()=>{
 const bytes=Uint8Array.from([1,2,3,4,5]);let calls=0;
 const send=createKt134NativeOriginalTransport({nativeFetch:async r=>{
  calls++;assert.equal(new URL(r.url).pathname,'/kt126/registry/'+ID+'/source/part/'+ID+'/0');
  assert.deepEqual(new Uint8Array(await r.arrayBuffer()),bytes);return receipt()
 }});
 const result=await send(req('part/'+ID+'/0',bytes,'application/octet-stream'));
 assert.equal(calls,1);assert.equal(result.source,'KT126_NATIVE_ORIGINAL_STORE');
});
test('unauthorized and malformed requests are rejected without native mutation',async()=>{
 let calls=0;const send=createKt134NativeOriginalTransport({nativeFetch:async()=>{calls++;return receipt()}});
 await assert.rejects(send(req('start',JSON.stringify({filename:'file.zip'}),'application/json')),/KT134_ORIGINAL_METADATA_INVALID/);
 await assert.rejects(send(new Request(BASE+'/kt134/new-case/original/'+ID+'/start',{method:'POST',headers:{origin:BASE},body:'{}'})),/KT125_LOGIN_REQUIRED/);
 assert.equal(calls,0);
});
