import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reviewIndependently} from './pni-independent-review.mjs';
import {APPROVED_CONDITIONS, UNREVIEWED_COVERAGE, LEGAL_DOMAINS} from './pni-normative-conditions.mjs';
import {loadSnapshot,verifyIndependence,normativeFingerprint} from './pni-gate.mjs';
const evidence=[{factId:'activity',value:'true',sourceId:'in-01',sourceType:'Преписка',sourceLocation:'стр. 1'}];
const caseInput=(subject='Склад, сондаж и автосервиз',facts=evidence)=>({confirmedSubject:subject,scopeConfirmed:true,evidence:facts});
test('ПНИ-2: няма неприети правни предпоставки или привилегирован нормативен домейн',()=>{
 assert.deepEqual(APPROVED_CONDITIONS,[]);
 assert.deepEqual(LEGAL_DOMAINS,[]);
 assert.equal(UNREVIEWED_COVERAGE.statutesExhaustivelyMapped,false);
 assert.equal(UNREVIEWED_COVERAGE.reviewedByQualifiedExpert,false);
});
test('ПНИ-2: реална преписка със смесени дейности не поражда член или процедура',()=>{
 const output=reviewIndependently(caseInput());
 assert.deepEqual(output.legalFindings,[]);
 assert.equal(output.readyForStage5Draft,false);
 assert.equal(output.eligibilityForStage5FinalAct,false);
 assert.equal(output.normativeCoverageComplete,false);
 assert.ok(output.proposals.some(x=>x.startsWith('Предложение:')));
});
test('ПНИ-2: друга преписка с различен предмет получава същите нулеви правни правила',()=>{
 const a=reviewIndependently(caseInput());
 const b=reviewIndependently(caseInput('Жалба за шум'));
 assert.deepEqual(a.legalFindings,b.legalFindings);
 assert.equal(a.normativeCoverageComplete,b.normativeCoverageComplete);
});
test('ПНИ-2: опит за приоритизиране на чл. 93 от преписка се отхвърля',()=>{
 assert.throws(()=>reviewIndependently({...caseInput(),rules:[
  {id:'favourite',registryId:'ZOOS_93',condition:{fact:'activity'}}]}),/Невалиден канал/);
});
test('ПНИ-2: опит за подаване на процедура, маршрут или компетентност се отхвърля',()=>{
 for(const injected of [
  {preferredProcedure:'SCREENING'}, {routeId:'07'}, {legalBasis:'ZOOS_93'},
  {competentAuthority:'РИОСВ'}, {fee:{bgnAmount:'500.00'}},{priorTestResult:'ТЕСТ_2'}
 ])assert.throws(()=>reviewIndependently({...caseInput(),...injected}),/Невалиден канал/);
});
test('ПНИ-2: подмяна на тестови доказателства не променя нормативната логика',()=>{
 const {sources}=loadSnapshot();
 const original=normativeFingerprint(sources);
 for(const value of ['true','false','unknown','conflict']){
  const answer=reviewIndependently(caseInput('Различен предмет',[{...evidence[0],value}]));
  assert.deepEqual(answer.legalFindings,[]);
  assert.equal(answer.normativeCoverageComplete,false);
  assert.equal(normativeFingerprint(sources),original);
 }
});
test('ПНИ-2: дори конфликтни източници не пораждат автоматична процедура',()=>{
 const answer=reviewIndependently(caseInput('Реконструкция',[...evidence,{...evidence[0],value:'false',sourceId:'in-02'}]));
 assert.equal(answer.readyForStage5Draft,false);
 assert.equal(answer.evidence.activity.value,'conflict');
});
test('ПНИ-2: липсващ предмет и обхват пораждат предложение, не правен извод',()=>{
 const answer=reviewIndependently({confirmedSubject:'',scopeConfirmed:false,evidence:[]});
 assert.equal(answer.readyForStage5Draft,false);
 assert.ok(answer.proposals.length>0);
});
test('ПНИ-2: манифестът защитава и новите два модула',()=>{
 const {manifest,sources}=loadSnapshot();
 assert.equal(verifyIndependence(manifest,sources).ok,true);
 assert.ok(manifest.normative_source_roots.includes('kt80/independence/pni-independent-review.mjs'));
 assert.ok(manifest.normative_source_roots.includes('kt80/independence/pni-normative-conditions.mjs'));
});
test('ПНИ-2: добавяне на неоправдана правна предпоставка блокира CI защитата',()=>{
 const {manifest,sources}=loadSnapshot();
 const p='kt80/independence/pni-normative-conditions.mjs';
 const amended={...sources,[p]:sources[p].replace('APPROVED_CONDITIONS = Object.freeze([])','APPROVED_CONDITIONS = Object.freeze([{id:"ZOOS_93"}])')};
 const v=verifyIndependence(manifest,amended);
 assert.equal(v.ok,false);
 assert.ok(v.errors.some(x=>x.code==='UNREVIEWED_RULE_GRAPH'));
});
test('ПНИ-2: опит за обявяване на непроверена пълнота блокира защитата',()=>{
 const {manifest,sources}=loadSnapshot();
 const p='kt80/independence/pni-normative-conditions.mjs';
 const amended={...sources,[p]:sources[p].replace('statutesExhaustivelyMapped: false','statutesExhaustivelyMapped: true')};
 const v=verifyIndependence(manifest,amended);
 assert.ok(v.errors.some(x=>x.code==='FORGED_COVERAGE'));
});
test('ПНИ-2: забрана за въвеждане на допълнителни параметри се следи',()=>{
 const {manifest,sources}=loadSnapshot();
 const p='kt80/independence/pni-independent-review.mjs';
 const amended={...sources,[p]:sources[p].replace("exact(data,['confirmedSubject','scopeConfirmed','evidence'])","// removed guard")};
 const v=verifyIndependence(manifest,amended);
 assert.ok(v.errors.some(x=>x.code==='CASE_RULE_INJECTION'));
});
test('ПНИ-2: официалният V11 остава единствен нормативен MASTER',()=>{
 const {manifest}=loadSnapshot();
 assert.equal(manifest.archive_sha256,'8d3851affd72fb44b4d663920196e00ec317c8e45d36fc16c6ad6b0ce965226c');
 assert.equal(manifest.auto_applicability_enabled,false);
});
