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
 assert.equal(c.advance('evidence',{...live,verified:true}).ok,true);
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
 assert.equal(c.advance('evidence',{...live,verified:true}).ok,true);
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
 assert.match(binding,/kt82:pdf1-completed/);
 assert.match(binding,/kt82:evidence-invalidated/);
 assert.match(binding,/KT83V11ValidatedAssessment/);
 assert.match(binding,/verified\.competenceVerified/);
 assert.match(binding,/verified\.evidenceRevision!==now\.evidenceRevision/);
 assert.match(html,/integration\/kt83-vt01-automatic-route-p1\.js/);
 assert.match(html,/integration\/kt83-vt01-route-binding\.js/);
 assert.doesNotMatch(html,/<script[^>]*src=["']https:\/\/[^"']*kt83-vt01-route-binding/);
});
