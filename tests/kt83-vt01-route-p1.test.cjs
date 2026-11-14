'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {coordinator}=require('../kt80/integration/kt83-vt01-automatic-route-p1.js');
test('requires subject and scope approvals and rejects skipped phases',()=>{
 const live={caseId:'case-a',generation:1,evidenceRevision:0};
 const c=coordinator({current:()=>live});
 assert.equal(c.start({subject:true,scope:false}).ok,false);
 assert.equal(c.start({subject:true,scope:true}).ok,true);
 assert.equal(c.advance('normative_v11',{...live,verified:true}).ok,false);
 assert.equal(c.advance('evidence',{...live,verified:false}).ok,false);
 assert.equal(c.advance('evidence',{...live,verified:true}).ok,false);
 assert.equal(c.advance('evidence',{...live,verified:true,pdf1Verified:true,geometryVerified:true}).ok,true);
});
test('rejects cross-case evidence and invalidates on revision change',()=>{
 let live={caseId:'case-a',generation:2,evidenceRevision:3};
 const c=coordinator({current:()=>live});
 assert.equal(c.start({subject:true,scope:true}).ok,true);
 assert.equal(c.advance('evidence',{caseId:'case-b',generation:2,evidenceRevision:3,verified:true}).ok,false);
 live={...live,evidenceRevision:4};
 assert.equal(c.advance('evidence',{...live,verified:true}).ok,false);
 assert.equal(c.snapshot().valid,false);
});
test('advances sequentially only with matching receipts and motivated V11 evaluation',()=>{
 const live={caseId:'case-c',generation:1,evidenceRevision:7};
 const c=coordinator({current:()=>live});
 assert.equal(c.start({subject:true,scope:true}).ok,true);
 // subject_scope -> gis_pdf1 happens on start. Next comes evidence.
 assert.equal(c.advance('evidence',{...live,verified:true,pdf1Verified:true,geometryVerified:true}).ok,true);
 assert.equal(c.advance('normative_v11',{...live,verified:true}).ok,true);
 assert.equal(c.advance('motivated_proposal',{...live,verified:true}).ok,false);
 assert.equal(c.advance('motivated_proposal',{...live,verified:true,reasonedAssessment:'Доказателствена оценка'}).ok,true);
 assert.equal(c.advance('out_draft',{...live,verified:true}).ok,false);
 assert.equal(c.advance('out_draft',{...live,verified:true,motivatedProposal:'Конкретно допълване'}).ok,true);
 assert.equal(c.complete({...live,verified:true}).ok,true);
 assert.equal(c.snapshot().status,'ПРОЕКТ ЗА ПРЕГЛЕД');
});

test('isolated UI binds to original workflow and requires a current PDF1 proof',()=>{
 const fs=require('node:fs');
 const binding=fs.readFileSync(require('node:path').join(__dirname,'../kt80/integration/kt83-vt01-route-binding.js'),'utf8');
 const html=fs.readFileSync(require('node:path').join(__dirname,'../kt80/KT83_VT01_P1_AUTOMATIC_ROUTE_TEST.html'),'utf8');
 assert.match(binding,/onGateStage\(step\)/);
 assert.match(binding,/gate\.decision!=='NOT_REQUIRED'/);
 assert.match(binding,/gisNotRequired:true/);
 assert.doesNotMatch(binding,/KT80WorkflowGo\?\.\(3\)/);
 assert.match(binding,/KT83NormativeBridge\?\.pdfStatus\?\.\(\)/);
 assert.match(binding,/pdf\.caseId===r\.caseId/);
 assert.match(binding,/pdf\.evidenceRevision===r\.evidenceRevision/);
 assert.match(binding,/pdf\.source===g/);
 assert.match(binding,/pdf1Verified:true,geometryVerified:true/);
 assert.match(binding,/gisNotRequired:true,expertConfirmed:true,reason:gate\.reason/);
 assert.match(binding,/kt82:pdf1-completed/);
 assert.match(binding,/kt82:evidence-invalidated/);
 assert.match(binding,/KT83V11Handoff\?\.assess/);
 assert.doesNotMatch(binding,/KT83V11ValidatedAssessment/);
 assert.match(binding,/event\.stopImmediatePropagation\(\)/);
 const workflow=fs.readFileSync(require('node:path').join(__dirname,'../kt80/KT83_WORKFLOW_CASE_V591.js'),'utf8');
 assert.match(workflow,/KT83RouteAccess\.canOpenStage\(5\)/);
 assert.match(binding,/root\.KT83RouteAccess=Object\.freeze/);
 const dashboard=fs.readFileSync(require('node:path').join(__dirname,'../kt80/KT80_E01_DASHBOARD_27_V580.js'),'utf8');
 assert.match(dashboard,/Number\(step\)===5&&root\.KT83RouteAccess\?\.canOpenStage\?\.\(5\)===false/);
 assert.match(dashboard,/root\.KT83RouteAccess\?\.denied\?\.\(5\)/);
 assert.match(binding,/\$\('kt80SubjectText'\)\?\.addEventListener\('input',invalidate\)/);
 assert.match(binding,/\$\('kt80ScopeText'\)\?\.addEventListener\('input',invalidate\)/);
 assert.match(binding,/function canEnterStageFive\(\)/);
 assert.match(binding,/const eligible=canEnterStageFive\(\)/);
 assert.match(binding,/verified\.ok===true/);
 assert.match(binding,/root\.KT83NormativeArchiveV11/);
 assert.match(html,/integration\/kt83-vt01-automatic-route-p1\.js/);
 assert.match(html,/integration\/kt83-vt01-route-binding\.js/);
 assert.doesNotMatch(html,/<script[^>]*src=["']https:\/\/[^"']*kt83-vt01-route-binding/);
});

test('GIS exemption requires explicit expert confirmation and reasons',()=>{
 const live={caseId:'no-gis-case',generation:4,evidenceRevision:3};
 const c=coordinator({current:()=>live});
 assert.equal(c.start({subject:true,scope:true}).ok,true);
 assert.equal(c.advance('evidence',{...live,verified:true,gisNotRequired:true,expertConfirmed:true}).ok,false);
 assert.equal(c.advance('evidence',{...live,verified:true,gisNotRequired:true,reason:'Неотносимо'}).ok,false);
 assert.equal(c.advance('evidence',{...live,verified:true,gisNotRequired:true,expertConfirmed:true,reason:'Не се разглежда пространствен въпрос по преписката.'}).ok,true);
 assert.equal(c.advance('normative_v11',{...live,verified:true}).ok,true);
 assert.equal(c.advance('motivated_proposal',{...live,verified:true}).ok,false);
});

test('V11 handoff fails closed without independent archive verifier',()=>{
 const handoff=require('../kt80/integration/kt83-vt01-v11-handoff.js');
 const caseData={caseId:'case-a',generation:1,evidenceRevision:2,subject:'Предмет',scope:'Обхват'};
 const r=handoff.assess(caseData,null);
 assert.equal(r.ok,false);assert.equal(r.code,'V11_UNAVAILABLE');
 assert.match(r.nextAction,/Предложение/);
});
test('V11 handoff rejects stale cases, missing provisions, unverified provenance',()=>{
 const {assess}=require('../kt80/integration/kt83-vt01-v11-handoff.js');
 const c={caseId:'case-a',generation:1,evidenceRevision:2,subject:'Предмет',scope:'Обхват'};
 const evidence={caseId:'case-a',generation:1,evidenceRevision:2,archiveVersion:'V11',
  status:'VERIFIED',applicabilityVerified:true,competenceVerified:true,
  reasonedAssessment:'Анализ на приложимостта',proposedAction:'Искане за сведения',
  provisions:[{documentId:'local-1',articleRef:'чл. 1',archiveSource:'локален V11',applicabilityReason:'Доказан факт'}]};
 assert.equal(assess(c,{evaluateCase:()=>({...evidence,caseId:'other'}),verifyProvenance:()=>true}).code,'STALE_V11');
 assert.equal(assess(c,{evaluateCase:()=>({...evidence,provisions:[]}),verifyProvenance:()=>true}).code,'NO_V11_PROOFS');
 assert.equal(assess(c,{evaluateCase:()=>evidence,verifyProvenance:()=>false}).code,'PROVENANCE_UNVERIFIED');
 assert.equal(assess(c,{evaluateCase:()=>evidence,verifyProvenance:()=>true}).ok,true);
});
