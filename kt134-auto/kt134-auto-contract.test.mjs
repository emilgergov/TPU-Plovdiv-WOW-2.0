import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCaseContext,assessLeadDocument,addReviewerAssessment,finalOutputContract} from './kt134-auto-contract.mjs';

const dossier=()=>buildCaseContext({caseId:'EG-2026-000015',incomingNumber:'ОВОС-2159-4/23.10.2026 г.',
 documents:[
 {fileId:'original',kind:'notification',statedRequest:'Първоначално уведомление'},
 {fileId:'response',kind:'authority_response',statedRequest:'Произнесен орган'},
 {fileId:'objection',kind:'objection',statedRequest:'Възражение срещу писмото'}]});

test('case identity survives automatic intake',()=>{
 const x=dossier();
 assert.equal(x.caseId,'EG-2026-000015');
 assert.equal(x.incomingNumber,'ОВОС-2159-4/23.10.2026 г.');
 assert.equal(x.status,'automatic_unconfirmed');
});

test('lead choice depends on actual administrative request, not first file',()=>{
 const x=dossier();
 const result=assessLeadDocument(x,[
 {fileId:'original',relevant:false,currentAdministrativeRequest:'Първоначално ИП',rationale:'Исторически контекст',sourceRefs:['p1']},
 {fileId:'response',relevant:false,currentAdministrativeRequest:'Предишно произнасяне',rationale:'Предхожда възражението',sourceRefs:['p1']},
 {fileId:'objection',relevant:true,currentAdministrativeRequest:'Отговор на възражение',rationale:'Актуално оспорване на писмото',sourceRefs:['p1']},
 ]);
 assert.equal(result.selectedFileId,'objection');
 assert.equal(result.expertConfirmed,false);
 assert.equal(result.status,'automatic_proposal');
});

test('reviewer disagreement does not block and is visible',()=>{
 const p=assessLeadDocument(dossier(),[{fileId:'objection',relevant:true,currentAdministrativeRequest:'Отговор',rationale:'Актуално искане',sourceRefs:['p1']}]);
 const r=addReviewerAssessment(p,{agrees:false,concerns:['Неясна дата'],improvements:['Посочи точния текст']});
 assert.equal(r.reviewerStatus,'proposal_with_concerns');
 assert.deepEqual(r.reviewerConcerns,['Неясна дата']);
 assert.equal(r.expertConfirmed,false);
});

test('missing evidence never silently turns into proven',()=>{
 const p=assessLeadDocument(dossier(),[{fileId:'objection',relevant:true,currentAdministrativeRequest:'Отговор',rationale:'',sourceRefs:[]}]);
 assert.equal(p.selectedFileId,'objection');
 assert.ok(p.issues.some(i=>i.includes('доказателствена')));
});

test('final contract includes draft Word target and three expert options',()=>{
 const r=finalOutputContract({caseId:'EG-2026-000015',proposal:'Отговор на възражение',justification:'Мотиви',draftText:'Проект на писмо',panelId:17});
 assert.equal(r.wordStatus,'draft_not_approved');
 assert.equal(r.expertConfirmed,false);
 assert.deepEqual(r.expertActions,['confirm','edit','manual_from_stage1']);
});

test('case intake rejects duplicate file identities',()=>{
 assert.throws(()=>buildCaseContext({caseId:'EG-1',documents:[{fileId:'a'},{fileId:'a'}]}),/Нееднозначен/);
});
