'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const crypto=require('node:crypto');
const {create}=require('../kt80/integration/kt83-p3-local-v11-register.js');
const bytes=Uint8Array.from(Buffer.from('LOCAL OFFICIAL SOURCE SAMPLE - UNIT TEST ONLY'));
const hash=crypto.createHash('sha256').update(bytes).digest('hex');
const props={id:'test-doc-1',sourceUri:'https://example.org/official-source',
 publication:'документален реквизит (само тест)',validityCheckedAt:'2026-11-14',
 articles:['чл. TEST'],bytes,expectedSha256:hash};
function harness(){
 let trusted=true,reviewed=true,checkCalls=0;
 const reg=create({
  digest:async data=>crypto.createHash('sha256').update(data).digest(),
  reviewOfficialSource:async()=>reviewed,
  verifyOfficialSource:()=>{checkCalls++;return trusted;}
 });
 return {reg,deny:()=>trusted=false,denyReview:()=>reviewed=false,getCalls:()=>checkCalls};
}
test('P3 local V11 loads bytes only after SHA-256 and independent review',async()=>{
 const x=harness(),result=await x.reg.importDocument(props);
 assert.equal(result.ok,true);
 const record=x.reg.getDocument(props.id);
 assert.equal(record.fingerprint,hash);
 assert.equal(record.archiveVersion,'V11');
 assert.equal(x.reg.verifyDocument(record),true);
 assert.deepEqual(x.reg.status().sourceIds,[props.id]);
});
test('P3 never accepts a wrong digest or incomplete source metadata',async()=>{
 const x=harness();
 assert.equal((await x.reg.importDocument({...props,expectedSha256:'f'.repeat(64)})).code,'HASH_MISMATCH');
 assert.equal((await x.reg.importDocument({...props,sourceUri:''})).code,'SOURCE_METADATA_INCOMPLETE');
 assert.equal(x.reg.getDocument(props.id),null);
});
test('P3 does not invent official status from a supplied SHA-256 value',async()=>{
 const x=harness();x.deny();
 assert.equal((await x.reg.importDocument(props)).code,'SOURCE_PROVENANCE_UNVERIFIED');
 assert.equal(x.reg.status().count,0);
 const y=harness();y.denyReview();
 assert.equal((await y.reg.importDocument(props)).code,'OFFICIAL_REVIEW_MISSING');
});
test('P3 invalidates use when independent source verifier revokes trust',async()=>{
 const x=harness();
 assert.equal((await x.reg.importDocument(props)).ok,true);
 const rec=x.reg.getDocument(props.id);
 x.deny();
 assert.equal(x.reg.verifyDocument(rec),false);
 assert.equal(x.reg.verifyDocument({...rec}),false);
});
test('P3 accepts no duplicate document IDs and clears session data',async()=>{
 const x=harness();
 assert.equal((await x.reg.importDocument(props)).ok,true);
 assert.equal((await x.reg.importDocument(props)).code,'DUPLICATE_DOCUMENT_ID');
 x.reg.clear();
 assert.equal(x.reg.status().count,0);
 assert.equal(x.reg.getDocument(props.id),null);
});
test('P3 local source record is sufficient for archive lookup but not a case legal conclusion',async()=>{
 const x=harness();
 assert.equal((await x.reg.importDocument(props)).ok,true);
 const v=require('../kt80/integration/kt83-p3-independent-v11.js').create({archive:x.reg});
 assert.equal(v.available,false); // No trusted expert review provider
 assert.equal(v.evaluateCase({caseId:'X',generation:1,evidenceRevision:0,subject:'S',scope:'O'}),null);
});

test('P3 session imports local source and reopens V11 only with explicit trusted providers',async()=>{
 const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
 const source=require('../kt80/integration/kt83-p3-local-v11-register.js');
 const verifierFactory=require('../kt80/integration/kt83-p3-independent-v11.js');
 const events=new Map(),window={
  crypto:crypto.webcrypto,
  KT83P3LocalSourceRegister:source,
  KT83P3NormativeVerifierFactory:verifierFactory,
  document:{addEventListener:(kind,cb)=>events.set(kind,cb)}
 };
 const connector=fs.readFileSync(path.join(__dirname,'../kt80/integration/kt83-p3-v11-connector.js'),'utf8');
 const session=fs.readFileSync(path.join(__dirname,'../kt80/integration/kt83-p3-v11-session.js'),'utf8');
 vm.runInNewContext(connector,{window});
 vm.runInNewContext(session,{window});
 assert.equal(window.KT83P3V11Connector.connect(),false);
 assert.equal(window.KT83P3LocalSession.openSession({}).ok,false);
 const review={getCaseReview:()=>null,verifyCaseReview:()=>false};
 const opened=window.KT83P3LocalSession.openSession({reviewOfficialSource:async()=>true,
  verifyOfficialSource:()=>true,expertReview:review});
 assert.equal(opened.ok,true);
 assert.equal(window.KT83P3V11Connector.connect(),false,'empty archive must not unlock verifier');
 const localFile={arrayBuffer:async()=>Uint8Array.from(bytes).buffer};
 const result=await opened.session.importFile(localFile,Object.fromEntries(
  Object.entries(props).filter(([key])=>key!=='bytes')));
 assert.equal(result.ok,true);
 assert.equal(opened.session.status().count,1);
 assert.equal(window.KT83P3V11Connector.connect(),true);
 assert.equal(window.KT83NormativeArchiveV11.available,true);
 window.KT83P3LocalSession.closeSession();
 assert.equal(window.KT83NormativeArchiveV11,null);
 assert.equal(window.KT83P3V11Connector.connect(),false);
 assert.equal(opened.session.status(),null);
});
