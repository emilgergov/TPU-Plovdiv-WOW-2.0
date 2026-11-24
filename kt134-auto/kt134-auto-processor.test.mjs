import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutoProcessor} from './kt134-auto-processor.mjs';

const session={active:true,userId:'expert-test'};
const caseId='EG-2026-000015';
const calls=[];
function setup(overrides={}){
 const registry={getCase:async()=>({caseId,incomingNumber:'ОВОС-2159-4/23.10.2026 г.',version:'v1',
  documents:[{fileId:'original',kind:'notification'},{fileId:'objection',kind:'objection'}]})};
 const gateway={run:async()=>({caseId,leadingDocumentId:'objection',procedure:'Отговор по възражение',
  justification:'Фактическа и правна обосновка',documentDraft:'Относно: Възражение\nПроект',panelId:17,
  reviewNotes:[],uncertainties:[],expertConfirmed:false})};
 const word={buildDraft:async()=>new Uint8Array([80,75,3,4])};
 const audit={record:async x=>{calls.push(x)}};
 return createAutoProcessor({registry,gateway,word,audit,...overrides});
}
test('active expert receives proposal and Word draft without intermediate questions',async()=>{
 const q=await setup().run({session,caseId});
 assert.equal(q.proposal.caseId,caseId);
 assert.equal(q.proposal.incomingNumber,'ОВОС-2159-4/23.10.2026 г.');
 assert.equal(q.proposal.leadingDocumentId,'objection');
 assert.equal(q.proposal.proposedPanel,17);
 assert.equal(q.proposal.expertConfirmed,false);
 assert.equal(q.proposal.status,'awaiting_final_expert_approval');
 assert.ok(q.wordDraft instanceof Uint8Array);
 assert.deepEqual(q.availableActions,['confirm','edit','manual_from_stage1']);
 assert.equal(q.wordError,null);
});
test('inactive user cannot start',async()=>{
 await assert.rejects(setup().run({session:{active:false,userId:'x'},caseId}),/активна/);
});
test('mismatched case identity refuses cross-dossier analysis',async()=>{
 const q=setup({gateway:{run:async()=>({caseId:'EG-2026-999999'})}});
 await assert.rejects(q.run({session,caseId}),/друга преписка/);
});
test('AI cannot assert expert approval',async()=>{
 const q=setup({gateway:{run:async()=>({caseId,expertConfirmed:true,leadingDocumentId:'objection',
  procedure:'Отговор',justification:'Обосновано',documentDraft:'Проект'})}});
 await assert.rejects(q.run({session,caseId}),/фиктивно/);
});
test('missing Word does not become a fabricated finished DOCX',async()=>{
 const q=setup({word:{buildDraft:async()=>{throw Error('Бланката не е налична')}}});
 const x=await q.run({session,caseId});
 assert.equal(x.wordDraft,null);
 assert.match(x.wordError,/Бланката/);
 assert.equal(x.proposal.expertConfirmed,false);
});
test('protected gateway receives no password, token, or user-supplied endpoint',async()=>{
 let seen;
 const q=setup({gateway:{run:async x=>{seen=x;return {caseId,leadingDocumentId:'objection',
  procedure:'Отговор',justification:'Мотиви',documentDraft:'Относно: Отговор'}}}});
 await q.run({session,caseId});
 assert.deepEqual(Object.keys(seen).sort(),['request','session']);
 assert.ok(!JSON.stringify(seen.request).includes('password'));
 assert.ok(!JSON.stringify(seen.request).includes('Bearer'));
 assert.equal(seen.request.requireExpertApproval,true);
});
test('classic fallback restarts at stage 1 with same case, without auto confirmations',async()=>{
 const q=setup();
 const output=await q.manualFromStage1({session,caseId,proposal:{caseId,expertConfirmed:false}});
 assert.deepEqual(output,{caseId,stage:1,mode:'classic',reuseExistingDossier:true,
 carryAutomaticProposalsAsUnconfirmed:true});
});
test('classic fallback refuses mismatch',async()=>{
 const q=setup();
 await assert.rejects(q.manualFromStage1({session,caseId,proposal:{caseId:'EG-2026-000014',expertConfirmed:false}}),/чужда/);
});
