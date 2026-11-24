import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutoExpertDecisions} from './kt134-final-expert-decision.mjs';
const session={active:true,userId:'expert123'};
const caseId='EG-2026-000015',proposalVersion='auto-v1';
function fixture(patch={}){
 const history=[];
 const services={
  verifySession:async()=>({active:true,userId:'expert123'}),
  authorizeCase:async()=>true,
  loadProposal:async()=>({caseId,version:proposalVersion,
   status:'awaiting_final_expert_approval',expertConfirmed:false,wordReady:true,
   documentText:'Относно: Възражение\nМотивиран проект',
   procedure:'Отговор по възражение',documentTitle:'Отговор по жалба',proposedPanel:17}),
  saveDecision:async x=>{history.push(x);return {ok:true,caseId,previousVersion:proposalVersion,version:'decision-v2'};},
  audit:async x=>history.push({audit:x}),
  ...patch
 };
 return {api:createAutoExpertDecisions(services),history};
}
const args=(action,other={})=>({session,caseId,proposalVersion,action,...other});
test('expert confirms exactly the current protected proposal version',async()=>{
 const {api,history}=fixture();
 const out=await api.decide(args('confirm'));
 assert.equal(out.expertConfirmed,true);
 assert.equal(out.version,'decision-v2');
 assert.equal(history[0].record.finalDocumentText,'Относно: Възражение\nМотивиран проект');
 assert.equal(history[0].record.proposedPanel,17);
});
test('reviewer or AI never causes expert confirmation independently',async()=>{
 const {api}=fixture({verifySession:async()=>({active:false,userId:'reviewer'})});
 await assert.rejects(api.decide(args('confirm')),/удостоверяване/);
});
test('edited project remains a draft until a separate final approval',async()=>{
 const {api,history}=fixture();
 const out=await api.decide(args('edit',{editedText:'Редактиран мотивиран проект'}));
 assert.equal(out.expertConfirmed,false);
 assert.equal(out.requiresFinalApproval,true);
 assert.equal(history[0].record.editedText,'Редактиран мотивиран проект');
});
test('classic route returns to stage one, preserving case and leaving drafts unconfirmed',async()=>{
 const {api,history}=fixture();
 const out=await api.decide(args('manual_from_stage1'));
 assert.equal(out.startStage,1);
 assert.equal(out.mode,'classic');
 assert.equal(out.expertConfirmed,false);
 assert.equal(history[0].record.preserveDossier,true);
 assert.equal(history[0].record.preserveIds,true);
});
test('AI-provided stale proposal cannot be confirmed',async()=>{
 const {api}=fixture();
 await assert.rejects(api.decide({...args('confirm'),proposalVersion:'older'}),/променени/);
});
test('without actual Word draft there is no final confirmation',async()=>{
 const {api}=fixture({loadProposal:async()=>({caseId,version:proposalVersion,
  status:'awaiting_final_expert_approval',expertConfirmed:false,wordReady:false,
  documentText:'Проект',procedure:'Писмо',documentTitle:'Отговор'})});
 await assert.rejects(api.decide(args('confirm')),/Word проект/);
});
test('lost authorization blocks before loading protected proposal',async()=>{
 let fetched=false;
 const {api}=fixture({authorizeCase:async()=>false,loadProposal:async()=>{fetched=true;return {}}});
 await assert.rejects(api.decide(args('confirm')),/права/);
 assert.equal(fetched,false);
});
test('storage compare-and-swap failure is not reported as approved',async()=>{
 const {api}=fixture({saveDecision:async()=>({ok:false})});
 await assert.rejects(api.decide(args('confirm')),/не е записано/);
});
test('invalid or blank edit is rejected',async()=>{
 const {api}=fixture();
 await assert.rejects(api.decide(args('edit',{editedText:'   '})),/редактиран текст/);
});

test('bound final approval requires exact checked DOCX preview fingerprint',async()=>{
 const binding='a'.repeat(64);
 const verified={caseId,version:proposalVersion,
  status:'awaiting_final_expert_approval',expertConfirmed:false,wordReady:true,
  documentText:'Относно: Същият проект',procedure:'Отговор',documentTitle:'Писмо',
  proposedPanel:17,bindingSha256:binding};
 const {api,history}=fixture({loadProposal:async()=>verified});
 await assert.rejects(api.decide(args('confirm')),/Прегледът/);
 await assert.rejects(api.decide(args('confirm',{previewBindingSha256:'b'.repeat(64)})),/Прегледът/);
 assert.equal(history.length,0);
 const result=await api.decide(args('confirm',{previewBindingSha256:binding}));
 assert.equal(result.expertConfirmed,true);
 assert.equal(history[0].record.bindingSha256,binding);
});
