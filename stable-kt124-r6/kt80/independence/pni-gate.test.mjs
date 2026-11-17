import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSnapshot,verifyIndependence,normativeFingerprint,PROTECTED_SOURCES,gitBlobSha1} from './pni-gate.mjs';
import {discoverLegalHypotheses} from '../integration/kt83-v1-4-hypothesis-discovery.mjs';
const {manifest,sources}=loadSnapshot();
const verify=(m=manifest,s=sources)=>verifyIndependence(m,s);
const mutate=(path,mod)=>({...sources,[path]:mod(sources[path])});
const discovery='kt80/integration/kt83-v1-4-hypothesis-discovery.mjs';

test('ПНИ-A: текущият нормативен набор е заключен по Git blob отпечатъци',()=>{
 const r=verify();
 assert.equal(r.ok,true,JSON.stringify(r.errors));
 assert.equal(r.errors.length,0);
 assert.equal(r.coverage,'TECHNICAL_ISOLATION_NOT_LEGAL_COMPLETENESS');
 assert.equal(r.permitsAutomaticLegalConclusion,false);
});
test('ПНИ-A: промяната на тестови преписки не може да промени нормативния отпечатък',()=>{
 const before=normativeFingerprint(sources);
 const testDossier={name:'case-001',subject:'Различна технология'};
 const testDossier2={name:'case-843',subject:'Водоснабдяване'};
 assert.notDeepEqual(testDossier,testDossier2);
 assert.equal(normativeFingerprint(sources),before);
 const changedFixture={...sources,'kt80/fixtures/TEST-UNRELATED.json':JSON.stringify(testDossier2)};
 assert.equal(normativeFingerprint(changedFixture),before);
 assert.equal(verify(manifest,changedFixture).ok,true);
});
test('ПНИ-A: изменение на нормативен ред води до блокиране',()=>{
 const p=PROTECTED_SOURCES[2];
 const altered=mutate(p,old=>old+'\n// нерегламентирана промяна');
 const r=verify(manifest,altered);
 assert.equal(r.ok,false);
 assert.ok(r.errors.some(e=>e.code==='UNREVIEWED_NORMATIVE_CHANGE'));
 assert.notEqual(normativeFingerprint(altered),normativeFingerprint(sources));
});
test('ПНИ-A: само подмяна на отпечатъка в манифеста се открива',()=>{
 const m=structuredClone(manifest);
 m.expected_git_blob_sha1[PROTECTED_SOURCES[0]]='0'.repeat(40);
 assert.equal(verify(m).ok,false);
});
test('ПНИ-Б: специален член по подразбиране се блокира',()=>{
 const altered=mutate(discovery,src=>src+'\nconst chosen=lookupVerifiedArticle("ZOOS_93");\n');
 const r=verify(manifest,altered);
 assert.ok(r.errors.some(e=>e.code==='HIDDEN_ARTICLE_PRIORITY'));
});
test('ПНИ-Б: текстов тематичен shortcut се блокира',()=>{
 const altered=mutate(discovery,src=>src+'\nconst detectors=[];\n');
 const r=verify(manifest,altered);
 assert.ok(r.errors.some(e=>e.code==='HIDDEN_ARTICLE_PRIORITY'));
});
test('ПНИ-Б: внос на тестова преписка в нормативен код се блокира',()=>{
 const altered=mutate(discovery,src=>src+'\nimport data from "../fixtures/case-01.json";\n');
 const r=verify(manifest,altered);
 assert.ok(r.errors.some(e=>e.code==='DEPENDENCY_POLLUTION'));
});
test('ПНИ-В: реалистично заглавие не създава правна хипотеза',()=>{
 for(const [subject,scope,type] of [
  ['Склад, автосервиз, административна част','Сондаж и транспортна връзка','INVESTMENT'],
  ['Дейност с отпадъци','Разширяване на обект','INVESTMENT'],
  ['Постъпила жалба','Искане за произнасяне','COMPLAINT'],
  ['Различна производствена технология','Ново оборудване','INVESTMENT']
 ]){
  const r=discoverLegalHypotheses({schema:'KT80_V598_KT83_INPUT_ADAPTER_V01',
   confirmedSubject:subject,scopeConfirmed:true,scopeTextDraft:scope,dossierType:type});
  assert.deepEqual(r.candidates,[],subject);
  assert.equal(r.status,'AWAITING_UNBIASED_NORMATIVE_MAPPING');
 }
});
test('ПНИ-В: недоказан и непотвърден предмет не са автоматично приложимо основание',()=>{
 const r=discoverLegalHypotheses({schema:'KT80_V598_KT83_INPUT_ADAPTER_V01',
 confirmedSubject:null,scopeConfirmed:false,scopeTextDraft:'Проект'});
 assert.equal(r.status,'NEEDS_CONFIRMATION');
 assert.deepEqual(r.candidates,[]);
});
test('ПНИ-Г: манифестът не допуска включване на автоматично решение',()=>{
 const m=structuredClone(manifest);m.auto_applicability_enabled=true;
 const r=verify(m);
 assert.ok(r.errors.some(e=>e.code==='UNAPPROVED_ACTIVATION'));
});
test('ПНИ-Д: променена версия или отпечатък на V11 блокират проверката',()=>{
 const m=structuredClone(manifest);m.archive_sha256='1'.repeat(64);
 assert.ok(verify(m).errors.some(e=>e.code==='MASTER_HASH'));
});
test('ПНИ: няма нищо внесено от текстовете на примерни преписки в нормативния списък',()=>{
 assert.ok(PROTECTED_SOURCES.every(p=>/^kt80\/(?:integration|independence)\/.+\.mjs$/.test(p)));
 assert.equal(Object.keys(manifest.expected_git_blob_sha1).length,PROTECTED_SOURCES.length);
 assert.ok(PROTECTED_SOURCES.every(p=>gitBlobSha1(sources[p])===manifest.expected_git_blob_sha1[p]));
});
