import assert from 'node:assert/strict';
import {inspectProposal} from './kt134-content-acceptance.mjs';
const supplied={
 sourceDocuments:[{id:'TEST-NOTICE-01',filename:'ТЕСТ-Уведомление.pdf'}],
 gisEvidence:{sourceId:'TEST-GIS-PDF1-01'},
 legalTests:[
 {name:'ЗООС приложение 1',status:'неопределена',reason:'Не е направена проверима съпоставка.'},
 {name:'ЗООС приложение 2',status:'неопределена',reason:'Не е направена проверима съпоставка.'}
 ],
 reviewer:{corrections:'Коригиран проект с конкретни факти',recommendation:'Проверимо следващо действие'}
};
const rejected=inspectProposal('ПРЕДМЕТ И ОБХВАТ. TEST-PDF1-NONREAL. ГИС. Правни предпоставки. Изходящ административен акт или категоричен процедурен извод не се предлага.',supplied);
assert.equal(rejected.acceptable,false);
assert.ok(rejected.issues.some(x=>x.code==='TEST_METADATA_LEAK'));
assert.ok(rejected.issues.some(x=>x.code==='THIN_DRAFT'));
assert.equal(rejected.reviewerMayProceed,true);
const missing=inspectProposal('Предмет, обхват, местоположение, ГИС, правна преценка: предлага се проверка по компетентност.');
assert.ok(missing.issues.some(x=>x.code==='DOSSIER_PROVENANCE_MISSING'));
assert.ok(missing.issues.some(x=>x.code==='GIS_PROVENANCE_MISSING'));
assert.ok(missing.issues.some(x=>x.code==='LEGAL_TESTS_MISSING'));
const badReviewer=inspectProposal('Предмет, обхват, местоположение, ГИС, правна преценка: предлага се проверка по компетентност.',{...supplied,reviewer:{}});
assert.ok(badReviewer.issues.some(x=>x.code==='REVIEWER_NO_CORRECTIVE_PROPOSAL'));
console.log('KT134: content diagnostic regression checks passed');
