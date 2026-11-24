import test from 'node:test';
import assert from 'node:assert/strict';
import {createKT134StoredApprovalBridge} from './kt134-stored-approval-bridge.mjs';
const caseId='11111111-1111-4111-8111-111111111111',binding='a'.repeat(64);
function setup(opts={}){
 const log=[];
 const draft={caseId,proposalVersion:'v1',caseRevision:4,status:'awaiting_expert',
  bindingSha256:binding,wordBytes:new Uint8Array([80,75,3,4,1,2]),
  proposal:{caseId,expertConfirmed:false,documentDraft:'Относно: Жалба\nМотиви',
   procedure:'Отговор на жалба',documentTitle:'Писмо'},...opts.draft};
 const bridge=createKT134StoredApprovalBridge({
  verifySession:async()=>opts.session===undefined?{active:true,userId:'expert123'}:opts.session,
  authorizeCase:async x=>{log.push(['acl',x.action]);return opts.denied!==true},
  loadCaseRevision:async()=>opts.revision===undefined?4:opts.revision,
  vault:{loadDraft:async x=>{log.push(['vault',x.includeWord]);if(opts.vaultError)throw Error('Архивиран Word е повреден');return draft}},
  decisions:{decide:async x=>{log.push(['decide',x.action]);return opts.decision||{caseId,version:'d2',expertConfirmed:true}}},
  audit:async x=>log.push(['audit',x.event])
 });
 return {bridge,log};
}
const args={caseId,proposalVersion:'v1',previewBindingSha256:binding};
test('confirms exact verified private DOCX only through protected expert decision',async()=>{
 const {bridge,log}=setup();const r=await bridge.confirm(args);
 assert.equal(r.expertConfirmed,true);assert.deepEqual(log.map(x=>x[0]),['acl','vault','decide','audit']);
 assert.equal(log[1][1],true);
});
test('wrong preview fingerprint never invokes expert decision',async()=>{
 const {bridge,log}=setup();
 await assert.rejects(bridge.confirm({...args,previewBindingSha256:'b'.repeat(64)}),/не съответства/);
 assert.equal(log.some(x=>x[0]==='decide'),false);
});
test('changed case revision blocks confirmation',async()=>{
 const {bridge,log}=setup({revision:5});
 await assert.rejects(bridge.confirm(args),/променена/);
 assert.equal(log.some(x=>x[0]==='decide'),false);
});
test('inactive expert cannot even load private Word',async()=>{
 const {bridge,log}=setup({session:{active:false,userId:'expert123'}});
 await assert.rejects(bridge.confirm(args),/активна/);assert.deepEqual(log,[]);
});
test('revoked case.confirm permission prevents loading',async()=>{
 const {bridge,log}=setup({denied:true});
 await assert.rejects(bridge.confirm(args),/право/);
 assert.equal(log.some(x=>x[0]==='vault'),false);
});
test('damaged private DOCX cannot reach approval',async()=>{
 const {bridge,log}=setup({vaultError:true});
 await assert.rejects(bridge.confirm(args),/повреден/);
 assert.equal(log.some(x=>x[0]==='decide'),false);
});
test('superseded Word draft is not approvable',async()=>{
 const {bridge,log}=setup({draft:{status:'superseded'}});
 await assert.rejects(bridge.confirm(args),/неодобрен/);
 assert.equal(log.some(x=>x[0]==='decide'),false);
});
test('missing stored Word bytes blocks approval',async()=>{
 const {bridge,log}=setup({draft:{wordBytes:null}});
 await assert.rejects(bridge.confirm(args),/действителният/);
 assert.equal(log.some(x=>x[0]==='decide'),false);
});
test('approval cannot be reported until decision backend confirms it',async()=>{
 const {bridge}=setup({decision:{caseId,expertConfirmed:false}});
 await assert.rejects(bridge.confirm(args),/Няма потвърдено/);
});
test('client cannot provide fabricated session or private Word',async()=>{
 const {bridge,log}=setup({session:{active:false,userId:'expert123'}});
 await assert.rejects(bridge.confirm({...args,session:{active:true,userId:'attacker'},wordBytes:new Uint8Array([80,75,0,0])}),/активна/);
 assert.deepEqual(log,[]);
});
