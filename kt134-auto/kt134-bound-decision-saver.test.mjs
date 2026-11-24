import test from 'node:test';
import assert from 'node:assert/strict';
import {createKT134BoundDecisionSaver} from './kt134-bound-decision-saver.mjs';
const caseId='11111111-1111-4111-8111-111111111111';
const word='a'.repeat(64),binding='b'.repeat(64);
const input={caseId,expectedVersion:'v1',expectedCaseRevision:4,
 expectedWordSha256:word,expectedBindingSha256:binding,
 record:{caseId,proposalVersion:'v1',caseRevision:4,wordSha256:word,
  bindingSha256:binding,userId:'expert123',action:'confirm',expertConfirmed:true}};
test('forwards only immutable protected case + Word identity to atomic KT125 host',async()=>{
 let received;
 const saver=createKT134BoundDecisionSaver({atomicCommit:async x=>{
  received=x;return {ok:true,atomic:true,updatedRows:1,caseId,previousVersion:'v1',version:'decision-v2'};
 }});
 const out=await saver.saveDecision(input);
 assert.equal(out.version,'decision-v2');
 assert.equal(received.action,'case.confirm');
 assert.equal(received.userId,'expert123');
 assert.equal(received.wordSha256,word);
 assert.equal(received.bindingSha256,binding);
 assert.equal(received.caseRevision,4);
});
test('reject missing host atomic port',()=>{
 assert.throws(()=>createKT134BoundDecisionSaver(),/Липсва KT125/);
});
test('reject approval if source Word hash differs',async()=>{
 let called=false;
 const saver=createKT134BoundDecisionSaver({atomicCommit:async()=>{called=true}});
 await assert.rejects(saver.saveDecision({...input,record:{...input.record,wordSha256:'c'.repeat(64)}}),/не е обвързано/);
 assert.equal(called,false);
});
test('reject approval if source case revision differs',async()=>{
 let called=false;
 const saver=createKT134BoundDecisionSaver({atomicCommit:async()=>{called=true}});
 await assert.rejects(saver.saveDecision({...input,record:{...input.record,caseRevision:5}}),/не е обвързано/);
 assert.equal(called,false);
});
test('reject host reporting success without atomic proof',async()=>{
 const saver=createKT134BoundDecisionSaver({atomicCommit:async()=>({
  ok:true,caseId,previousVersion:'v1',version:'d2',updatedRows:1
 })});
 await assert.rejects(saver.saveDecision(input),/не потвърди атомарно/);
});
test('reject host reporting two modified decisions',async()=>{
 const saver=createKT134BoundDecisionSaver({atomicCommit:async()=>({
  ok:true,atomic:true,caseId,previousVersion:'v1',version:'d2',updatedRows:2
 })});
 await assert.rejects(saver.saveDecision(input),/не потвърди атомарно/);
});
test('reject host failure or revoked rights',async()=>{
 const saver=createKT134BoundDecisionSaver({atomicCommit:async()=>({
  ok:false,atomic:true,updatedRows:0,caseId,previousVersion:'v1',version:'d2'
 })});
 await assert.rejects(saver.saveDecision(input),/не потвърди атомарно/);
});
test('reject edit route masquerading as final approval',async()=>{
 let called=false;
 const saver=createKT134BoundDecisionSaver({atomicCommit:async()=>{called=true}});
 await assert.rejects(saver.saveDecision({...input,record:{...input.record,action:'edit'}}),/не е обвързано/);
 assert.equal(called,false);
});
