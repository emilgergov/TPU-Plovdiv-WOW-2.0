/* KT13 integrated contract test: run with node (no browser, no network).
   Protects the shared model and cross-module ZIP wiring. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=name=>fs.readFileSync('v26-test/'+name,'utf8');
const sandbox={window:{}};vm.runInNewContext(read('v26-expert-draft.js'),sandbox);
const build=sandbox.window.V26ExpertDraft.build;
const args={
 results:[{input:'36676.129.457'}],roles:{'36676.129.457':'leading'},
 determination:{scenario:'Б',zones:['BG0000001']},
 metadata:{parcelIds:'36676.129.457',recipient:'Адресат',address:'Адрес',subject:'Предмет',incomingReference:'№1',salutation:'Уважаеми',legalParagraphs:Array(7).fill('Потвърдена констатация'),procedureFinding:'Проверена процедура',impactFindings:Array(5).fill('Проверено въздействие')},
 paragraphs:['С реализацията на ИП','Електроснабдяването','Водозахранването','Отпадъчните води'],evidence:{findings:[{}],warnings:[]}
};
const d=build(args);
assert.equal(d.scenario,'Б');assert.equal(d.parcels[0].id,'36676.129.457');
assert.equal(d.evidence.findingsCount,1);assert(Object.isFrozen(d));
assert.throws(()=>build({...args,metadata:{...args.metadata,parcelIds:'99999.999.9999'}}),/несъответствие/);
assert.throws(()=>build({...args,determination:{scenario:'Б',zones:[]}}),/сценарий Б/);
assert.throws(()=>build({...args,roles:{}}),/роля/);
const pkg=read('v26-draft-package.js'),html=read('index.html'),word=read('v26-expert-word.js');
for(const token of ['V26ExpertDraft?.build','V26ExpertWord.make','V26TemplateWord.make','01_Proekt_na_stanovishte_Klasicheski.docx','02_Proekt_na_stanovishte_Eksperten.docx','03_Prilozhenie_1_GIS_analiz.pdf','04_Prilozhenie_2_Normativni_i_dokumentalni_referencii.pdf'])assert(pkg.includes(token),'ZIP integration missing: '+token);
for(const token of ['v26-expert-draft.js','v26-expert-word.js','v26-draft-package.js','Приложение №1 — ГИС анализ','Приложение №2 — Нормативни и документални референции'])assert(html.includes(token),'UI integration missing: '+token);
for(const token of ['header','footer','media','signatureIndices','Приложение №1 — ГИС анализ'])assert(word.includes(token),'DOCX invariant missing: '+token);
for(const name of ['v26-expert-draft.js','v26-expert-word.js','v26-draft-package.js','v26-template-word.js','v26-word-review.js'])new vm.Script(read(name),{filename:name});
console.log('KT13 shared model and cross-module static integration: PASS');
