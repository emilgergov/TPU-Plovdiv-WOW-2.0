import test from 'node:test';
import assert from 'node:assert/strict';
import {createKT134TestAtomicApproval,TEST_ATOMIC_APPROVAL_SQL} from './kt134-test-atomic-approval.mjs';
const caseId='11111111-1111-4111-8111-111111111111';
const params={caseId,proposalVersion:'v1',caseRevision:4,bindingSha256:'a'.repeat(64),userId:'expert123'};
function fixture(changes=1){
 let captured=null;
 const db={prepare(sql){return {bind(...args){captured={sql,args};return {run:async()=>({meta:{changes}})}}}}};
 return {approval:createKT134TestAtomicApproval({db,now:()=>1234567890}),read:()=>captured};
}
test('one SQL update includes current revision, exact document and active case rights',async()=>{
 const f=fixture(),r=await f.approval.approve(params);
 assert.equal(r.expertConfirmed,true);
 assert.deepEqual(f.read().args,[1234567890,caseId,'v1',4,'a'.repeat(64),4,'expert123']);
 assert.match(TEST_ATOMIC_APPROVAL_SQL,/r\.revision=\?/);
 assert.match(TEST_ATOMIC_APPROVAL_SQL,/a\.active=1 AND a\.can_confirm=1/);
 assert.match(TEST_ATOMIC_APPROVAL_SQL,/status='awaiting_expert'/);
});
test('zero affected rows never announces approval',async()=>{
 const f=fixture(0);
 await assert.rejects(f.approval.approve(params),/Отказ/);
});
test('invalid binding cannot reach D1',async()=>{
 const f=fixture();
 await assert.rejects(f.approval.approve({...params,bindingSha256:'invalid'}),/Невалидни/);
 assert.equal(f.read(),null);
});
test('invalid revision cannot reach D1',async()=>{
 const f=fixture();
 await assert.rejects(f.approval.approve({...params,caseRevision:-1}),/Невалидни/);
 assert.equal(f.read(),null);
});
test('missing D1 fails closed',()=>{
 assert.throws(()=>createKT134TestAtomicApproval(),/Липсва D1/);
});
