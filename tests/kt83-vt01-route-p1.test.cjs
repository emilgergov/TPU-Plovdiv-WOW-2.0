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
