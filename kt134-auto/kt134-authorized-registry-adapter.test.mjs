import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuthorizedCaseRegistry} from './kt134-authorized-registry-adapter.mjs';
const session={active:true,userId:'expert123'};
const caseId='EG-2026-000015';
const build=(opts={})=>createAuthorizedCaseRegistry({
 verifySession:async()=>({active:true,userId:'expert123'}),
 readAuthorizedCase:async()=>({caseId,version:'4',incomingNumber:'ОВОС-2159-4/23.10.2026 г.',
  documents:[{fileId:'notification',kind:'notification',sourceText:'Първоначален документ'},
   {fileId:'objection',kind:'objection',sourceText:'Възражение'}]}),
 ...opts
});
test('protected case returns same internal/docket number and source documents',async()=>{
 const r=await build().getCase({session,caseId});
 assert.equal(r.caseId,caseId);
 assert.equal(r.incomingNumber,'ОВОС-2159-4/23.10.2026 г.');
 assert.deepEqual(r.documents.map(x=>x.fileId),['notification','objection']);
 assert.ok(Object.isFrozen(r.documents));
});
test('server authorization is mandatory even if browser reports active',async()=>{
 const registry=build({verifySession:async()=>({active:false,userId:'expert123'})});
 await assert.rejects(registry.getCase({session,caseId}),/потвърдена/);
});
test('a cross-case return from registry is forbidden',async()=>{
 const registry=build({readAuthorizedCase:async()=>({caseId:'EG-2026-999999',documents:[{fileId:'x'}]})});
 await assert.rejects(registry.getCase({session,caseId}),/различна преписка/);
});
test('duplicate source identities are forbidden',async()=>{
 const registry=build({readAuthorizedCase:async()=>({caseId,documents:[{fileId:'x'},{fileId:'x'}]})});
 await assert.rejects(registry.getCase({session,caseId}),/повторен/);
});
test('missing protected host functions cannot be ignored',()=>{
 assert.throws(()=>createAuthorizedCaseRegistry({readAuthorizedCase:()=>({})}),/защитен/);
});
