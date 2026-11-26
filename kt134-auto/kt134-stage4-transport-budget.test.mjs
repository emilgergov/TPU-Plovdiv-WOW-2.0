import test from 'node:test';import assert from 'node:assert/strict';
import {limitKt134Stage4Payload as fit} from './kt134-stage4-transport-budget.mjs';
const size=v=>new TextEncoder().encode(JSON.stringify(v)).byteLength;
const mk=(n=12)=>({task:'draft_normative_proposal',caseId:'example',scope:'Проверка',
 evidence:[{sourceId:'first',value:'Действително потвърден факт'}],
 completeCaseEvidence:{sourceTexts:Array.from({length:n},(_,i)=>({
  source:'source-'+i,fileName:'Документ '+i+'.pdf',
  text:'НАЧАЛО '+i+' '+ 'А'.repeat(11900)+' КРАЙ '+i
 }))}});
test('small Stage4 evidence is unchanged',()=>{const x=mk(1);assert.equal(fit(x),x)});
test('large case sends all named documents as flagged partial excerpts within EG limit',()=>{
 const x=fit(mk(20));assert.ok(size(x)<=96000);
 assert.equal(x.completeCaseEvidence.sourceTexts.length,20);
 assert.equal(x.completeCaseEvidence.sourceTextTruncated,true);
 assert.ok(x.completeCaseEvidence.sourceTexts.every(d=>d.excerptOnly===true));
 assert.ok(x.completeCaseEvidence.sourceTexts.every(d=>d.text.includes('НАЧАЛО')&&d.text.includes('КРАЙ')));
 assert.equal(x.evidence[0].value,'Действително потвърден факт');
});
test('never silently drop document identities or change original bundle',()=>{
 const v=mk(9);const original=v.completeCaseEvidence.sourceTexts[0].text;
 const x=fit(v);assert.equal(v.completeCaseEvidence.sourceTexts[0].text,original);
 assert.deepEqual(x.completeCaseEvidence.sourceTexts.map(d=>d.source),
   v.completeCaseEvidence.sourceTexts.map(d=>d.source));
});
test('impossible evidence budget errors instead of faking a complete dossier',()=>{
 const x=mk(200);
 assert.throws(()=>fit(x,{maxBytes:9000}),/EG_STAGE4_EVIDENCE_TOO_LARGE/);
});
