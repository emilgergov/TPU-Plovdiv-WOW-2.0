import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createReviewDocument,renderReviewHTML} from '../kt80/integration/kt83-v614-review-document.mjs';
const read=name=>readFileSync(new URL('../kt80/integration/'+name,import.meta.url),'utf8');
function draft(subject){
 return {schema:'KT80_STAGE5_INDEPENDENT_DRAFT_V01',subject,
  independentText:'Мотивирано предложение по доказателствата от преписката.\nИзисква се експертно потвърждение.',
  readyForFormalDraft:false,competentAuthority:null,tariff:null,sourceCoverageComplete:false,
  administrativeActIssued:false,requiresExpertAuthorization:true};
}
test('P4 creates different document titles on a single institutional template without Classic A/B',()=>{
 const subject='Потвърден предмет';
 const cases=['Искане за допълнителна информация','Искане за институционално становище',
  'Друг мотивиран административен документ'];
 for(const caseTitle of cases){
  const r=createReviewDocument({caseId:'CASE-EXAMPLE-001',generation:1,evidenceRevision:4,
   subject,proposal:draft(subject),caseTitle,recipient:'Тестов адресат',address:'Тестов адрес',
   referenceNumber:'ОВОС-XXXX/XX.XX.XXXX'});
  assert.equal(r.caseTitle,caseTitle);
  assert.equal(r.address,'Тестов адрес');
  assert.equal(r.signatures.length,2);
  assert.equal(r.signatures.every(s=>s.status==='НЕПОДПИСАНО'),true);
  assert.equal(r.formalIssuanceAllowed,false);
  assert.match(renderReviewHTML(r),new RegExp('Тестов адрес'));
 }
});
test('P4 refuses automatic official act and unsupported legal source coverage',()=>{
 const s='Предмет';
 assert.throws(()=>createReviewDocument({caseId:'CASE-EXAMPLE-001',generation:1,
  subject:s,proposal:{...draft(s),administrativeActIssued:true}}));
 assert.throws(()=>createReviewDocument({caseId:'CASE-EXAMPLE-001',generation:1,
  subject:s,proposal:{...draft(s),sourceCoverageComplete:true}}));
});
test('P4 uses the approved unchanged RIOSV institutional blank, its logo, footer and both signatures',()=>{
 const code=read('kt83-v616-original-riosv-blank.mjs');
 assert.match(code,/EXPECTED_SHA256='[a-f0-9]{64}'/);
 for(const p of ['word\/header3\.xml','word\/footer3\.xml','word\/media\/image1\.emf',
  'word\/media\/image2\.wmf','word\/media\/image3\.wmf'])
  assert.match(code,new RegExp(p));
 assert.match(code,/Verdana/);
 assert.match(code,/Първи електронен подпис: НЕПОДПИСАНО/);
 assert.match(code,/Втори електронен подпис: НЕПОДПИСАНО/);
 assert.match(code,/trimmed\(record\.caseTitle\)/);
 assert.match(code,/trimmed\(record\.address\)/);
});
test('P4 does not require per-OUT DOCX forms or allow old Classic to escape the V27.35 capsule',()=>{
 const ui=read('kt83-v617-universal-out-preview.mjs');
 assert.doesNotMatch(ui,/docxButton\.disabled=true/);
 assert.match(ui,/createUniversalOutSession/);
 assert.match(ui,/titleField\.id='kt83P4DocumentTitle'/);
 assert.match(ui,/\.\.\.docFields\(\)/);
 assert.doesNotMatch(ui,/KT83P4TemplateContract|KT83P4Dispatcher/);
 const html=readFileSync(new URL('../kt80/KT83_VT01_P1_AUTOMATIC_ROUTE_TEST.html',import.meta.url),'utf8');
 assert.doesNotMatch(html,/kt83-p4-out-template-contract\.js|kt83-p4-out-runtime\.js/);
});
test('P4 metadata change never discards the independent Stage 4 legal assessment',()=>{
 const ui=read('kt83-v617-universal-out-preview.mjs');
 assert.match(ui,/for\(const field of \[ruleInput,factInput\]\)field\.addEventListener\('input',clear\)/);
 assert.match(ui,/for\(const field of \[titleField,recipientField,addressField,referenceField\]\)/);
 assert.match(ui,/clearDocumentFields/);
});
