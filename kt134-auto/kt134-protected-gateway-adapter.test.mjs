import test from 'node:test';
import assert from 'node:assert/strict';
import {createProtectedAutoGateway} from './kt134-protected-gateway-adapter.mjs';
const session={active:true,userId:'expert123'};
const request={caseId:'EG-2026-000015',dossierVersion:'v4',
 mode:'automatic_proposal',requireExpertApproval:true,
 documents:[{fileId:'objection',kind:'objection'}]};
function gateway(overrides={}){
 const track=[];
 const adapter=createProtectedAutoGateway({
  verifySession:async()=>({active:true,userId:'expert123'}),
  invokeAuthorized:async args=>{track.push(args);return {caseId:request.caseId,expertConfirmed:false,
   leadingDocumentId:'objection',procedure:'Отговор по възражение'}},
  ...overrides});
 return {adapter,track};
}
test('server-verified active expert may submit one bounded operation without password prompts',async()=>{
 const {adapter,track}=gateway();
 const result=await adapter.run({session,request});
 assert.equal(result.caseId,request.caseId);
 assert.equal(track.length,1);
 assert.equal(track[0].operation,'kt134.auto-dossier-analyze.v1');
 assert.ok(!JSON.stringify(track[0]).includes('password'));
 assert.ok(!JSON.stringify(track[0]).includes('Bearer'));
});
test('injected client-side active flag does not bypass server auth',async()=>{
 const {adapter,track}=gateway({verifySession:async()=>({active:false,userId:'expert123'})});
 await assert.rejects(adapter.run({session,request}),/сървърно удостоверяване/);
 assert.equal(track.length,0);
});
test('server auth mismatch does not authorize another person',async()=>{
 const {adapter}=gateway({verifySession:async()=>({active:true,userId:'different-person'})});
 await assert.rejects(adapter.run({session,request}),/сървърно удостоверяване/);
});
test('automatic request cannot claim expert-confirmed workflow',async()=>{
 const {adapter}=gateway();
 await assert.rejects(adapter.run({session,request:{...request,requireExpertApproval:false}}),/експерта/);
});
test('server response cannot be bound to another case',async()=>{
 const {adapter}=gateway({invokeAuthorized:async()=>({caseId:'EG-2026-999999'})});
 await assert.rejects(adapter.run({session,request}),/чужда преписка/);
});
test('gateway cannot be initialized without protected session verification',()=>{
 assert.throws(()=>createProtectedAutoGateway({invokeAuthorized:()=>({})}),/сървърен/);
});
test('server response cannot falsely set expert approval',async()=>{
 const {adapter}=gateway({invokeAuthorized:async()=>({caseId:request.caseId,expertConfirmed:true})});
 await assert.rejects(adapter.run({session,request}),/автоматично експертно/);
});
