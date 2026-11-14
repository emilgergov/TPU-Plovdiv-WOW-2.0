'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const path=require('node:path');
const {next}=require('../kt80/integration/kt83-p5-single-route.js');
const caseInfo={caseId:'case-eg-001',generation:2,evidenceRevision:8};
const route=(phase='normative_v11')=>({valid:true,phase});
const gate=decision=>({decision,expertConfirmed:true,reason:'Проверен обхват на конкретната преписка'});
const legal={ok:true,...caseInfo};
test('P5 does not let a missing case or confirmed subject jump to stage 5',()=>{
 assert.equal(next({step:4}).code,'CASE_REQUIRED');
 assert.equal(next({...caseInfo,step:2,confirmedSubject:false}).code,'SUBJECT');
 assert.equal(next({...caseInfo,step:2,confirmedSubject:true,confirmedScope:true}).code,'GIS_RELEVANCE');
});
test('P5 GIS optional routes directly to stage4 and required GIS cannot be bypassed',()=>{
 const base={...caseInfo,step:2,confirmedSubject:true,confirmedScope:true};
 assert.equal(next({...base,spatialGate:gate('NOT_REQUIRED')}).step,4);
 assert.equal(next({...base,spatialGate:gate('REQUIRED')}).step,3);
 assert.equal(next({...caseInfo,step:3,route:route('gis_pdf1'),spatialGate:gate('REQUIRED')}).code,'SPATIAL_PENDING');
 assert.equal(next({...caseInfo,step:3,route:route('gis_pdf1'),
  spatialGate:gate('REQUIRED'),spatialReceipt:{verified:true,pdf1Verified:true,...caseInfo}}).code,'SPATIAL_READY');
 assert.equal(next({...caseInfo,step:3,route:route('gis_pdf1'),
  spatialGate:gate('REQUIRED'),spatialReceipt:{verified:true,pdf1Verified:true,...caseInfo,evidenceRevision:7}}).code,'SPATIAL_PENDING');
});
test('P5 requires current independently verified V11 even for stage 5 revisit',()=>{
 assert.equal(next({...caseInfo,step:4,route:route(),verifiedLaw:null}).code,'V11_PENDING');
 assert.equal(next({...caseInfo,step:4,route:route(),verifiedLaw:legal}).code,'V11_READY');
 for(const phase of ['motivated_proposal','out_draft']){
  assert.equal(next({...caseInfo,step:5,route:route(phase),verifiedLaw:legal}).code,'OUT_PREPARE');
 }
 assert.equal(next({...caseInfo,step:5,route:route('out_draft'),
  verifiedLaw:{...legal,caseId:'another-case'}}).code,'LEGAL_STALE');
 assert.equal(next({...caseInfo,step:5,route:{valid:false,phase:'out_draft'},verifiedLaw:legal}).code,'ROUTE_RESET');
});
test('P5 never uses a legal result from another case or revision',()=>{
 for(const alt of [{caseId:'other'}, {generation:3},{evidenceRevision:9}]){
  assert.equal(next({...caseInfo,step:4,route:route(),verifiedLaw:{...legal,...alt}}).code,'V11_PENDING');
 }
});
test('P5 uses one existing progress box and preserves the standalone V27.35 capsule',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../kt80/integration/kt83-p5-single-route-binding.js'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'../kt80/KT83_VT01_P1_AUTOMATIC_ROUTE_TEST.html'),'utf8');
 assert.match(source,/existing=\$\('kt83P1RouteStatus'\)/);
 assert.match(source,/note.id='kt83P5NextAction'/);
 assert.doesNotMatch(source,/\.click\(\)|KT80WorkflowGo\(5\)|automaticIssue/);
 assert.match(html,/legacy\/KT80_V27_35_REFERENCE_CAPSULE_V10\.html/);
 assert.ok(html.indexOf('kt83-vt01-route-binding.js')<html.indexOf('kt83-p5-single-route-binding.js'));
 const binder=fs.readFileSync(path.join(__dirname,'../kt80/integration/kt83-vt01-route-binding.js'),'utf8');
 assert.match(binder,/\['normative_v11','motivated_proposal','out_draft'\]/);
 assert.match(binder,/verified\.ok===true/);
});
