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

test('P4 isolated UI disables legacy single-template universal Word export',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const src=fs.readFileSync(path.join(__dirname,'../kt80/integration/kt83-v617-universal-out-preview.mjs'),'utf8');
 assert.match(src,/docxButton\.disabled=true/);
 assert.match(src,/общата институционална бланка не замества утвърдения образец/);
});

test('P4 catalogue tools 13-16 are not outgoing administrative documents',async()=>{
 const r=make();
 for(const outId of ['13','14','15','16'])
  assert.equal(r.select({outId,caseId:'c',generation:1,evidenceRevision:1,
    expertConfirmed:true,normativeVerified:true}).code,'UNKNOWN_OUT');
 assert.equal(r.status().remaining,18);
});

test('P4 keeps separately approved A and B variants for the same OUT without cross-use',async()=>{
 const r=make(),b=new Uint8Array(4096).fill(66);
 const bh=crypto.createHash('sha256').update(b).digest('hex');
 assert.equal((await r.register({...props,variant:'A'})).ok,true);
 assert.equal((await r.register({...props,variant:'B',templateId:'APPROVED_FORM_01_B',expectedSha256:bh,bytes:b})).ok,true);
 const input={outId:'01',caseId:'case',generation:1,evidenceRevision:2,expertConfirmed:true,normativeVerified:true};
 const a=r.select({...input,variant:'A'}),other=r.select({...input,variant:'B'});
 assert.equal(a.ok,true);assert.equal(other.ok,true);
 assert.notEqual(a.template.templateId,other.template.templateId);
 assert.deepEqual(r.getTemplate(a),bytes);
 assert.deepEqual(r.getTemplate(other),b);
 assert.equal(r.select({...input,variant:'C'}).code,'OUT_TEMPLATE_MISSING');
});
