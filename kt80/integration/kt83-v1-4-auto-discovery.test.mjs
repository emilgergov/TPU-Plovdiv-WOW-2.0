import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {discoverLegalHypotheses, rulesFromDiscoveredHypotheses} from './kt83-v1-4-hypothesis-discovery.mjs';
import {verifiedReference} from './v11-trusted-source-registry.mjs';
import {assessStage4} from './stage4-independent-legal-engine.mjs';
import {stage4RequestFromKT80} from './kt80-v598-case-evidence-adapter.mjs';
const make=(subject,scope,type='INVESTMENT',confirmed=true)=>({
 schema:'KT80_V598_KT83_INPUT_ADAPTER_V01',
 confirmedSubject:confirmed?subject:null,scopeConfirmed:confirmed,
 scopeTextDraft:scope,dossierType:type,legalFacts:[]
});
const discover=(subject,scope,type)=>discoverLegalHypotheses(make(subject,scope,type));
test('сходен с ТЕСТ_2 предмет не води към предварителен чл.93',()=>{
 const d=discover('Автосервиз и склад','Сондаж и пътна връзка');
 assert.equal(d.status,'AWAITING_UNBIASED_NORMATIVE_MAPPING');
 assert.deepEqual(d.candidates,[]);
 assert.equal(d.caseDerivedRulesForbidden,true);
});
test('различна инвестиция също не получава фиксирана правна процедура',()=>{
 const d=discover('Разширяване на предприятие','Технологични дейности');
 assert.deepEqual(d.candidates,[]);
});
test('преписка за жалба няма предварително избрана процедура',()=>{
 const d=discover('Жалба за шум','Искане за административна проверка','COMPLAINT');
 assert.deepEqual(d.candidates,[]);
 assert.ok(d.nextAction.startsWith('Предложение:'));
});
test('информация от други преписки не подменя липсващ нормативен индекс',()=>{
 const d=discover('ИП за обект','Независим предмет');
 assert.equal(rulesFromDiscoveredHypotheses(d,verifiedReference).length,0);
});
test('дори при доказателства липсващо универсално правно съответствие не става член',()=>{
 const rec=make('ИП за нов обект','Изграждане на обект');
 rec.legalFacts.push({factId:'any',value:'true',sourceId:'dossier',sourceType:'Доказателство'});
 const d=discoverLegalHypotheses(rec);
 const a=assessStage4(stage4RequestFromKT80(rec,rulesFromDiscoveredHypotheses(d,verifiedReference)));
 assert.deepEqual(a.legalFindings,[]);
 assert.equal(a.readyForStage5Draft,false);
 assert.equal(a.eligibilityForStage5FinalAct,false);
 assert.ok(a.proposals.length>0);
});
test('непотвърден предмет не създава нормативно основание',()=>{
 const d=discoverLegalHypotheses(make('Тест','Описание','INVESTMENT',false));
 assert.equal(d.status,'NEEDS_CONFIRMATION');
 assert.deepEqual(d.candidates,[]);
});
test('правна хипотеза от външна тестова преписка се отхвърля',()=>{
 const d=discover('Независим предмет','Обхват');
 assert.throws(()=>rulesFromDiscoveredHypotheses({...d,candidates:[{registryId:'ZOOS_93'}]},verifiedReference));
});
test('няма фиксиран правен идентификатор в откриващия код',()=>{
 const src=readFileSync(new URL('./kt83-v1-4-hypothesis-discovery.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(src,/lookupVerifiedArticle\(['"]ZOOS_93['"]\)/);
 assert.doesNotMatch(src,/const FIELD_ID=['"]kt83_annex2/);
 assert.doesNotMatch(src,/registryId:\s*['"]ZOOS_93/);
});
test('не се замърсяват стабилните екрани',()=>{
 const original=readFileSync(new URL('../KT82_15_PACKAGE_A_V598_TEST.html',import.meta.url),'utf8');
 const pilot=readFileSync(new URL('../KT83_02_AUTOMATIC_LEGAL_HYPOTHESES_V14_TEST.html',import.meta.url),'utf8');
 assert.ok(!original.includes('kt83-v1-4-admin-auto-preview'));
 assert.ok(pilot.includes('kt83-v1-4-admin-auto-preview'));
});
test('няма автоматично издаване, няма процедура, няма фиксирана такса',()=>{
 const d=discover('Складова дейност','Водоснабдяване');
 assert.deepEqual(d.candidates,[]);
 assert.ok(!('procedure' in d));
 assert.ok(!('fee' in d));
 assert.ok(!('competentAuthority' in d));
});
