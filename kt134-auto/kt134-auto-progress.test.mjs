import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutoProgress} from './kt134-auto-progress.mjs';

const proof=(phase,extra={})=>({verified:true,source:'protected-worker',eventId:'verified-'+phase,
 subtitle:'Завършен анализ на Етап '+phase,...extra});

test('five stages advance on real verified events and emit subtitles',()=>{
 const events=[];
 const tracker=createAutoProgress({caseId:'EG-2026-000015',onChange:x=>events.push(x)});
 tracker.start(1,'Приемане на документите');
 for(let i=1;i<=5;i++){
  if(i>1)tracker.start(i,'Обработка на етап '+i);
  tracker.complete(i,proof(i));
 }
 const final=tracker.snapshot();
 assert.deepEqual(final.steps.map(x=>x.status),Array(5).fill('completed'));
 assert.equal(final.steps[4].subtitle,'Завършен анализ на Етап 5');
 assert.equal(final.lastEvent.phase,5);
 assert.ok(events.length>=11);
});
test('a progress bar cannot mark a stage complete without proof',()=>{
 const t=createAutoProgress({caseId:'EG-1'});
 assert.throws(()=>t.complete(1,{verified:false,eventId:'x',source:'server'}),/реално потвърдено/);
 assert.throws(()=>t.complete(1,{verified:true,eventId:'x',source:''}),/произход/);
});
test('no later stage completion without prior verified stages',()=>{
 const t=createAutoProgress({caseId:'EG-1'});
 assert.throws(()=>t.complete(4,proof(4)),/Предходните етапи/);
});
test('non-applicable GIS must be explicitly verified, not silently skipped',()=>{
 const t=createAutoProgress({caseId:'EG-1'});
 t.complete(1,proof(1));t.complete(2,proof(2));
 t.complete(3,proof(3,{notApplicable:true,subtitle:'ГИС неприложим — жалба'}));
 assert.equal(t.snapshot().steps[2].status,'not_applicable');
 t.complete(4,proof(4));
 assert.equal(t.snapshot().steps[3].status,'completed');
});
test('duplicate event identifiers are rejected',()=>{
 const t=createAutoProgress({caseId:'EG-1'});t.complete(1,proof(1));
 assert.throws(()=>t.complete(1,proof(1)),/Повторено/);
});
test('confirmed progress cannot be overwritten by a new animated status',()=>{
 const t=createAutoProgress({caseId:'EG-1'});t.complete(1,proof(1));
 assert.throws(()=>t.start(1,'Повторен старт'),/не се променя/);
});
test('issues are visible without falsely marking completion',()=>{
 const t=createAutoProgress({caseId:'EG-1'});
 t.issue(1,'Нееднозначен водещ документ');
 assert.equal(t.snapshot().steps[0].status,'issue');
 assert.equal(t.snapshot().steps[0].subtitle,'Нееднозначен водещ документ');
});
