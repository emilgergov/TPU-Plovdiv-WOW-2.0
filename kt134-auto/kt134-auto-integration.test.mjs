import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutoProcessor} from './kt134-auto-processor.mjs';
import {createProtectedAutoGateway} from './kt134-protected-gateway-adapter.mjs';
import {createDraftWordAdapter} from './kt134-auto-word-adapter.mjs';

test('isolated full route: protected expert -> objection -> reviewer -> reasoned draft -> Word project',async()=>{
 const session={active:true,userId:'expert123'};
 const caseId='EG-2026-000015';
 const xml='<w:document><w:body>'+
   '<w:p>Електронен подпис: _______</w:p><w:p>Електронен подпис: _______</w:p>'+
   '<w:p><w:r>{{SUBJECT}}</w:r></w:p><w:p><w:r>{{DOCUMENT_TITLE}}</w:r></w:p>'+
   '<w:p><w:r>{{BODY_ANCHOR}}</w:r></w:p></w:body></w:document>';
 const files={'word/document.xml':new TextEncoder().encode(xml),
  'word/header1.xml':new TextEncoder().encode('РИОСВ Пловдив'),
  'word/footer1.xml':new TextEncoder().encode('РИОСВ Пловдив — контакти')};
 let wordXml='',gatewayCalls=0,history=[];
 const fflate={
  unzipSync:()=>structuredClone(files),
  zipSync:(archive)=>{wordXml=new TextDecoder().decode(archive['word/document.xml']);return new Uint8Array([80,75,3,4]);}
 };
 const word=createDraftWordAdapter({fflate,templateWindow:{fflate},createTemplate:()=>new Uint8Array([80,75])});
 const gateway=createProtectedAutoGateway({
  verifySession:async()=>({active:true,userId:'expert123'}),
  invokeAuthorized:async({operation,caseId:received,payload})=>{
   gatewayCalls++;
   assert.equal(operation,'kt134.auto-dossier-analyze.v1');
   assert.equal(received,caseId);
   assert.equal(payload.requireExpertApproval,true);
   return {caseId,leadingDocumentId:'objection',documentTitle:'Отговор по жалба',
    procedure:'Разглеждане на възражение',justification:'Налице е актуално искане за отговор по възражение.',
    documentDraft:'Относно: „Възражение по издадено писмо“\nПредлага се мотивиран отговор въз основа на преписката.',
    evidence:[{source:'objection',location:'страница 1'}],panelId:17,
    reviewNotes:['Рецензентът предлага по-точна правна формулировка.'],
    expertConfirmed:false};
  }
 });
 const registry={getCase:async({caseId:requested})=>{
  assert.equal(requested,caseId);
  return {caseId,incomingNumber:'ОВОС-2159-4/23.10.2026 г.',version:'test-v1',
   documents:[{fileId:'notification',kind:'notification'},{fileId:'objection',kind:'objection'}]};
 }};
 const audit={record:async x=>{history.push(x)}};
 const processor=createAutoProcessor({registry,gateway,word,audit});
 const result=await processor.run({session,caseId});
 assert.equal(gatewayCalls,1);
 assert.equal(result.proposal.caseId,caseId);
 assert.equal(result.proposal.leadingDocumentId,'objection');
 assert.equal(result.proposal.proposedPanel,17);
 assert.equal(result.proposal.expertConfirmed,false);
 assert.equal(result.proposal.status,'awaiting_final_expert_approval');
 assert.equal(result.wordError,null);
 assert.ok(result.wordDraft instanceof Uint8Array);
 assert.match(wordXml,/ОТГОВОР ПО ЖАЛБА/u);
 assert.match(wordXml,/Възражение по издадено писмо/u);
 assert.equal(history.length,1);
 assert.equal(history[0].wordReady,true);
 const manual=await processor.manualFromStage1({session,caseId,proposal:result.proposal});
 assert.equal(manual.stage,1);
 assert.equal(manual.reuseExistingDossier,true);
 assert.equal(manual.carryAutomaticProposalsAsUnconfirmed,true);
 assert.equal(history[1].event,'manual_route_requested');
});
