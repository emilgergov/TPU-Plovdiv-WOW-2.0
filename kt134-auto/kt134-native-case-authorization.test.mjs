import test from 'node:test';
import assert from 'node:assert/strict';
import {createKt134NativeCaseAuthorization} from './kt134-native-case-authorization.mjs';
const caseId='11111111-1111-4111-8111-111111111111';
const req=new Request('https://kt134-test.invalid/kt134/automatic/draft',{
 headers:{cookie:'kt125_session=opaque'}
});
test('native RPC proves actor, case ACL, action and current revision',async()=>{
 const auth=createKt134NativeCaseAuthorization({nativeRpc:{
  async getCaseContext({cookie,caseId:id,action}){
   assert.equal(cookie,'kt125_session=opaque');
   assert.equal(id,caseId);assert.equal(action,'case.edit');
   return {verified:true,caseId:id,revision:5,actorId:'KT125-USER-1'};
  }
 }});
 const proof=await auth({request:req,caseId,revision:'5'});
 assert.equal(proof.actorId,'KT125-USER-1');
 assert.equal(proof.source,'KT125_NATIVE_RPC');
 assert.equal(proof.action,'case.edit');
});
test('native RPC denies a session without case edit permission',async()=>{
 const auth=createKt134NativeCaseAuthorization({nativeRpc:{getCaseContext:async()=>null}});
 await assert.rejects(()=>auth({request:req,caseId,revision:'5'}),/KT125_CASE_EDIT_ACCESS_NOT_VERIFIED/);
});
test('stale revision is never authorized',async()=>{
 const auth=createKt134NativeCaseAuthorization({nativeRpc:{getCaseContext:async()=>({
  verified:true,caseId,revision:6,actorId:'KT125-USER-1'
 })}});
 await assert.rejects(()=>auth({request:req,caseId,revision:'5'}),/KT125_CASE_REVISION_CHANGED/);
});
test('client cannot supply an actor without a native RPC method',async()=>{
 assert.throws(()=>createKt134NativeCaseAuthorization({nativeRpc:{}}),/KT125_NATIVE_RPC_NOT_CONFIGURED/);
});
test('RPC verified flag and exact case binding are mandatory',async()=>{
 const auth=createKt134NativeCaseAuthorization({nativeRpc:{getCaseContext:async()=>({
  verified:false,caseId,revision:5,actorId:'KT125-USER-1'
 })}});
 await assert.rejects(()=>auth({request:req,caseId,revision:5}),/KT125_CASE_EDIT_ACCESS_NOT_VERIFIED/);
});
