import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COMPLAINT_QUALIFICATION_SCHEMA,validateComplaintQualification,complaintDraftIssues,normalizeComplaintDraft} from './kt134-complaint-qualification.mjs';
const purpose={complaintReview:true,kind:'review_of_prior_correspondence'};
const caseQuote='Възражение относно съдържанието на предходно писмо на компетентния орган, с искане за проверка и корекция на формулировката.';
const lawQuote='Чл. 34. Административният орган осигурява на страните възможност да изразят становище по събраните доказателства.';
const options={facts:[{id:'doc:0',text:caseQuote,excerpts:[{id:'doc:0#0',text:caseQuote}]}],
 laws:[{id:'law:34',verified:true,text:lawQuote,excerpts:[{id:'law:34#0',text:lawQuote}]}]};
const q={kind:'complaint_procedure',selectedPanel:17,requestType:'възражение по писмо',
 caseSource:'doc:0',caseQuote:'doc:0#0',legalSource:'law:34',legalQuote:'law:34#0',
 competenceReason:'Необходимо е изрично да се провери компетентността на органа, видът на предходното писмо и дали искането представлява жалба или възражение.',
 routeReason:'Настоящото искане се отнася до текста на вече изпратено писмо, а не съдържа ново уведомление за инвестиционно предложение; предлага се мотивиран административен отговор.',
 proposedAction:'Да се изготви мотивиран проект на отговор по възражението с проверка на компетентността и процесуалното основание.',
 unresolvedQuestion:'Правният характер на предходното писмо се проверява отделно.'};
assert.equal(COMPLAINT_QUALIFICATION_SCHEMA.properties.kind.type,'string');
assert.deepEqual(validateComplaintQualification(q,options,purpose).errors,[]);
for(const panel of [1,4,5,7])assert.ok(validateComplaintQualification({...q,selectedPanel:panel},options,purpose).errors.includes('COMPLAINT_NEW_IP_ROUTE_WITHOUT_NEW_FILING'));
assert.ok(validateComplaintQualification({...q,legalQuote:'law:34#99'},options,purpose).errors.includes('COMPLAINT_LEGAL_SOURCE_UNVERIFIED'));
assert.ok(validateComplaintQualification({...q,caseQuote:'doc:0#99'},options,purpose).errors.includes('COMPLAINT_CASE_SOURCE_UNVERIFIED'));
assert.ok(validateComplaintQualification(q,options,{complaintReview:false}).errors.includes('COMPLAINT_PURPOSE_NOT_ESTABLISHED'));
assert.ok(validateComplaintQualification({...q,competenceReason:'няма'},options,purpose).errors.includes('COMPLAINT_COMPETENCE_UNREASONED'));
const draft=['Фактическа основа',caseQuote,
 'Нормативни предпоставки и граници на проверката',lawQuote,
 'Мотивирано предложение','ИЗБРАН ПАНЕЛ: 17 — Отговор по жалба',q.routeReason,
 'Данни за експертна проверка',q.unresolvedQuestion].join('\n');
assert.deepEqual(complaintDraftIssues(draft,q),[]);
assert.ok(complaintDraftIssues(draft.replace('ИЗБРАН ПАНЕЛ: 17','ИЗБРАН ПАНЕЛ: 01'),q).includes('COMPLAINT_DRAFT_PANEL_MISMATCH'));
assert.ok(complaintDraftIssues('ИЗБРАН ПАНЕЛ: 17 — Отговор по жалба',q).includes('COMPLAINT_FACTUAL_SECTION_MISSING'));
const worker=readFileSync(new URL('./worker.js',import.meta.url),'utf8');
assert.ok(worker.indexOf('const complaintAuthorSystem=[')>0);
assert.ok(worker.indexOf('const complaintAuthorSystem=[')<worker.indexOf('isComplaint?complaintAuthorSystem:system'),
 'Never use complaint Author prompt before its declaration (real 504 regression)');
assert.ok(worker.includes('const stage5Decision=isComplaintQualification?null:evaluateDraft('),
 'Stage5 must not reimpose new-IP four-test matrix on objection');
const titleOnly=[
 'Фактическа основа',caseQuote,'II. Нормативна рамка',lawQuote,
 'Мотивирано предложение','ИЗБРАН ПАНЕЛ: Отговор по жалба',q.routeReason
].join('\n');
const normalized=normalizeComplaintDraft(titleOnly,q);
assert.match(normalized,/ИЗБРАН ПАНЕЛ: 17 — Отговор по жалба/u);
assert.match(normalized,/Нормативни предпоставки и граници на проверката/u);
assert.match(normalized,/Данни за експертна проверка/u);
assert.deepEqual(complaintDraftIssues(normalized,q),[]);
const conflicting=normalizeComplaintDraft(titleOnly.replace('Отговор по жалба','Произнасяне по възражение'),q);
assert.ok(!/ИЗБРАН ПАНЕЛ: 17/u.test(conflicting),'Never silently change a contradictory model panel');
assert.ok(complaintDraftIssues(conflicting,q).includes('COMPLAINT_DRAFT_PANEL_MISMATCH'));
// Replay the exact heading pattern and unsupported document request from
// live GitHub Actions run 45695029496, WITHOUT another paid AI call.
const liveReplay=[
 'ИЗБРАН ПАНЕЛ: 17 — Отговор по жалба',
 'Проект за административно действие по възражение',
 '1. Фактическа основа',caseQuote,
 '2. Нормативни предпоставки и рамка',lawQuote,
 '3. Процесуални действия и предложение за решение',
 'Да се изискат допълнителни геопространствени данни и нова експертна оценка, без уточнена правна норма.',
 '4. Експертна проверка'
].join('\\n');
const repaired=normalizeComplaintDraft(liveReplay,q);
assert.ok(repaired.includes('Нормативни предпоставки и граници на проверката'));
assert.ok(repaired.includes('Мотивирано предложение'));
assert.ok(repaired.includes('Данни за експертна проверка'));
assert.ok(!complaintDraftIssues(repaired,q).includes('COMPLAINT_ACTION_SECTION_MISSING'));
assert.ok(complaintDraftIssues(repaired,q).includes('COMPLAINT_UNPROVEN_GIS_REQUEST'),
 'Editing the headings MUST NOT hide the ungrounded GIS request');
assert.ok(complaintDraftIssues(draft+'\\nЧл. 2, ал. 2 регламентира ред за възражение по административно писмо.',q)
 .includes('COMPLAINT_MISATTRIBUTED_OS_ART2_REMEDY'));
assert.ok(worker.includes('complaintDraftIssues(finalDraft,lockedQualification)'),
 'Complaint-specific reviewer errors must reach the corrective loop');
assert.ok(worker.includes('complaintDraftIssues(candidate,lockedQualification)'),
 'Reviewer revision must be retested against complaint-specific errors');
console.log('KT134 COMPLAINT PROCEDURE: exact case/legal anchors, no new-IP route, four administrative sections, no hardcoded panel — PASS');
