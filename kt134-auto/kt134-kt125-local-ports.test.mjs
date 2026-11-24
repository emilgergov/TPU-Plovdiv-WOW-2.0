import test from 'node:test';
import assert from 'node:assert/strict';
import {createKT125LocalPorts} from './kt134-kt125-local-ports.mjs';
const caseId='11111111-1111-4111-8111-111111111111',userId='expert123';
function setup(patch={}){
 const calls=[];
 const fns={
  identity:async()=>({verified:true,userId,role:'expert'}),
  caseContext:async x=>{calls.push(['caseContext',x.action]);
   return {verified:true,caseId,internalNumber:'EG-2026-000015',revision:4,
    externalNumber:'ОВОС-2159-4/23.10.2026 г.'};},
  readState:async()=>({record:{case_id:caseId,revision:4},state:{intake:{
   document_texts:[{source:'Уведомление.pdf',text:'Първоначално искане'},
    {source:'Възражение.pdf',text:'Актуално възражение'}]}}}),
  unpackState:async s=>s,
  listSources:async()=>[{source_id:'original',filename:'archive.zip',complete:1}],
  ...patch
 };
 return {ports:createKT125LocalPorts(fns),calls};
}
const request=new Request('https://isolated.invalid/kt134/auto',{headers:{Cookie:'session=synthetic'}});
test('KT125 local cookie identity is verified by original host procedure',async()=>{
 const {ports}=setup();const user=await ports.authenticateRequest(request);
 assert.deepEqual(user,{verified:true,userId,role:'expert'});
});
test('KT125 case UUID and visible EG number are preserved separately',async()=>{
 const {ports}=setup();const user=await ports.authenticateRequest(request);
 const result=await ports.readDossier({user,caseId});
 assert.equal(result.caseId,caseId);
 assert.equal(result.internalNumber,'EG-2026-000015');
 assert.equal(result.incomingNumber,'ОВОС-2159-4/23.10.2026 г.');
 assert.equal(result.revision,4);assert.equal(result.version,'4');
 assert.deepEqual(result.documents.map(d=>d.fileId),['Уведомление.pdf','Възражение.pdf']);
 assert.equal(result.documents[1].verification,'source_unverified');
});
test('revoked or inactive local account never becomes an authenticated expert',async()=>{
 const {ports}=setup({identity:async()=>({verified:false,userId,role:'expert'})});
 assert.equal((await ports.authenticateRequest(request)).verified,false);
});
test('technical caseId cannot be replaced by visible EG number',async()=>{
 const {ports}=setup(),user=await ports.authenticateRequest(request);
 assert.equal(await ports.authorizeCase({user,caseId:'EG-2026-000015'}),false);
});
test('mismatched case or revision must fail closed',async()=>{
 const {ports}=setup({readState:async()=>({record:{case_id:caseId,revision:5},state:{}})});
 await assert.rejects(ports.readDossier({user:{verified:true,userId,role:'expert'},caseId}),/променена/);
});
test('incomplete original source is not silently analyzed',async()=>{
 const {ports}=setup({listSources:async()=>[{source_id:'original',complete:0}]});
 await assert.rejects(ports.readDossier({user:{verified:true,userId,role:'expert'},caseId}),/Непълен/);
});
test('automatic route cannot use a missing or unread document',async()=>{
 const {ports}=setup({readState:async()=>({record:{case_id:caseId,revision:4},state:{intake:{document_texts:[]}}})});
 await assert.rejects(ports.readDossier({user:{verified:true,userId,role:'expert'},caseId}),/Липсва прочетен/);
});
test('delegated and other roles require explicit KT125 authorization (no blanket auto rights)',async()=>{
 const {ports}=setup({identity:async()=>({verified:true,userId,role:'reviewer'})});
 assert.equal((await ports.authenticateRequest(request)).verified,false);
});
test('no public password, bearer, or API token is part of local KT125 adapter',async()=>{
 const {ports}=setup(),user=await ports.authenticateRequest(request);
 const r=await ports.readDossier({user,caseId});
 assert.ok(!JSON.stringify(r).includes('Bearer'));
 assert.ok(!JSON.stringify(r).includes('password'));
});
