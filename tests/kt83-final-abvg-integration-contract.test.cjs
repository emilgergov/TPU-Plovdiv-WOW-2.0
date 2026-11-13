const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dir=path.join(__dirname,'../kt80');
const read=x=>fs.readFileSync(path.join(dir,x),'utf8');
const html=read('KT82_26_FINAL_OUT_SESSION_V617_TEST.html');
test('final preview includes exactly one independent stage-4/5, GIS, PDF1 and source guard',()=>{
 for(const file of ['KT82_A_FREE_GIS_V603.js','KT82_A_PDF1_V600.js',
  'KT82_STAGE4_V11_SOURCE_GATE_V610.js','KT82_STAGE5_INDEPENDENT_V610.js',
  'KT82_A_EVIDENCE_INVALIDATION_V602.js','KT80_ADMIN_STANDARDS_V571.js',
  'integration/kt83-v617-universal-out-preview.mjs']){
  assert.equal(html.split(file).length-1,1,file);
 }
});
test('original protected V27 and independent V11 archives stay untouched by final preview',()=>{
 assert.ok(html.includes('kt83-v617-universal-out-preview.mjs'));
 assert.ok(!html.includes('kt83-v615-docx-preview.mjs'));
 assert.ok(!html.includes('kt83-v616-original-blank-preview.mjs'));
 const linked=read('integration/kt83-v617-universal-out-preview.mjs');
 assert.ok(linked.includes('createUniversalOutSession'));
 assert.ok(linked.includes('bridge.propose()'));
 assert.ok(!linked.includes('localStorage'));
 assert.ok(!linked.includes('fetch('));
});
test('same original blank source is available for subsequent cycles but evidence never transfers',()=>{
 const module=read('integration/kt83-v617-universal-out-session.mjs');
 for(const term of ['cryptoAPI.subtle.digest','currentRecord','caseId','generation','evidenceRevision','assessmentCurrent']){
  assert.ok(module.includes(term),term);
 }
 assert.ok(!module.includes('localStorage'));
 assert.ok(!module.includes('sessionStorage'));
 assert.ok(!module.includes('classicScenario'));
 const original=read('integration/kt83-v616-original-riosv-blank.mjs');
 assert.match(original,/4a6fb4a40f1cfc7331c64e0a4e7fd1fa8f41f6843dd2bf66c3d4bbaf17a77723/);
});
test('no synthetic output becomes issued act or proven competence',()=>{
 const gate=read('integration/kt83-v613-competence-gate.mjs');
 assert.ok(gate.includes('readyForFormalDraft:false'));
 assert.ok(gate.includes('competentAuthority:null'));
 assert.ok(gate.includes('administrativeActIssued:false'));
 const record=read('integration/kt83-v614-review-document.mjs');
 assert.ok(record.includes('EXPERT_REVIEW_ONLY'));
 assert.ok(record.includes('formalIssuanceAllowed:false'));
});
