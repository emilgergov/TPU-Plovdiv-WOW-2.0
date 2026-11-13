import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {discoverLegalHypotheses,rulesFromDiscoveredHypotheses} from './kt83-v1-4-hypothesis-discovery.mjs';
import {verifiedReference} from './v11-trusted-source-registry.mjs';
import {assessStage4} from './stage4-independent-legal-engine.mjs';
import {stage4RequestFromKT80} from './kt80-v598-case-evidence-adapter.mjs';

const record=(subject,scope,type='INVESTMENT',approved=true)=>({
 schema:'KT80_V598_KT83_INPUT_ADAPTER_V01',
 confirmedSubject:approved?subject:null,
 scopeConfirmed:approved,
 scopeTextDraft:scope,
 dossierType:type,
 legalFacts:[],
});
const result=(subject,scope,type)=>discoverLegalHypotheses(record(subject,scope,type));
test('сам открива само кандидат, а не установена приложимост',()=>{
 const d=result('Склад и автосервиз','Сондаж за водовземане и пътен достъп');
 assert.equal(d.status,'CANDIDATE_ONLY');
 assert.deepEqual(d.candidates.map(c=>c.registryId),['ZOOS_93']);
 assert.equal(d.candidates[0].evidenceStatus,'unknown');
 assert.equal(d.candidates[0].legalReviewOnly,true);
 assert.ok(d.candidates[0].signals.includes('водовземане'));
});
test('реален предмет със смесени компоненти дава една правна проверка, не четири процедури',()=>{
 const d=result('Автосервиз и склад','Търговска и административна част, сондаж, ПУП и пътна връзка');
 assert.equal(d.candidates.length,1);
 assert.ok(d.candidates[0].missingPrerequisites.length>=3);
});
test('всички хипотези се извличат от проверения V11 индекс',()=>{
 const d=result('Строителство','Реконструкция');
 const rules=rulesFromDiscoveredHypotheses(d,verifiedReference);
 assert.equal(rules.length,1);
 assert.equal(rules[0].legalBasis.registryId,'ZOOS_93');
 assert.equal(rules[0].condition.fact,'kt83_annex2_screening_applicability');
});
test('при липса на доказателства чл.93 е само неопределен, никога положителен',()=>{
 const rec=record('Складова база','Автосервиз, сондаж');
 const d=discoverLegalHypotheses(rec);
 const a=assessStage4(stage4RequestFromKT80(rec,rulesFromDiscoveredHypotheses(d,verifiedReference)));
 assert.equal(a.legalFindings[0].state,'undetermined');
 assert.equal(a.readyForStage5Draft,false);
 assert.equal(a.eligibilityForStage5FinalAct,false);
 assert.ok(a.proposals.some(x=>x.includes('Предложение')));
});
test('непотвърден предмет не произвежда правно основание',()=>{
 const d=discoverLegalHypotheses(record('Склад','Сондаж','INVESTMENT',false));
 assert.equal(d.status,'NEEDS_CONFIRMATION');
 assert.equal(d.candidates.length,0);
});
test('неинвестиционна преписка не се насочва автоматично към ОВОС',()=>{
 const d=result('Жалба за шум','Искане за проверка','COMPLAINT');
 assert.equal(d.candidates.length,0);
 assert.equal(d.status,'INSUFFICIENT_ARCHIVE_COVERAGE');
 assert.ok(d.nextAction.startsWith('Предложение:'));
});
test('няма измислена правна хипотеза при непълен архив',()=>{
 const d=result('Кореспонденция','Административен отговор','CORRESPONDENCE');
 assert.equal(rulesFromDiscoveredHypotheses(d,verifiedReference).length,0);
});
test('няма автоматична такса или компетентен орган от думи в заглавието',()=>{
 const d=result('Автосервиз и сондаж','Услуги');
 assert.ok(d.candidates.every(c=>!('fee' in c) && !('competentAuthority' in c)));
});
test('съществуващите административни страници остават отделени',()=>{
 const baseline=readFileSync(new URL('../KT82_15_PACKAGE_A_V598_TEST.html',import.meta.url),'utf8');
 const v13=readFileSync(new URL('../KT83_01_INDEPENDENT_STAGE4_STAGE5_V13_TEST.html',import.meta.url),'utf8');
 const v14=readFileSync(new URL('../KT83_02_AUTOMATIC_LEGAL_HYPOTHESES_V14_TEST.html',import.meta.url),'utf8');
 assert.ok(!baseline.includes('kt83-v1-4-admin-auto-preview'));
 assert.ok(!v13.includes('kt83-v1-4-admin-auto-preview'));
 assert.ok(v14.includes('kt83-v1-4-admin-auto-preview'));
 assert.ok(v14.includes('kt80SubjectText'));
 assert.ok(v14.includes('kt80ScopeText'));
});
test('интерфейсът предлага автоматичен анализ, без избор на член',()=>{
 const s=readFileSync(new URL('./kt83-v1-4-admin-auto-preview.mjs',import.meta.url),'utf8');
 assert.ok(s.includes('discoverLegalHypotheses(rec)'));
 assert.ok(s.includes('rulesFromDiscoveredHypotheses(discovery,verifiedReference)'));
 assert.ok(s.includes('reference.disabled=true'));
 assert.ok(s.includes("if(e.detail?.step===4 && !state.lastStage4)stage4()"));
 assert.ok(!s.includes("if(!refId) throw new Error('Избери конкретна правна хипотеза"));
});
