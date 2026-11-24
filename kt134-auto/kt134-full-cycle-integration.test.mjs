import test from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,unzipSync} from 'fflate';
import {createKT125LocalPorts} from './kt134-kt125-local-ports.mjs';
import {createAutoServerRoute} from './kt134-server-route.mjs';
import {createAutoAnalysisEngine} from './kt134-auto-analysis-engine.mjs';
import {createProtectedAutoGateway} from './kt134-protected-gateway-adapter.mjs';
import {createAutoProcessor} from './kt134-auto-processor.mjs';
import {createDraftWordAdapter} from './kt134-auto-word-adapter.mjs';
import {createAutoExpertDecisions} from './kt134-final-expert-decision.mjs';
const caseId='11111111-1111-4111-8111-111111111111';
const session={active:true,userId:'expert123'};
const origin='https://isolated.invalid';
test('KT134 complete synthetic lifecycle: KT125 -> EG Author/reviewer -> real DOCX -> expert approval',async()=>{
 const trace=[],audit=[];
 const ports=createKT125LocalPorts({
  identity:async r=>r.headers.get('Cookie')==='test-session'?{verified:true,userId:'expert123',role:'expert'}:null,
  caseContext:async()=>({verified:true,caseId,revision:4,internalNumber:'EG-2026-000015',externalNumber:'ОВОС-2159-4/23.10.2026 г.'}),
  readState:async()=>({record:{case_id:caseId,revision:4},state:{intake:{document_texts:[
   {source:'Уведомление.pdf',text:'Предходно уведомление'},
   {source:'Възражение.pdf',text:'Актуално възражение'}]}}}),
  unpackState:async x=>x,
  listSources:async()=>[{source_id:'original',filename:'case.zip',complete:1}]
 });
 const analyze=createAutoAnalysisEngine({
  readSpatial:async()=>({status:'not_applicable',evidence:[]}),
  readNormative:async()=>({evidence:[]}),
  author:async({caseId:id})=>{trace.push('автор');return{caseId:id,
   leadingDocumentId:'Възражение.pdf',currentRequest:'Отговор на възражение',
   leadRationale:'Последващото възражение е актуалният предмет',
   procedure:'Разглеждане на възражение',justification:'Необходим е мотивиран отговор',
   documentTitle:'Отговор по жалба',panelId:17,
   documentDraft:'Относно: „Възражение“\nПредлагаме мотивиран административен отговор.',
   evidence:[{factId:'request',value:'Възражение',sourceType:'dossier',
    sourceId:'Възражение.pdf',sourceLocation:'стр. 1',verification:'verified'}]}},
  reviewer:async({caseId:id})=>{trace.push('рецензент');return{caseId:id,agrees:false,
   concerns:['Уточни приложимото правно основание']}},
  recordAudit:async x=>audit.push(x)
 });
 const route=createAutoServerRoute({authenticateRequest:ports.authenticateRequest,
  authorizeCase:ports.authorizeCase,readDossier:ports.readDossier,analyze,
  recordAudit:async x=>audit.push(x)});
 const gateway=createProtectedAutoGateway({
  verifySession:async()=>({active:true,userId:'expert123'}),
  invokeAuthorized:async({operation,payload})=>{
   const req=new Request(origin+'/kt134/auto',{method:'POST',
    headers:{Cookie:'test-session','Content-Type':'application/json'},
    body:JSON.stringify({operation,caseId,dossierVersion:payload.dossierVersion,
     mode:'automatic_proposal',requireExpertApproval:true})});
   const r=await route(req);if(!r.ok)throw Error('Защитен отказ '+r.status);
   return r.json();
  }
 });
 const fflate={zipSync,unzipSync};globalThis.window={fflate};
 const word=createDraftWordAdapter({fflate,templateWindow:globalThis.window});
 const registry={getCase:async()=>ports.readDossier({user:{verified:true,userId:'expert123',role:'expert'},caseId})};
 const workflow=createAutoProcessor({registry,gateway,word,audit:{record:async x=>audit.push(x)}});
 const out=await workflow.run({session,caseId});
 assert.deepEqual(trace,['автор','рецензент']);
 assert.equal(out.proposal.internalNumber,'EG-2026-000015');
 assert.equal(out.proposal.incomingNumber,'ОВОС-2159-4/23.10.2026 г.');
 assert.equal(out.proposal.proposedPanel,17);
 assert.equal(out.proposal.expertConfirmed,false);
 assert.equal(out.proposal.reviewerStatus,'proposal_with_concerns');
 assert.equal(out.wordError,null);
 assert.ok(unzipSync(out.wordDraft)['word/header1.xml']);
 assert.match(new TextDecoder().decode(unzipSync(out.wordDraft)['word/document.xml']),/ОТГОВОР ПО ЖАЛБА/);
 let saved=null;
 const decisions=createAutoExpertDecisions({
  verifySession:async()=>({active:true,userId:'expert123'}),authorizeCase:async()=>true,
  loadProposal:async()=>({caseId,version:'v1',status:'awaiting_final_expert_approval',
   expertConfirmed:false,wordReady:true,documentText:out.proposal.documentDraft,
   procedure:out.proposal.procedure,documentTitle:out.proposal.documentTitle,proposedPanel:17}),
  saveDecision:async x=>{saved=x.record;return{ok:true,caseId,previousVersion:'v1',version:'decision-v2'}},
  audit:async x=>audit.push(x)
 });
 assert.equal(saved,null);
 const approved=await decisions.decide({session,caseId,proposalVersion:'v1',action:'confirm'});
 assert.equal(approved.expertConfirmed,true);
 assert.equal(saved.action,'confirm');
 assert.ok(audit.some(x=>x.event==='auto_case_review_completed'));
});
