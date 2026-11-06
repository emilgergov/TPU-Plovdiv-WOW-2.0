'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const dir='v26-test/v27-preview/';
const page=fs.readFileSync(dir+'KT76_08_FINAL_ACCEPTANCE_TEST.html','utf8');
const prior=fs.readFileSync(dir+'KT76_07_AB_GIS_INTEGRATION_TEST.html','utf8');
const qa=fs.readFileSync(dir+'kt76-05-unified-zip-qa.js','utf8');
assert(page.includes('kt76-05-unified-zip-qa.js?v=kt76-08-quality-1'));
assert(page.includes('KT7607GISEvidence.audit('));
assert(page.includes('KT7605UnifiedQA.verify(kt7606.blob'));
assert(prior.includes('kt76-05-unified-zip-qa.js?v=kt76-05-1'));
assert(qa.includes('Expert съдържа неправилния термин'));
for(const [i,m] of [...page.matchAll(/<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>/gi)].entries())
  if(m[1].trim())new vm.Script(m[1],{filename:'inline-'+i});
new vm.Script(qa,{filename:'kt76-05-unified-zip-qa.js'});
const phrase=/санкционн(?:ото|о|и|ия|ият)?\\s+третиране\\s+на\\s+отпадъчни\\s+води/iu;
assert(phrase.test('Санкционното третиране на отпадъчни води'));
assert(!phrase.test('Предвижда се пречистване на отпадъчните води.'));
console.log('KT76-08 PASS: isolated test route, original A/B GIS and ZIP gate, JS syntax, wastewater terminology quality guard');
