import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutoAnalysisEngine} from './kt134-auto-analysis-engine.mjs';
const caseId='EG-2026-000015';
const dossier={caseId,version:'v4',incomingNumber:'ОВОС-2159-4/23.10.2026 г.',
 documents:[{fileId:'notification',kind:'notification',text:'Първоначален документ'},
 {fileId:'authority',kind:'authority_response',text:'Предходно писмо'},
 {fileId:'objection',kind:'objection',text:'Актуално възражение'}]};
function create(overrides={}){
 let audit=null, authorCalls=0,reviewCalls=0;
 const api=createAutoAnalysisEngine({
  readSpatial:async()=>({evidence:[],status:'not_applicable'}),
  readNormative:async()=>({evidence:[{factId:'applicable_regime',value:'Необходима е правна преценка',
   sourceType:'normative',sourceId:'MASTER-V11',sourceLocation:'проверено положение',
   verification:'partial'}]}),
  author:async({caseId:received})=>{authorCalls++;return{
   caseId:received,leadingDocumentId:'objection',
   currentRequest:'Отговор на възражение',leadRationale:'Последващо оспорване на писмото',
   procedure:'Отговор по възражение',justification:'Подадено е възражение след предходно произнасяне.',
   documentTitle:'Отговор по жалба',
   documentDraft:'Относно: „Възражение“\nПредлагаме мотивиран отговор.',
   panelId:17,evidence:[{factId:'current_request',value:'Възражение',
    sourceType:'dossier',sourceId:'objection',sourceLocation:'стр. 1',verification:'verified'}]}},
  reviewer:async({caseId:received})=>{reviewCalls++;return{
   caseId:received,agrees:false,improvements:['Посочи актуалното искане'],concerns:['Проверка на правния ред']}},
  recordAudit:async a=>{audit=a},...overrides
 });
 const run=()=>api({caseId,verifiedUserId:'expert123',dossier,mode:'automatic_proposal',requireExpertApproval:true});
 return {run,stats:()=>({audit,authorCalls,reviewCalls})};
}
test('one case produces a full draft with nonblocking reviewer comments and grounded lead',async()=>{
 const f=create(),r=await f.run();
 assert.equal(r.leadingDocumentId,'objection');
 assert.equal(r.procedure,'Отговор по възражение');
 assert.equal(r.reviewerStatus,'proposal_with_concerns');
 assert.ok(r.reviewNotes.length>0);
 assert.equal(r.expertConfirmed,false);
 assert.equal(r.panelId,17);
 assert.equal(f.stats().authorCalls,1);assert.equal(f.stats().reviewCalls,1);
 assert.equal(f.stats().audit.event,'auto_case_review_completed');
 assert.equal(r.evidence.find(e=>e.factId==='current_request').verification,'verified');
});
test('reviewer failure never vetoes the proposal and remains visible',async()=>{
 const f=create({reviewer:async()=>{throw Error('review offline')}}),r=await f.run();
 assert.equal(r.reviewerStatus,'not_completed');
 assert.ok(r.uncertainties.some(s=>s.includes('Рецензентският контрол')));
 assert.match(r.documentDraft,/Предлагаме мотивиран отговор/);
});
test('unavailable GIS and legal sources remain evidence gaps',async()=>{
 const f=create({readSpatial:async()=>{throw Error('GIS offline')},
  readNormative:async()=>{throw Error('MASTER offline')}}),r=await f.run();
 assert.ok(r.uncertainties.some(s=>s.includes('Пространствената справка')));
 assert.ok(r.uncertainties.some(s=>s.includes('Нормативната справка')));
});
test('invented dossier source cannot become verified evidence',async()=>{
 const f=create({author:async()=>({caseId,leadingDocumentId:'objection',
 currentRequest:'Отговор',leadRationale:'Искане',procedure:'Процедура',
 justification:'Аргументи',documentTitle:'Отговор по жалба',
 documentDraft:'Относно: Жалба\nМотиви',
 evidence:[{factId:'fiction',value:'ЗЗ не попадат',sourceType:'dossier',
 sourceId:'phantom',sourceLocation:'стр. 1',verification:'verified'}]})});
 const r=await f.run();
 assert.ok(!r.evidence.some(e=>e.factId==='fiction'));
 assert.ok(r.uncertainties.some(e=>e.includes('доказателствени препратки'))===false);
});
test('reviewed improvement can change draft without changing case or leading file',async()=>{
 const f=create({reviewer:async()=>({caseId,agrees:false,
  revisedDraft:{leadingDocumentId:'authority',
   documentDraft:'Относно: „Възражение“\nПодобрено мотивирано предложение.'}})});
 const r=await f.run();
 assert.equal(r.leadingDocumentId,'objection');
 assert.equal(r.reviewerStatus,'reviewed_with_suggestions');
 assert.match(r.documentDraft,/Подобрено/);
});
test('another case identity is not accepted from author',async()=>{
 const f=create({author:async()=>({caseId:'EG-2026-999999'})});
 await assert.rejects(f.run(),/чужда преписка/);
});
test('case chronology cannot silently choose foreign leading document',async()=>{
 const f=create({author:async()=>({caseId,leadingDocumentId:'another-case-file'})});
 await assert.rejects(f.run(),/чужд водещ документ/);
});
test('missing complete authorial proposal fails rather than fabricating a legal act',async()=>{
 const f=create({author:async()=>({caseId,leadingDocumentId:'objection',
 currentRequest:'Отговор',leadRationale:'Възражение',procedure:'Процедура'})});
 await assert.rejects(f.run(),/завършено предложение/);
});
test('a reviewer cannot assert expert approval',async()=>{
 const f=create({reviewer:async()=>({caseId,agrees:true,
 revisedDraft:{expertConfirmed:true}})});const r=await f.run();
 assert.equal(r.expertConfirmed,false);
});
test('no intermediate expert approvals or secret prompts are part of the contract',async()=>{
 const f=create(),r=await f.run();
 assert.equal(r.status,'automatic_proposal');
 assert.equal(r.expertConfirmed,false);
 assert.ok(!JSON.stringify(r).includes('password'));
});
