import test from 'node:test';
import assert from 'node:assert/strict';
import {createKt134NativeCaseList} from './kt134-native-case-list.mjs';
const a='11111111-1111-4111-8111-111111111111';
const req=new Request('https://tpu-plovdiv-kt134-test.emilgergov.workers.dev/kt134/available-cases',{
 headers:{cookie:'kt125_session=opaque'}
});
test('native authorized GET /kt126/registry populates list without manual UUID input',async()=>{
 const list=createKt134NativeCaseList({nativeFetch:async r=>{
  assert.equal(new URL(r.url).pathname,'/kt126/registry');
  assert.equal(r.method,'GET');
  assert.equal(r.headers.get('cookie'),'kt125_session=opaque');
  return new Response(JSON.stringify({items:[{
    case_id:a,internal_number:'EG-2026-001',external_number:'ПД-111',revision:4
  }]}),{headers:{'content-type':'application/json'}});
 }});
 const output=await list({request:req});
 assert.equal(output.authenticated,true);
 assert.equal(output.source,'KT125_NATIVE_REGISTRY_CASE_READ_ACL');
 assert.equal(output.items[0].caseId,a);
 assert.equal(output.items[0].internalNumber,'EG-2026-001');
});
test('KT125 redirect to login refuses case list even if HTTP response is successful elsewhere',async()=>{
 const list=createKt134NativeCaseList({nativeFetch:async()=>new Response(null,{
  status:302,headers:{location:'/auth/login'}})});
 await assert.rejects(()=>list({request:req}),/KT125_LOGIN_REQUIRED/);
});
test('missing session cookie cannot enumerate any case',async()=>{
 let calls=0;
 const list=createKt134NativeCaseList({nativeFetch:async()=>{calls++;return new Response('{}')}});
 await assert.rejects(()=>list({request:new Request(req.url)}),/KT125_LOGIN_REQUIRED/);
 assert.equal(calls,0);
});
test('native 403 refuses case list',async()=>{
 const list=createKt134NativeCaseList({nativeFetch:async()=>new Response('Denied',{status:403})});
 await assert.rejects(()=>list({request:req}),/KT125_LOGIN_REQUIRED/);
});
test('native response cannot supply malformed or out-of-scope case IDs',async()=>{
 const list=createKt134NativeCaseList({nativeFetch:async()=>new Response(JSON.stringify({
  items:[{case_id:'../other-case',internal_number:'EG 5'}]
 }),{headers:{'content-type':'application/json'}})});
 await assert.rejects(()=>list({request:req}),/KT126_CASE_LIST_INVALID/);
});
