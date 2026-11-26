import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createKt134NativeCaseReader} from './kt134-native-case-http.mjs';
const id='11111111-1111-4111-8111-111111111111';
const request=new Request('https://tpu-plovdiv-kt134-test.emilgergov.workers.dev/kt134/case',{headers:{cookie:'KT125_COOKIE=opaque-token'}});
test('real KT125 native service receives only cookie and fixed case-state GET',async()=>{
 let count=0;
 const read=createKt134NativeCaseReader({nativeFetch:async r=>{
  ++count;
  assert.equal(r.method,'GET');
  assert.equal(new URL(r.url).pathname,'/kt126/registry/'+id);
  assert.equal(r.headers.get('cookie'),'KT125_COOKIE=opaque-token');
  assert.equal(r.headers.get('authorization'),null);
  return new Response(JSON.stringify({record:{case_id:id,revision:4},
    state:{intake:{document_texts:[{source:'doc1',text:'Възражение'}]}}}),{
    headers:{'content-type':'application/json'}});
 }});
 const answer=await read({request,caseId:id});
 assert.equal(count,1);assert.equal(answer.caseId,id);
 assert.equal(answer.state.record.revision,4);
});
test('native KT125 rejection cannot become verified case state',async()=>{
 const read=createKt134NativeCaseReader({nativeFetch:async()=>new Response('Denied',{status:403})});
 await assert.rejects(()=>read({request,caseId:id}),/KT125_CASE_ACCESS_DENIED/);
});
test('invalid case id never reaches service binding',async()=>{
 let calls=0;
 const read=createKt134NativeCaseReader({nativeFetch:async()=>{calls++;return new Response('{}')}});
 await assert.rejects(()=>read({request,caseId:'../../auth/login'}),/KT134_CASE_UUID_REQUIRED/);
 assert.equal(calls,0);
});
test('mismatched records never reach EG',async()=>{
 const read=createKt134NativeCaseReader({nativeFetch:async()=>new Response(JSON.stringify({
   record:{case_id:'22222222-2222-4222-8222-222222222222'}
 }),{headers:{'content-type':'application/json'}})});
 await assert.rejects(()=>read({request,caseId:id}),/KT125_DIFFERENT_CASE/);
});
test('no cookie cannot be substituted by client active flag',async()=>{
 const read=createKt134NativeCaseReader({nativeFetch:async()=>{throw Error('should not run')}});
 await assert.rejects(()=>read({request:new Request(request.url),caseId:id}),/KT125_LOGIN_REQUIRED/);
});

test('native readState uses item.case_id from actual KT126 shape',async()=>{
 const read=createKt134NativeCaseReader({nativeFetch:async r=>{
  assert.equal(new URL(r.url).pathname,'/kt126/registry/'+id);
  return new Response(JSON.stringify({item:{case_id:id,revision:7},state:{intake:{}}}),{
   headers:{'content-type':'application/json'}});
 }});
 const result=await read({request,caseId:id});
 assert.equal(result.state.item.revision,7);
});
