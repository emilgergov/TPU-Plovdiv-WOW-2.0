import test from 'node:test';
import assert from 'node:assert/strict';
import {auditExploratoryHypotheses} from './pni-hypothesis-auditor.mjs';
import {loadSnapshot,verifyIndependence} from './pni-gate.mjs';
import {verifiedReference} from '../integration/v11-trusted-source-registry.mjs';
const ref=verifiedReference('ZOOS_93');
const facts=[{sourceId:'доказателство-1',factId:'f1',value:'unknown',sourceType:'документ'},
             {sourceId:'доказателство-2',factId:'f2',value:'false',sourceType:'документ'}];
const candidate={id:'H1',question:'Проверява ли се възможна правна хипотеза?',reasoning:'Има текст, изискващ проверка, не автоматичен извод.',sourceType:'AI_DRAFT',
 supporting:[{legalReference:ref,evidenceSourceId:'доказателство-1'}],
 contrary:[{legalReference:ref,evidenceSourceId:'доказателство-2'}],
 alternatives:['Друга приложима хипотеза остава за проверка'],
 unknowns:['Обхват и изключения'],proposedChecks:['Независима проверка на правните предпоставки']
};
const run=(candidates=[candidate],subject='Неутрален предмет')=>auditExploratoryHypotheses({confirmedSubject:subject,scopeConfirmed:true,candidates,normalizedEvidence:facts});
test('свободната хипотеза се допуска само като изследователски проект',()=>{
 const x=run();
 assert.equal(x.status,'EXPLORATORY_REVIEW');
 assert.equal(x.findings[0].status,'НЕПОТВЪРДЕНА ПРАВНА ХИПОТЕЗА');
 assert.equal(x.findings[0].isLegallyEstablished,false);
 assert.equal(x.readyForStage5Draft,false);
 assert.equal(x.allowFormalProcedure,false);
});
test('AI и експерт имат еднаква нормативна проверка без фаворит',()=>{
 const a=run();
 const b=run([{...candidate,sourceType:'EXPERT_DRAFT'}]);
 assert.deepEqual(a.findings[0].issues,b.findings[0].issues);
 assert.deepEqual(a.findings[0].verifiedNormativeReferences,b.findings[0].verifiedNormativeReferences);
});
test('липсата на опровергаващи данни се маркира като проблем',()=>{
 const a=run([{...candidate,contrary:[]}]);
 assert.ok(a.findings[0].issues.some(x=>x.includes('опровергаващи основания')));
});
test('липсата на алтернативни хипотези се маркира като проблем',()=>{
 const a=run([{...candidate,alternatives:[]}]);
 assert.ok(a.findings[0].issues.some(x=>x.includes('конкуриращи')));
});
test('липсата на проверен нормативен източник се маркира',()=>{
 const a=run([{...candidate,supporting:[{evidenceSourceId:'доказателство-1',legalReference:{registryId:'ZOOS_93',article:'подменен'}}],contrary:[]}]);
 assert.ok(a.findings[0].issues.some(x=>x.includes('удостоверен правен източник')));
});
test('липсата на фактическо доказателство се маркира',()=>{
 const a=run([{...candidate,supporting:[{legalReference:ref,evidenceSourceId:'несъществуващ'}]}]);
 assert.ok(a.findings[0].issues.some(x=>x.includes('свързано доказателство')));
});
test('непознатият нормативен обхват не се обявява за доказан',()=>{
 const a=run();
 assert.ok(a.findings[0].issues.some(x=>x.includes('Пълнотата')));
});
test('не се допускат предварително избрана процедура и такса като параметри',()=>{
 for(const extra of [{preferredProcedure:'OVOS'}, {fee:'500'}, {priority:100},{score:0.99},{routeId:'07'}]){
  assert.throws(()=>run([{...candidate,...extra}]),/Недопустим изследователски вход/);
 }
});
test('непотвърден предмет не допуска изследователска правна преценка',()=>{
 const a=auditExploratoryHypotheses({confirmedSubject:'',scopeConfirmed:false,candidates:[candidate],normalizedEvidence:facts});
 assert.equal(a.status,'SUBJECT_UNCONFIRMED');assert.equal(a.readyForStage5Draft,false);
});
test('подмяната на преписка не предизвиква нормативен фаворит',()=>{
 const a=run([], 'Автосервиз и сондаж');
 const b=run([], 'Жалба за административно бездействие');
 assert.deepEqual(a.findings,b.findings);
 assert.equal(a.allowFormalProcedure,b.allowFormalProcedure);
 assert.ok(a.nextAction.startsWith('Предложение'));
});
test('всяка хипотеза има независими бележки, без класиране',()=>{
 const a=run([candidate,{...candidate,id:'H2',question:'Друга правна хипотеза'}]);
 assert.equal(a.findings.length,2);
 assert.ok(a.findings.every(f=>!('priority' in f)&&!('score' in f)&&!('preferredProcedure' in f)));
});
test('дублирани идентификатори се отхвърлят',()=>{
 assert.throws(()=>run([candidate,candidate]),/Повтаряща/);
});
test('ПНИ-v3 контролира и заключения одитор',()=>{
 const {manifest,sources}=loadSnapshot();
 assert.equal(verifyIndependence(manifest,sources).ok,true);
 assert.ok(manifest.normative_source_roots.includes('kt80/independence/pni-hypothesis-auditor.mjs'));
});
