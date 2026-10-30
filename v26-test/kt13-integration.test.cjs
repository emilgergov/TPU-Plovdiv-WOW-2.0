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
const outside=build({...args,determination:{scenario:'А',zones:[]}});
assert.equal(outside.scenario,'А');
assert.equal(outside.zones.length,0);
const zoneObject=build({...args,determination:{scenario:'Б',zones:[{code:'BG0000001',name:'Тестова зона'}]}});
assert.equal(zoneObject.zones[0],'BG0000001');
assert(read('v26-template-word.js').includes('metadata={...metadata,subject:normalizedSubject}'),'Classic Word must not mutate immutable shared metadata');
assert.throws(()=>build({...args,paragraphs:['','','','']}),/четирите/);
assert.throws(()=>build({...args,results:[{input:'bad-id'}],roles:{'bad-id':'leading'},metadata:{...args.metadata,parcelIds:'bad-id'}}),/идентификатор/);
const pkg=read('v26-draft-package.js'),html=read('index.html'),word=read('v26-expert-word.js');
for(const token of ['V26ExpertDraft?.build','V26ExpertWord.make','V26TemplateWord.make','01_Proekt_na_stanovishte_Klasicheski.docx','02_Proekt_na_stanovishte_Eksperten.docx','03_Prilozhenie_1_GIS_analiz.pdf','04_Prilozhenie_2_Normativni_i_dokumentalni_referencii.pdf'])assert(pkg.includes(token),'ZIP integration missing: '+token);
for(const token of ['v26-expert-draft.js','v26-expert-word.js','v26-draft-package.js','Приложение №1 — ГИС анализ','Приложение №2 — Нормативни и документални референции'])assert(html.includes(token),'UI integration missing: '+token);
for(const token of ['header','footer','media','Място за електронен подпис — вътрешно съгласуване','Място за електронен подпис — окончателно подписване','Приложение №1 — ГИС анализ'])assert(word.includes(token),'DOCX invariant missing: '+token);
assert(word.includes("paragraph(doc,'Място за електронен подпис — вътрешно съгласуване')"),'Expert opening signature slot missing');
assert(word.includes("paragraph(doc,'Място за електронен подпис — окончателно подписване')"),'Expert closing signature slot missing');
assert(word.includes('sect.cloneNode(true)'),'Original section/header/footer references must be preserved');
assert(pkg.includes("if(includeAnnex2){"),'Annex 2 must remain optional');
assert(pkg.includes("await window.V26ExpertWord.make(expertDraft)")&&pkg.includes("window.V26TemplateWord.make(expertDraft.scenario,expertDraft.characterization,expertDraft.metadata)"),'Both Word documents must use the same expert draft');
for(const name of ['v26-expert-draft.js','v26-expert-word.js','v26-draft-package.js','v26-template-word.js','v26-word-review.js'])new vm.Script(read(name),{filename:name});
const review=read('v26-word-review.js');
assert(review.includes('function autoEvidence()'),'Evidence-derived Word descriptions must remain available');
assert(review.includes('const auto=autoEvidence();'),'Word review must consult existing dossier evidence');
assert(review.includes("panel.hidden=false;panel.open=true"),'Missing evidence must reveal expert review');
assert(html.includes("window.V26WordReview.getWorkingDraft()"),'Working ZIP must use evidence-derived draft');
assert(html.indexOf("window.V26WordReview.getWorkingDraft()")<html.indexOf("if(!window.confirm('Да се създаде РАБОТЕН ZIP"),'Working draft must be assembled before ZIP confirmation');
assert(html.includes('ГИС анализ · PDF')&&html.includes('Нормативни референции · PDF')&&html.includes('Изготви проектите · Word'),'KT14 short UI labels must be retained');
assert(pkg.includes("classicWord===expertWord"),'ZIP must reject identical Word outputs');
assert(word.includes("slice(0,scenario==='A'?5:7)"),'Expert Word must select 5/7 legal findings from GIS scenario');
assert(pkg.includes("paragraphPrefixes"),'Word scenario paragraph prefixes must be normalized before packaging');
assert(read('v26-word-review.js').includes('getWorkingDraft'),'Draft must not require manual legal form');
assert(word.includes('РАБОТЕН ЕКСПЕРТЕН ПРОЕКТ'),'Expert document must be marked as draft');
console.log('KT14 shared model and cross-module static integration: PASS');
