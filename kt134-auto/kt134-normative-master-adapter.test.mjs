import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createKt134NormativeMasterLoader} from './kt134-normative-master-adapter.mjs';
const sha='8d3851affd72fb44b4d663920196e00ec317c8e45d36fc16c6ad6b0ce965226c';
test('real legal-health contract binds source hash and verified normative refs',async()=>{
 let n=0;
 const get=createKt134NormativeMasterLoader({egWorkerBase:'https://test.invalid',fetchImpl:async(url)=>{
  assert.equal(url,'https://test.invalid/legal-archive-health');++n;
  return {ok:true,json:async()=>({status:'ready',archiveSHA256:sha,exactProvisionsReady:9,requiredProvisionsVerified:7})};
 }});
 const one=await get(),two=await get();
 assert.equal(n,2);assert.equal(one.sha256,sha);
 assert.ok(one.verifiedReferences.length>=4);
 assert.ok(one.verifiedReferences.every(x=>x.applicabilityVerified===false));
 assert.equal(two.sha256,sha);
});
test('missing provision blocks apparent legal approval',async()=>{
 const get=createKt134NormativeMasterLoader({egWorkerBase:'https://test.invalid',fetchImpl:async()=>({
  ok:true,json:async()=>({status:'ready',archiveSHA256:sha,exactProvisionsReady:3,requiredProvisionsVerified:3})
 })});
 await assert.rejects(()=>get(),/KT134_NORMATIVE_MASTER_NOT_READY/);
});
test('invalid archive SHA or unavailable Worker fails closed',async()=>{
 const get=createKt134NormativeMasterLoader({egWorkerBase:'https://test.invalid',fetchImpl:async()=>({
  ok:false,json:async()=>({status:'unavailable'})
 })});
 await assert.rejects(()=>get(),/KT134_NORMATIVE_MASTER_NOT_READY/);
});
