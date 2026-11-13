// KT82/KT83 Package A V60.0: regression contract. Run: node --test tests/kt82-package-a-v600.test.cjs
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=x=>fs.readFileSync(path.join(__dirname,'../kt80',x),'utf8');
const pdf=read('KT82_A_PDF1_V600.js');
const stage3=read('KT82_STAGE3_CONSOLIDATED_V600.js');
const stage4=read('KT82_STAGE4_NORMATIVE_BRIDGE_V600.js');
const html=read('KT82_17_PACKAGE_A_V600_TEST.html');
test('all integrated scripts parse and references exist',()=>{
 for(const [name,s] of [['PDF1',pdf],['Stage 3',stage3],['Stage 4',stage4]]){
  assert.doesNotThrow(()=>new Function(s),name);
 }
 for(const file of ['KT82_A_PDF1_V600.js','KT82_STAGE3_CONSOLIDATED_V600.js','KT82_STAGE4_NORMATIVE_BRIDGE_V600.js'])
  assert.ok(html.includes(file),file);
});
test('PDF1 completion is an individual case bound receipt',()=>{
 assert.match(pdf,/kt82:pdf1-completed/);
 for(const v of ['caseId:caseCycleId','generation:caseGeneration','source:live','evidenceRevision:','ids:Object.freeze','blob.size'])
  assert.ok(pdf.includes(v),v);
 assert.match(pdf,/gen!==epoch\|\|!sameCase\(\)/);
 assert.match(pdf,/kt80:case-change/);
});
test('Stage 4 uses source-matched receipt rather than string messages',()=>{
 assert.match(stage4,/addEventListener\('kt82:pdf1-completed',pdfReceipt\)/);
 assert.match(stage4,/receipt\.source===live/);
 assert.match(stage4,/receipt\.caseId===workflow\.caseCycleId/);
 assert.match(stage4,/receipt\.generation===workflow\.generation/);
 assert.match(stage4,/pdf\.evidenceRevision===/);
 assert.doesNotMatch(stage4,/MutationObserver\(pdfMonitor\)/);
 for(const event of ['kt80:case-change','kt80:case-reset','kt82:evidence-invalidated'])
  assert.ok(stage4.includes(event),event);
});
test('Stage 3 ignores asynchronous completions after changing dossier',()=>{
 assert.match(stage3,/caseId!==(root\.KT80WorkflowState\?\.caseCycleId\|\|null)/);
 assert.match(stage3,/caseGeneration!==(root\.KT80WorkflowState\?\.generation\?\?null)/);
 assert.match(stage3,/addEventListener\('kt80:case-change'/);
});
test('no change to archival ZZ proof and 1% numeric guard',()=>{
 assert.match(pdf,/const preciseArea=keys\(measure,'area_m2'\)/);
 assert.match(pdf,/if\(exceed>1\+1e-10\)/);
});
