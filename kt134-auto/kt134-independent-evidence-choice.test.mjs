import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutoAnalysisEngine} from './kt134-auto-analysis-engine.mjs';

test('EG Автор и рецензент получават едни и същи първични данни и право на независим избор на доказателства',async()=>{
 const calls=[];
 const caseId='11111111-1111-4111-8111-111111111111';
 const dossier={caseId,version:'1',documents:[{fileId:'notice.pdf',sourceText:'Уведомление за складове и офиси'}]};
 const engine=createAutoAnalysisEngine({
  readSpatial:async()=>({caseId,verified:false,evidence:[],profile:{area_m2:3434.71}}),
  readNormative:async()=>({caseId,verified:false,evidence:[],provisions:[{act:'ЗООС',reference:'чл. 92'}]}),
  author:async p=>{calls.push(['author',p]);return {
   caseId,leadingDocumentId:'notice.pdf',currentRequest:'Складове и офиси',
   leadRationale:'Първоначално уведомление',procedure:'Предложение за нормативна преценка',
   justification:'Преглед на фактите и правните основания',
   documentTitle:'Проект на административно писмо',
   documentDraft:'Относно: „Складове и офиси“\nПредлага се мотивирана преценка.'
  }},
  reviewer:async p=>{calls.push(['reviewer',p]);return {caseId,agrees:false,concerns:['Не е проверена приложимостта на нормативните основания']}},
  recordAudit:async()=>{}
 });
 const out=await engine({caseId,verifiedUserId:'expert',dossier,mode:'automatic_proposal',requireExpertApproval:true});
 const a=calls[0][1],r=calls[1][1];
 assert.deepEqual(a.context,r.context);
 assert.deepEqual(a.findings,r.findings);
 assert.match(a.instruction,/Сам избери относимите доказателства/u);
 assert.match(r.instruction,/независима преценка/u);
 assert.match(r.instruction,/не приемай избора или изводите/u);
 assert.match(a.instruction,/ПИ MASTER/u);
 assert.match(r.instruction,/нормативния MASTER/u);
 assert.equal(out.expertConfirmed,false);
 assert.equal(out.proceduralConclusionVerified,false);
 assert.equal(out.reviewNotes.length,1);
});
