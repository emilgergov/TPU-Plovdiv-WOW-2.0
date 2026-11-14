'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {create:templatesFactory}=require('../kt80/integration/kt83-p4-out-template-contract.js');
const {create:dispatcherFactory}=require('../kt80/integration/kt83-p4-out-dispatcher.js');
const bytes=new Uint8Array(2048).fill(65);
const h=crypto.createHash('sha256').update(bytes).digest('hex');
function fixture(){
 let current={caseId:'eg-case-01',generation:2,evidenceRevision:3,confirmedSubject:'Потвърден предмет'};
 let law={verified:true,caseId:current.caseId,generation:current.generation,
  evidenceRevision:current.evidenceRevision,reasonedAssessment:'Проверена нормативна преценка'};
 let calls=0;
 const templates=templatesFactory({
  digest:async data=>crypto.createHash('sha256').update(data).digest('hex'),
  verifyApproval:async()=>true});
 const renderers={'01':async({templateBytes,template,caseRecord})=>{
  calls++;assert.equal(template.templateId,'OUT01');assert.equal(caseRecord.caseId,'eg-case-01');
  assert.deepEqual(templateBytes,bytes);
  return {bytes:Uint8Array.from([1,2,3]),mediaType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    formalIssuanceAllowed:false,signed:false};
 }};
 const d=dispatcherFactory({templates,renderers,currentCase:()=>current,legalReceipt:()=>law});
 const selection=()=>({outId:'01',expertConfirmed:true,caseId:current.caseId,
  generation:current.generation,evidenceRevision:current.evidenceRevision});
 return {templates,d,selection,revise:()=>{current={...current,evidenceRevision:current.evidenceRevision+1};},
  revoke:()=>{law={...law,verified:false}},calls:()=>calls};
}
test('P4 cannot use general blank when specific OUT template missing',async()=>{
 const x=fixture();
 assert.equal((await x.d.prepare({outId:'01',expertChoice:x.selection()})).code,'OUT_TEMPLATE_MISSING');
});
test('P4 renders only using registered verified specific OUT template',async()=>{
 const x=fixture();
 await x.templates.register({outId:'01',templateId:'OUT01',sourceDescription:'Одобрен образец',
  expectedSha256:h,bytes});
 const result=await x.d.prepare({outId:'01',expertChoice:x.selection()});
 assert.equal(result.ok,true);assert.equal(result.status,'EXPERT_REVIEW_ONLY');
 assert.equal(result.signed,false);assert.equal(result.formalIssuanceAllowed,false);
 assert.equal(result.templateId,'OUT01');assert.equal(x.calls(),1);
});
test('P4 never chooses output type by itself or bypasses normative assessment',async()=>{
 const x=fixture();
 await x.templates.register({outId:'01',templateId:'OUT01',sourceDescription:'Одобрен образец',
 expectedSha256:h,bytes});
 assert.equal((await x.d.prepare({outId:'01',expertChoice:{...x.selection(),expertConfirmed:false}})).code,'OUT_CHOICE_UNCONFIRMED');
 x.revoke();
 assert.equal((await x.d.prepare({outId:'01',expertChoice:x.selection()})).code,'LEGAL_PROOF_MISSING');
 assert.equal(x.calls(),0);
});
test('P4 change of case while rendering invalidates old output',async()=>{
 const x=fixture();
 await x.templates.register({outId:'01',templateId:'OUT01',sourceDescription:'Одобрен образец',expectedSha256:h,bytes});
 const a=x.d.prepare({outId:'01',expertChoice:x.selection()});
 x.revise();x.d.invalidate();
 assert.equal((await a).code,'OUT_STALE');
});
test('P4 without renderer never invents structure for a different OUT',async()=>{
 const x=fixture();
 await x.templates.register({outId:'02',templateId:'OUT02',sourceDescription:'Друг образец',
 expectedSha256:h,bytes});
 assert.equal((await x.d.prepare({outId:'02',expertChoice:{...x.selection(),outId:'02'}})).code,'OUT_RENDERER_MISSING');
});

test('P4 runtime demands original V11 handoff and loads after route binding',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const runtime=fs.readFileSync(path.join(__dirname,'../kt80/integration/kt83-p4-out-runtime.js'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'../kt80/KT83_VT01_P1_AUTOMATIC_ROUTE_TEST.html'),'utf8');
 assert.match(runtime,/KT83V11Handoff\?\.assess/);
 assert.match(runtime,/KT83NormativeArchiveV11/);
 assert.match(runtime,/KT83ApprovedOutTemplates/);
 assert.match(runtime,/KT83ApprovedOutRenderers/);
 assert.match(runtime,/allowUniversalBlank:false/);
 const at=x=>html.indexOf(x);
 assert.ok(at('kt83-vt01-route-binding.js')<at('kt83-p4-out-runtime.js'));
 assert.ok(at('kt83-p4-out-template-contract.js')<at('kt83-p4-out-runtime.js'));
});

test('P4 refuses expert variant mismatch instead of silently selecting a different template',async()=>{
 const x=fixture();
 await x.templates.register({outId:'01',variant:'A',templateId:'OUT01-A',
  sourceDescription:'Одобрен образец A',expectedSha256:h,bytes});
 const accepted={...x.selection(),variant:'A'};
 assert.equal((await x.d.prepare({outId:'01',variant:'B',expertChoice:accepted})).code,'OUT_CHOICE_UNCONFIRMED');
 assert.equal((await x.d.prepare({outId:'01',variant:'A',expertChoice:accepted})).ok,true);
});
