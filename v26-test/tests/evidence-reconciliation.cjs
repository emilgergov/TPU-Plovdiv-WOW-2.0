const assert=require('node:assert/strict');
const E=require('../v26-dossier-evidence.js');
const docs=[
 {file:'old.pdf',date:'01.01.2025',facts:[{key:'wastewater_solution',value:'tank',verified:true}]},
 {file:'new.pdf',date:'02.02.2026',facts:[{key:'wastewater_solution',value:'sewer',verified:false}]}
];
let a=E.analyze(docs);
assert.equal(a.findings[0].status,'unresolved_unverified_change');
assert.equal(a.findings[0].selected,null);
assert.equal(a.requiresReview,true);
docs[1].facts[0].verified=true;
a=E.analyze(docs);
assert.equal(a.findings[0].status,'latest_documented_fact');
assert.equal(a.findings[0].selected.value,'sewer');
assert.equal(E.characterize(a).requiresReview,false);
console.log('V26 evidence reconciliation PASS');
