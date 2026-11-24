import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {zipSync,unzipSync} from 'fflate';
import {createDraftWordAdapter} from './kt134-auto-word-adapter.mjs';
import {createVerifiedWordPresentation} from './kt134-verified-word-presentation.mjs';
import {createAutoFinalScreenService} from './kt134-final-screen-service.mjs';
import {createAutoExpertDecisions} from './kt134-final-expert-decision.mjs';
const caseId='11111111-1111-4111-8111-111111111111';
const version='auto-proposal-v1',session={active:true,userId:'expert123'};
const draft='Относно: „Възражение“\nПредлагаме мотивиран отговор по преписката.';
async function fixture({changedRevision=false,brokenWord=false,denied=false,saveInvalid=false}={}){
 const fflate={zipSync,unzipSync};globalThis.window={fflate};
 const builder=createDraftWordAdapter({fflate,templateWindow:globalThis.window});
 const bytes=await builder.buildDraft({status:'draft',panelId:17,
  documentTitle:'Отговор по жалба',content:draft});
 let reads=0,saved=null,audits=[];
 const proposal={caseId,internalNumber:'EG-2026-000015',
  incomingNumber:'ОВОС-2159-4/23.10.2026 г.',dossierVersion:'4',
  documentDraft:draft,documentTitle:'Отговор по жалба',
  procedure:'Отговор по възражение',justification:'Има последващо възражение',
  leadingDocumentId:'Възражение.pdf',proposedPanel:17,
  reviewerStatus:'proposal_with_concerns',reviewNotes:['Правно основание за проверка'],
  uncertainties:[],expertConfirmed:false};
 const verifyWord=createVerifiedWordPresentation({unzipSync,subtle:webcrypto.subtle});
 const service=createAutoFinalScreenService({
  verifySession:async()=>({active:true,userId:'expert123'}),
  authorizeCase:async()=>!denied,
  loadCaseRevision:async()=>{reads++;return changedRevision&&reads>1?5:4},
  processor:{run:async()=>({proposal,
   wordDraft:brokenWord?null:bytes,wordError:brokenWord?'Неуспешен документ':null})},
  verifyWord,saveDraft:async x=>{saved=x;return {ok:!saveInvalid,caseId,
   proposalVersion:version,caseRevision:4,bindingSha256:x.presentation.bindingSha256}},
  audit:async x=>audits.push(x)
 });
 return {service,observe:()=>({reads,saved,audits})};
}
test('real DOCX and accepted final screen are tied to one authoritative proposal version',async()=>{
 const f=await fixture();const out=await f.service.prepare({session,caseId,proposalVersion:version});
 assert.equal(out.internalNumber,'EG-2026-000015');
 assert.equal(out.incomingNumber,'ОВОС-2159-4/23.10.2026 г.');
 assert.equal(out.procedure,'Отговор по възражение');
 assert.equal(out.proposedPanel,17);
 assert.equal(out.expertConfirmed,false);
 assert.equal(out.wordReady,true);
 assert.deepEqual(out.previewParagraphs,['Относно: „Възражение“',
 'Предлагаме мотивиран отговор по преписката.']);
 assert.equal(out.bindingSha256.length,64);
 assert.deepEqual(out.availableActions,['confirm','edit','manual_from_stage1']);
 assert.ok(f.observe().saved.wordBytes instanceof Uint8Array);
 assert.equal(f.observe().saved.presentation.bindingSha256,out.bindingSha256);
 assert.equal(f.observe().audits.length,1);
});
test('no final screen without real DOCX',async()=>{
 const f=await fixture({brokenWord:true});
 await assert.rejects(f.service.prepare({session,caseId,proposalVersion:version}),/Липсва готов Word/);
 assert.equal(f.observe().saved,null);
});
test('case changed between analysis and persistence is rejected',async()=>{
 const f=await fixture({changedRevision:true});
 await assert.rejects(f.service.prepare({session,caseId,proposalVersion:version}),/променена преди записването/);
 assert.equal(f.observe().saved,null);
});
test('unauthorized expert cannot even begin final screen preparation',async()=>{
 const f=await fixture({denied:true});
 await assert.rejects(f.service.prepare({session,caseId,proposalVersion:version}),/Няма права/);
 assert.equal(f.observe().reads,0);
});
test('no false success if protected persistence fails',async()=>{
 const f=await fixture({saveInvalid:true});
 await assert.rejects(f.service.prepare({session,caseId,proposalVersion:version}),/не потвърди/);
 assert.equal(f.observe().audits.length,0);
});

test('final expert confirmation accepts exactly the verified displayed Word version',async()=>{
 const f=await fixture();
 const final=await f.service.prepare({session,caseId,proposalVersion:version});
 const persisted=f.observe().saved;
 let savedDecision=null;
 const api=createAutoExpertDecisions({
  verifySession:async()=>({active:true,userId:'expert123'}),
  authorizeCase:async()=>true,
  loadProposal:async()=>({caseId,version,status:'awaiting_final_expert_approval',
   expertConfirmed:false,wordReady:true,documentText:persisted.proposal.documentDraft,
   procedure:persisted.proposal.procedure,documentTitle:persisted.proposal.documentTitle,
   proposedPanel:17,bindingSha256:persisted.presentation.bindingSha256}),
  saveDecision:async input=>{savedDecision=input.record;return {
   ok:true,caseId,previousVersion:version,version:'decision-1'}},
  audit:async()=>{}
 });
 await assert.rejects(api.decide({session,caseId,proposalVersion:version,
  action:'confirm',previewBindingSha256:'0'.repeat(64)}),/Прегледът/);
 assert.equal(savedDecision,null);
 const result=await api.decide({session,caseId,proposalVersion:version,
  action:'confirm',previewBindingSha256:final.bindingSha256});
 assert.equal(result.expertConfirmed,true);
 assert.equal(savedDecision.bindingSha256,final.bindingSha256);
 assert.equal(savedDecision.finalDocumentText,final.previewParagraphs.join('\n'));
});
