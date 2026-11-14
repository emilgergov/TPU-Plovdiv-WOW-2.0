'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {create}=require('../kt80/integration/kt83-p4-out-template-contract.js');
const bytes=Uint8Array.from(Buffer.alloc(4096,65));
const hash=crypto.createHash('sha256').update(bytes).digest('hex');
const props={outId:'01',templateId:'APPROVED_FORM_01',sourceDescription:'Approved institutional document 01',expectedSha256:hash,bytes};
const make=(ok=true)=>create({digest:async a=>crypto.createHash('sha256').update(a).digest('hex'),verifyApproval:async()=>ok});
test('P4 each OUT requires an actual verified approved template, not common letterhead',async()=>{
 const r=make();
 const no=r.select({outId:'01',caseId:'case',generation:1,evidenceRevision:2,expertConfirmed:true,normativeVerified:true});
 assert.equal(no.code,'OUT_TEMPLATE_MISSING');
 assert.equal((await r.register(props)).ok,true);
 assert.equal(r.select({outId:'02',caseId:'case',generation:1,evidenceRevision:2,expertConfirmed:true,normativeVerified:true}).code,'OUT_TEMPLATE_MISSING');
 const yes=r.select({outId:'01',caseId:'case',generation:1,evidenceRevision:2,expertConfirmed:true,normativeVerified:true});
 assert.equal(yes.ok,true);assert.equal(yes.formalIssuanceAllowed,false);assert.equal(yes.unsigned,true);
 assert.deepEqual(r.getTemplate(yes),bytes);
});
test('P4 never accepts a wrong file or self-declared approval',async()=>{
 const r=make();
 assert.equal((await r.register({...props,expectedSha256:'f'.repeat(64)})).code,'TEMPLATE_HASH_MISMATCH');
 assert.equal((await make(false).register(props)).code,'TEMPLATE_NOT_ATTESTED');
 assert.equal((await create().register(props)).code,'INDEPENDENT_VERIFIER_REQUIRED');
});
test('P4 avoids using one OUT template for a different document',async()=>{
 const r=make();
 assert.equal((await r.register(props)).ok,true);
 assert.equal((await r.register({...props,outId:'02'})).code,'TEMPLATE_REUSED_FOR_DIFFERENT_OUT');
 assert.equal((await r.register(props)).code,'DUPLICATE_OUT_TEMPLATE');
});
test('P4 requires explicit independent procedural outcome and current case',async()=>{
 const r=make();await r.register(props);
 for(const x of [{expertConfirmed:false,normativeVerified:true},{expertConfirmed:true,normativeVerified:false},
  {expertConfirmed:true,normativeVerified:true,evidenceRevision:NaN}]){
  assert.equal(r.select({outId:'01',caseId:'case',generation:1,evidenceRevision:2,...x}).ok,false);
 }
});
test('P4 invalidated session cannot render outdated OUT template',async()=>{
 const r=make();await r.register(props);
 const x=r.select({outId:'01',caseId:'case',generation:1,evidenceRevision:2,expertConfirmed:true,normativeVerified:true});
 const copy=r.getTemplate(x);copy[0]=0;
 assert.equal(r.getTemplate(x)[0],65);
 r.clear();assert.equal(r.getTemplate(x),null);
});
