import test from 'node:test';
import assert from 'node:assert/strict';
import {createKT134ProtectedHost} from './kt134-protected-host-composition.mjs';

const caseId='11111111-1111-4111-8111-111111111111';
const requestId='22222222-2222-4222-8222-222222222222';
const origin='https://isolated.example';
const V11='8d3851affd72fb44b4d663920196e00ec317c8e45d36fc16c6ad6b0ce965226c';
const docText='Уведомление за инвестиционно предложение за складове и офисна част в ПИ 56784.13.102.';
function build({active=true,revision=4,authorReady=true}={}){
 const calls=[],audit=[],journal=[];
 const host=createKT134ProtectedHost({
  origin,
  identity:async request=>{calls.push('identity');return active&&request.headers.get('Cookie')==='kt125_test_session'?
   {verified:true,userId:'expert123',role:'expert'}:{verified:false};},
  caseContext:async ({caseId:cid})=>{calls.push('acl');return {verified:true,caseId:cid,internalNumber:'EG-2026-000015',revision:4};},
  readState:async()=>({record:{case_id:caseId,revision:4},state:{intake:{
   document_texts:[{source:'Uvedomlenie.pdf',kind:'notification',text:docText}]}}}),
  unpackState:async x=>x,
  listSources:async()=>[{filename:'P4.zip',complete:1}],
  readSpatial:async p=>{calls.push('gis');return {caseId:p.caseId,verified:false,
   archivalOnly:true,area_m2:3434.7131219906,zz:[],zt:[],evidence:[]};},
  getLegalContext:async p=>{calls.push('legal');assert.equal(p.archiveSHA256,V11);
   assert.ok(p.caseTexts.includes(docText));return {archiveSHA256:V11,legalProvisions:[
   {act:'ЗООС',reference:'чл. 92',sourcePath:'MASTER/V11/zoos',contentSHA256:'a'.repeat(64),
   originalSourceSHA256:'b'.repeat(64),fullLegalText:'Архивен текст, без преценка за приложимост.',applicabilityVerified:false}]};},
  author:async p=>{calls.push('author');
   assert.equal(p.findings.normative.provisions[0].act,'ЗООС');
   assert.equal(p.findings.spatial.area_m2,3434.7131219906);
   assert.equal(p.context.documents.length,1);
   return {caseId:p.caseId,leadingDocumentId:'Uvedomlenie.pdf',currentRequest:'Складове и офиси',
    leadRationale:'Водещо уведомление',procedure:'Проект: необходима е преценка',
    justification:'Въз основа на наличните материали е необходима мотивирана преценка.',
    documentDraft:'Относно: „Складове и офиси“\nПроект за експертно разглеждане.',
    documentTitle:'Проект на писмо',panelId:4};},
  reviewer:async p=>{calls.push('reviewer');
   assert.equal(p.context.documents[0].sourceText,docText);
   assert.equal(p.findings.normative.provisions[0].act,'ЗООС');
   return {caseId:p.caseId,agrees:false,concerns:['Актуалният ГИС анализ не е извършен']};},
  recordAudit:async e=>audit.push(e),
  reserveOperation:async p=>{journal.push(['reserve',p.caseId,p.revision]);return {status:'claimed'};},
  completeOperation:async p=>{journal.push(['complete',p.status]);return {ok:true};},
  getRevision:async()=>revision
 });
 function make({requestedVersion='4',requestedOrigin=origin,session=true,bodyOverride={}}={}){
  return new Request(origin+'/kt134/auto',{method:'POST',headers:{
   Origin:requestedOrigin,'Content-Type':'application/json',
   Cookie:session?'kt125_test_session':'not_logged_in',
   'X-KT126-Case':caseId,'X-KT126-Revision':requestedVersion,
   'X-KT134-Request-Id':requestId
  },body:JSON.stringify({operation:'kt134.auto-dossier-analyze.v1',caseId,
   dossierVersion:requestedVersion,mode:'automatic_proposal',
   requireExpertApproval:true,...bodyOverride})});
 }
 return {host,make,calls,audit,journal};
}
test('all existing KT125 protected adapters form one successful proposal route with actual dossier context',async()=>{
 const t=build();const res=await t.host.handle(t.make());
 assert.equal(res.status,200);
 const result=await res.json();
 assert.equal(result.expertConfirmed,false);
 assert.equal(result.proceduralConclusionVerified,false);
 assert.equal(result.evidenceReadiness.proposalStatus,'provisional_unverified');
 assert.equal(result.reviewerStatus,'proposal_with_concerns');
 assert.deepEqual(t.calls.filter(x=>['gis','legal','author','reviewer'].includes(x)).sort(),
  ['author','gis','legal','reviewer']);
 assert.ok(t.audit.some(e=>e.event==='auto_case_review_completed'));
 assert.equal(t.journal.at(-1)[0],'complete');
});
test('KT125 inactive local session cannot reach agents or legal reader',async()=>{
 const t=build({active:false}),res=await t.host.handle(t.make());
 assert.equal(res.status,403);
 assert.ok(!t.calls.includes('author')&&!t.calls.includes('legal'));
});
test('different-origin request fails before case read',async()=>{
 const t=build(),res=await t.host.handle(t.make({requestedOrigin:'https://foreign.example'}));
 assert.equal(res.status,403);
 assert.equal(t.calls.length,0);
});
test('stale case revision is rejected, without EG invocation',async()=>{
 const t=build(),res=await t.host.handle(t.make({requestedVersion:'3'}));
 assert.equal(res.status,409);
 assert.ok(!t.calls.includes('author'));
});
test('parallel case edit invalidates proposal after analysis',async()=>{
 const t=build({revision:5}),res=await t.host.handle(t.make());
 assert.equal(res.status,409);
 assert.ok(t.calls.includes('author'));
});
test('client dossier injection is ignored in favor of authorized KT125 stored source',async()=>{
 const t=build(),res=await t.host.handle(t.make({bodyOverride:{
  documents:[{fileId:'forged.pdf',sourceText:'Фалшиво водещо искане'}]}}));
 assert.equal(res.status,200);
 assert.ok(t.calls.includes('author'));
});
test('missing server-side mandatory KT125 operation journal fails at wiring time',()=>{
 assert.throws(()=>createKT134ProtectedHost({}),/Липсва защитена връзка/);
});
