// Package A V59.9 — reproducible boundary checks. Run: node --test tests/kt82-pdf1-v599.test.cjs
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../kt80/KT82_A_PDF1_V599.js'),'utf8');
const first=source.indexOf('function areaDecision(');
const end=source.indexOf('\nfunction bodyContent(',first);
assert.ok(first>=0&&end>first,'areaDecision exists');
const decision=new Function(source.slice(first,end)+'\nreturn areaDecision;')();
test('computed overlap and exact one-percent limit',()=>{
 const audit=[];
 assert.equal(decision(70,100,'ЗЗ','X','BG0000001',audit).effective,70);
 assert.equal(decision(101,100,'ЗЗ','X','BG0000001',audit).effective,100);
 assert.equal(audit.length,1);
 assert.equal(audit[0].raw_m2,101);
 assert.equal(audit[0].effective_m2,100);
 assert.throws(()=>decision(101.01,100,'ЗЗ','X','BG0000001',[]),/повече от 1/);
});
test('incomplete or invalid cadastral evidence is not converted into invented percentages',()=>{
 for(const [raw,parcel] of [[null,100],['',100],[-1,100],[42,0],[42,-1],[NaN,100]])
  assert.equal(decision(raw,parcel,'ЗЗ','X','BG0000001',[]).known,false);
});
test('verified ZZ area must not be silently replaced by PI MASTER archive area',()=>{
 assert.match(source,/const preciseArea=keys\(measure,'area_m2'\);/);
 assert.doesNotMatch(source,/keys\(measure,'area_m2'\)\s*\?\?\s*keys\(record/);
 assert.match(source,/При липса на измерена площ/);
});
test('asynchronous PDF1 generation is tied to active case and invalidated on replacement',()=>{
 assert.match(source,/caseCycleId=root\.KT80WorkflowState\?\.caseCycleId/);
 assert.match(source,/caseGeneration=root\.KT80WorkflowState\?\.generation/);
 assert.ok((source.match(/gen!==epoch\|\|!sameCase\(\)/g)||[]).length>=3);
 assert.match(source,/addEventListener\('kt80:case-change',reset\)/);
 assert.match(source,/addEventListener\('kt80:case-reset',reset\)/);
});
