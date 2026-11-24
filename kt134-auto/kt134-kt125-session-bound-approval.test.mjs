import test from 'node:test';
import assert from 'node:assert/strict';
import {createKT134KT125SessionBoundApproval} from './kt134-kt125-session-bound-approval.mjs';
import {createKT125LocalPorts} from './kt134-kt125-local-ports.mjs';
const caseId='11111111-1111-4111-8111-111111111111';
const binding='a'.repeat(64),word='b'.repeat(64);
const request=new Request('https://private.invalid/kt134/confirm',{
 method:'POST',headers:{Cookie:'local=synthetic'}});
const draft={caseId,proposalVersion:'v1',caseRevision:4,status:'awaiting_expert',
 bindingSha256:binding,wordSha256:word,wordBytes:new Uint8Array([80,75,3,4,1,2]),
 proposal:{caseId,expertConfirmed:false,documentDraft:'Относно: Възражение\nМотиви',
  procedure:'Разглеждане на възражение',documentTitle:'Писмо',proposedPanel:17}};
function fixture({inactive=false,canConfirm=true,rev=4,atomicRows=1,
 invalidateSessionBeforeCommit=false}={}){
 let authCalls=0;
 const steps=[];
 const ports=createKT125LocalPorts({
  identity:async req=>{
   assert.equal(req,request);authCalls++;
   if(inactive||(invalidateSessionBeforeCommit&&authCalls>7))return {verified:false};
   return {verified:true,userId:'expert123',role:'expert'};
  },
  caseContext:async x=>{
   steps.push('acl:'+x.action);
   return {verified:x.action==='case.confirm'?canConfirm:true,caseId,revision:rev,
    internalNumber:'EG-2026-000015'};
  },
  readState:async()=>{throw Error('not needed')},
  unpackState:async()=>{},listSources:async()=>[]
 });
 const vault={
  async loadDraft(x){steps.push('private-docx');assert.equal(x.userId,'expert123');return draft},
  async loadCurrentDraft(x){steps.push('current-docx');assert.equal(x.userId,'expert123');return draft}
 };
 const bridge=createKT134KT125SessionBoundApproval({request,localPorts:ports,vault,
  loadCaseRevision:async x=>{steps.push('revision');return rev},
  atomicCommit:async x=>{
   steps.push('atomic');
   assert.equal(x.request,request);
   assert.equal(x.authenticatedActor.userId,'expert123');
   assert.equal(x.expected.action,'case.confirm');
   return {ok:atomicRows===1,atomic:true,updatedRows:atomicRows,
    caseId,previousVersion:'v1',version:'decision-v2'};
  },audit:async()=>{}
 });
 return {bridge,steps};
}
const input={caseId,proposalVersion:'v1',previewBindingSha256:binding};
test('KT125 local-auth request leads to protected final approval only with atomic host commit',async()=>{
 const f=fixture();
 const result=await f.bridge.confirm(input);
 assert.equal(result.expertConfirmed,true);
 assert.deepEqual(f.steps.filter(x=>x==='atomic'),['atomic']);
 assert.ok(f.steps.filter(x=>x==='acl:case.confirm').length>=3);
});
test('inactive KT125 user has no access to Word archive',async()=>{
 const f=fixture({inactive:true});
 await assert.rejects(f.bridge.confirm(input),/локална KT125 сесия/);
 assert.deepEqual(f.steps,[]);
});
test('revoked KT125 case.confirm prevents any Word read',async()=>{
 const f=fixture({canConfirm:false});
 await assert.rejects(f.bridge.confirm(input),/право/);
 assert.ok(!f.steps.includes('private-docx'));
 assert.ok(!f.steps.includes('atomic'));
});
test('changed KT126 revision blocks atomic commit',async()=>{
 const f=fixture({rev:5});
 await assert.rejects(f.bridge.confirm(input),/променена|Ревизията/);
 assert.ok(!f.steps.includes('atomic'));
});
test('host updated zero D1 rows must not claim successful approval',async()=>{
 const f=fixture({atomicRows:0});
 await assert.rejects(f.bridge.confirm(input),/не потвърди атомарно/);
});
test('wrong browser Word preview is rejected before atomic commit',async()=>{
 const f=fixture();
 await assert.rejects(f.bridge.confirm({...input,previewBindingSha256:'c'.repeat(64)}),/не съответства/);
 assert.ok(!f.steps.includes('atomic'));
});
test('cannot compose without authentic KT125 identity ports and private vault',()=>{
 assert.throws(()=>createKT134KT125SessionBoundApproval({request}),/сървърен порт/);
});
