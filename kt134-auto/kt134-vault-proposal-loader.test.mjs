import test from 'node:test';
import assert from 'node:assert/strict';
import {createKT134VaultProposalLoader} from './kt134-vault-proposal-loader.mjs';
const caseId='11111111-1111-4111-8111-111111111111';
const draft={caseId,proposalVersion:'v1',caseRevision:4,status:'awaiting_expert',
 wordSha256:'a'.repeat(64),bindingSha256:'b'.repeat(64),
 wordBytes:new Uint8Array([80,75,3,4,1,2]),
 proposal:{caseId,expertConfirmed:false,documentDraft:'Относно: Възражение\nМотиви',
  procedure:'Мотивиран отговор',documentTitle:'Писмо',panelId:17}};
function fixture(patch={}){
 const calls=[];
 const vault={async loadCurrentDraft(x){calls.push(x);return {...draft,...patch}}};
 return {loader:createKT134VaultProposalLoader({vault}),calls};
}
test('current protected DOCX becomes the sole authoritative expert proposal',async()=>{
 const {loader,calls}=fixture();
 const p=await loader.loadProposal({caseId,userId:'expert123'});
 assert.equal(p.version,'v1');
 assert.equal(p.caseRevision,4);
 assert.equal(p.wordSha256,'a'.repeat(64));
 assert.equal(p.bindingSha256,'b'.repeat(64));
 assert.equal(p.proposedPanel,17);
 assert.equal(p.expertConfirmed,false);
 assert.deepEqual(calls,[{caseId,userId:'expert123',includeWord:true}]);
});
test('never approves superseded proposal from R2',async()=>{
 const {loader}=fixture({status:'superseded'});
 await assert.rejects(loader.loadProposal({caseId,userId:'expert123'}),/неодобрен/);
});
test('never accepts a draft with missing real Word bytes',async()=>{
 const {loader}=fixture({wordBytes:null});
 await assert.rejects(loader.loadProposal({caseId,userId:'expert123'}),/не е проверен/);
});
test('never accepts a draft with missing SHA-256',async()=>{
 const {loader}=fixture({wordSha256:null});
 await assert.rejects(loader.loadProposal({caseId,userId:'expert123'}),/не е проверен/);
});
test('unverified user does not reach D1',async()=>{
 const {loader,calls}=fixture();
 await assert.rejects(loader.loadProposal({caseId,userId:''}),/удостоверен/);
 assert.equal(calls.length,0);
});
test('requires current-draft lookup controlled by protected server',async()=>{
 const loader=createKT134VaultProposalLoader({vault:{loadDraft:async()=>({})}});
 await assert.rejects(loader.loadProposal({caseId,userId:'expert123'}),/актуалната версия/);
});
