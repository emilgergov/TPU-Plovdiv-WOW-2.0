import test from 'node:test';
import assert from 'node:assert/strict';
import {createKT125LocalPorts} from './kt134-kt125-local-ports.mjs';
import {createAutoServerRoute} from './kt134-server-route.mjs';
import {createAutoAnalysisEngine} from './kt134-auto-analysis-engine.mjs';
const caseId='11111111-1111-4111-8111-111111111111';
const internalNumber='EG-2026-000015';
function setup({active=true,canEdit=true}={}){
 const calls=[], audits=[];
 const ports=createKT125LocalPorts({
  identity:async request=>{calls.push('identity');
   return request.headers.get('Cookie')==='kt125_test_session'&&active?
    {verified:true,userId:'expert123',role:'expert'}:null;},
  caseContext:async ({action})=>{calls.push('caseContext:'+action);return canEdit?
   {verified:true,caseId,internalNumber,externalNumber:'ОВОС-2159-4/23.10.2026 г.',revision:4}:null;},
  readState:async()=>({record:{case_id:caseId,revision:4},state:{intake:{
   document_texts:[{source:'notification.pdf',text:'Уведомление за предложение'},
    {source:'objection.pdf',text:'Възражение срещу предходния отговор'}]}}}),
  unpackState:async data=>data,
  listSources:async()=>[{source_id:'original',filename:'case.zip',complete:1}]
 });
 const analyze=createAutoAnalysisEngine({
  readSpatial:async()=>({status:'not_applicable',evidence:[]}),
  readNormative:async()=>({evidence:[{factId:'source',value:'Нужна е правна преценка',
   sourceType:'normative',sourceId:'MASTER',sourceLocation:'ЗООС, приложими разпоредби',
   verification:'partial'}]}),
  author:async({caseId:cid})=>{calls.push('author');
   return {caseId:cid,leadingDocumentId:'objection.pdf',
    currentRequest:'Отговор по възражение',leadRationale:'Последващото възражение е актуалното искане',
    procedure:'Разглеждане на възражението',justification:'Предлага се мотивиран отговор',
    documentTitle:'Отговор по жалба',documentDraft:'Относно: „Възражение“\nПредлага се мотивирано произнасяне.',
    panelId:17,evidence:[{factId:'request',value:'Възражение',
     sourceType:'dossier',sourceId:'objection.pdf',sourceLocation:'стр. 1',verification:'verified'}]}},
  reviewer:async({caseId:cid})=>{calls.push('reviewer');return {caseId:cid,agrees:false,
   concerns:['Необходимо е уточняване на правното основание']}},
  recordAudit:async item=>audits.push(item)
 });
 const route=createAutoServerRoute({
  authenticateRequest:ports.authenticateRequest,authorizeCase:ports.authorizeCase,
  readDossier:ports.readDossier,analyze,
  recordAudit:async item=>audits.push(item)
 });
 function request(version='4'){
  return new Request('https://isolated.invalid/kt134/auto',{method:'POST',
   headers:{Cookie:'kt125_test_session','Content-Type':'application/json'},
   body:JSON.stringify({operation:'kt134.auto-dossier-analyze.v1',caseId,
    dossierVersion:version,mode:'automatic_proposal',requireExpertApproval:true})});
 }
 return {route,request,calls,audits,ports};
}
test('KT125 cookie → UUID case ACL → exact revision → EG author/reviewer → one complete unapproved proposal',async()=>{
 const t=setup();const response=await t.route(t.request());
 const out=await response.json();
 assert.equal(response.status,200);
 assert.equal(out.caseId,caseId);
 assert.equal(out.leadingDocumentId,'objection.pdf');
 assert.equal(out.panelId,17);
 assert.equal(out.reviewerStatus,'proposal_with_concerns');
 assert.equal(out.expertConfirmed,false);
 assert.match(out.documentDraft,/Предлага се мотивирано произнасяне/);
 assert.ok(t.calls.includes('author')&&t.calls.includes('reviewer'));
 assert.ok(t.audits.some(x=>x.event==='auto_case_review_completed'));
});
test('inactive KT125 session denies before EG Author or reviewer is invoked',async()=>{
 const t=setup({active:false});const response=await t.route(t.request());
 assert.equal(response.status,403);
 assert.equal(t.calls.includes('author'),false);
});
test('revoked KT125 case permission denies without any author call',async()=>{
 const t=setup({canEdit:false});const response=await t.route(t.request());
 assert.equal(response.status,403);
 assert.equal(t.calls.includes('author'),false);
});
test('stale KT126 revision never triggers EG analysis',async()=>{
 const t=setup();const response=await t.route(t.request('3'));
 assert.equal(response.status,409);
 assert.equal(t.calls.includes('author'),false);
});
test('no visible EG number may replace authoritative UUID in case operations',async()=>{
 const t=setup();
 const request=new Request('https://isolated.invalid/kt134/auto',{method:'POST',
 headers:{Cookie:'kt125_test_session','Content-Type':'application/json'},
 body:JSON.stringify({operation:'kt134.auto-dossier-analyze.v1',
  caseId:internalNumber,dossierVersion:'4',mode:'automatic_proposal',requireExpertApproval:true})});
 const response=await t.route(request);
 assert.equal(response.status,400);
});
