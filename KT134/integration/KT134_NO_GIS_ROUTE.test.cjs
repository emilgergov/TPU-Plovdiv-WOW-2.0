'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
function load(name){const src=fs.readFileSync(path.join(root,name),'utf8');const ctx={module:{exports:{}},window:{}};vm.runInNewContext(src,ctx);return ctx.module.exports}
const routeApi=load('vt03/kt80/integration/kt83-vt01-automatic-route-p1.js');
const spatial=load('KT134/integration/KT134_SPATIAL_GATE_CONSISTENCY.js');
const C={caseId:'CASE_17',generation:3,evidenceRevision:6};
const route=routeApi.coordinator({current:()=>C});
let count=0;
function test(name,truth){assert.equal(Boolean(truth),true,name);console.log('PASS '+name);count++}
test('confirm subject and scope',route.start({subject:true,scope:true}).ok);
test('spatial PDF1 gate rejects explicitly unnecessary GIS',spatial.check({...C,gisDecision:'NOT_REQUIRED'}).code==='GIS_NOT_REQUIRED');
test('cannot bypass GIS without expert authorization',!route.advance('evidence',{...C,verified:true,gisNotRequired:true,reason:'Жалба',expertConfirmed:false}).ok);
test('cannot bypass GIS without a reason',!route.advance('evidence',{...C,verified:true,gisNotRequired:true,expertConfirmed:true}).ok);
test('expert-confirmed no-GIS route advances',route.advance('evidence',{...C,verified:true,gisNotRequired:true,reason:'Жалба или възражение',expertConfirmed:true}).ok);
test('normative assessment remains mandatory',route.advance('normative_v11',{...C,verified:true}).ok);
test('cannot omit motivated legal assessment',!route.advance('motivated_proposal',{...C,verified:true}).ok);
test('legal assessment advances',route.advance('motivated_proposal',{...C,verified:true,reasonedAssessment:'Обработка на възражение'}).ok);
test('cannot omit motivated proposal',!route.advance('out_draft',{...C,verified:true}).ok);
test('motivated proposal advances to draft',route.advance('out_draft',{...C,verified:true,motivatedProposal:'Предложение за проверка на панел №17'}).ok);
test('draft is unsigned, for review only',route.complete({...C,verified:true}).ok&&route.snapshot().status==='ПРОЕКТ ЗА ПРЕГЛЕД');
console.log('KT134: no-GIS contextual route '+count+'/'+count+' (panel17 UI binding is not asserted)');
