import test from 'node:test';
import assert from 'node:assert/strict';
import {createKT134VaultProposalLoader} from './kt134-vault-proposal-loader.mjs';
import {createKT134BoundDecisionSaver} from './kt134-bound-decision-saver.mjs';
import {createAutoExpertDecisions} from './kt134-final-expert-decision.mjs';
import {createKT134StoredApprovalBridge} from './kt134-stored-approval-bridge.mjs';
const caseId='11111111-1111-4111-8111-111111111111';
const binding='a'.repeat(64),word='b'.repeat(64);
const initial={caseId,proposalVersion:'v1',caseRevision:4,status:'awaiting_expert',
 bindingSha256:binding,wordSha256:word,wordBytes:new Uint8Array([80,75,3,4,1,2]),
 proposal:{caseId,expertConfirmed:false,documentDraft:'Относно: Възражение\nМотивирано предложение',
  procedure:'Разглеждане на възражение',documentTitle:'Писмо',proposedPanel:17}};
function fixture({actualRevision=4,canConfirm=true,atomicChanges=1,wordHash=word}={}){
 const operations=[];
 const draft={...initial,wordSha256:wordHash};
 const vault={
  async loadDraft(x){operations.push('private-docx-read');assert.equal(x.includeWord,true);return draft},
  async loadCurrentDraft(x){operations.push('current-draft-read');assert.equal(x.includeWord,true);return draft}
 };
 const loader=createKT134VaultProposalLoader({vault});
 const saver=createKT134BoundDecisionSaver({atomicCommit:async req=>{
  operations.push('atomic-commit');
  assert.equal(req.action,'case.confirm');
  assert.equal(req.caseRevision,4);assert.equal(req.wordSha256,wordHash);
  return {ok:atomicChanges===1,atomic:true,updatedRows:atomicChanges,
   caseId,previousVersion:'v1',version:'approved-v1'};
 }});
 const verifySession=async()=>({active:true,userId:'expert123'});
 const authorizeCase=async({action})=>{
  operations.push('authorize:'+action);
  return action==='case.confirm'?canConfirm:action==='document.generate';
 };
 const decisions=createAutoExpertDecisions({
  verifySession,authorizeCase,loadProposal:loader.loadProposal,
  saveDecision:saver.saveDecision,audit:async()=>{}
 });
 const bridge=createKT134StoredApprovalBridge({
  verifySession,authorizeCase,loadCaseRevision:async()=>actualRevision,
  vault,decisions,audit:async()=>{}
 });
 return {bridge,operations};
}
const args={caseId,proposalVersion:'v1',previewBindingSha256:binding};
test('full isolated protected handoff confirms only after atomic KT125 host acknowledgement',async()=>{
 const f=fixture();const out=await f.bridge.confirm(args);
 assert.equal(out.expertConfirmed,true);
 assert.deepEqual(f.operations,[
  'authorize:case.confirm','private-docx-read','authorize:case.confirm',
  'current-draft-read','atomic-commit'
 ]);
});
test('revoked confirmation right prevents any private Word access',async()=>{
 const f=fixture({canConfirm:false});
 await assert.rejects(f.bridge.confirm(args),/право/);
 assert.deepEqual(f.operations,['authorize:case.confirm']);
});
test('changed case revision blocks atomic commit',async()=>{
 const f=fixture({actualRevision:5});
 await assert.rejects(f.bridge.confirm(args),/променена/);
 assert.equal(f.operations.includes('atomic-commit'),false);
});
test('rejected atomic host does not report expert approval',async()=>{
 const f=fixture({atomicChanges:0});
 await assert.rejects(f.bridge.confirm(args),/не потвърди атомарно/);
});
test('wrong preview fingerprint never reaches atomic commit',async()=>{
 const f=fixture();
 await assert.rejects(f.bridge.confirm({...args,previewBindingSha256:'c'.repeat(64)}),/не съответства/);
 assert.equal(f.operations.includes('atomic-commit'),false);
});
