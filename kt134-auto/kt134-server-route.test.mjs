import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutoServerRoute} from './kt134-server-route.mjs';
const caseId='EG-2026-000015';
const good=()=>({operation:'kt134.auto-dossier-analyze.v1',caseId,
 mode:'automatic_proposal',requireExpertApproval:true,dossierVersion:'v4'});
function fixture(changes={}){
 const seen={calls:[],audit:[]};
 const fn=createAutoServerRoute({
  authenticateRequest:async()=>({verified:true,userId:'expert123'}),
  authorizeCase:async x=>{seen.calls.push(['auth',x.caseId]);return true;},
  readDossier:async x=>{seen.calls.push(['read',x.caseId]);return {caseId,version:'v4',
   incomingNumber:'ОВОС-2159-4/23.10.2026 г.',
   documents:[{fileId:'notice',text:'Уведомление'},{fileId:'objection',text:'Възражение'}]};},
  analyze:async x=>{seen.calls.push(['analyze',x.caseId]);return {caseId,leadingDocumentId:'objection',
   procedure:'Разглеждане на възражение',justification:'Възражението е актуалното искане',
   documentTitle:'Отговор по жалба',documentDraft:'Относно: Възражение\nМотивиран проект',
   reviewerStatus:'internally_validated',panelId:17};},
  recordAudit:async x=>{seen.audit.push(x);},
  ...changes
 });
 const req=(data=good(),init={})=>new Request('https://isolated.invalid/kt134/auto',
 {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),...init});
 return {fn,req,seen};
}
test('protected server reads canonical dossier only after verified session and case ACL',async()=>{
 const x=fixture(); const r=await x.fn(x.req());const d=await r.json();
 assert.equal(r.status,200);assert.equal(d.caseId,caseId);
 assert.equal(d.leadingDocumentId,'objection');assert.equal(d.expertConfirmed,false);
 assert.deepEqual(x.seen.calls.map(a=>a[0]),['auth','read','analyze']);
 assert.equal(x.seen.audit[0].event,'auto_proposal');
});
test('forged browser user does not authorize case',async()=>{
 const x=fixture({authenticateRequest:async()=>({verified:false,userId:'expert123'})});
 const r=await x.fn(x.req({...good(),userId:'expert123',active:true}));
 assert.equal(r.status,403);assert.deepEqual(x.seen.calls,[]);
});
test('revoked case rights deny before dossier read',async()=>{
 const x=fixture({authorizeCase:async()=>false});
 const r=await x.fn(x.req());assert.equal(r.status,403);
 assert.deepEqual(x.seen.calls,[]);
});
test('input version cannot overwrite changed registry version',async()=>{
 const x=fixture(); const r=await x.fn(x.req({...good(),dossierVersion:'old'}));
 assert.equal(r.status,409);assert.deepEqual(x.seen.calls.map(a=>a[0]),['auth','read']);
});
test('AI-selected source from another dossier cannot become leading document',async()=>{
 const x=fixture({analyze:async()=>({caseId,leadingDocumentId:'foreign',
  procedure:'Процедура',justification:'Мотиви',documentTitle:'Писмо',documentDraft:'Документ'})});
 const r=await x.fn(x.req());assert.equal(r.status,422);
 assert.match((await r.json()).error,/доказателствения/);
});
test('automated output cannot assert the expert approved the decision',async()=>{
 const x=fixture({analyze:async()=>({caseId,leadingDocumentId:'objection',expertConfirmed:true,
  procedure:'Процедура',justification:'Мотиви',documentTitle:'Писмо',documentDraft:'Документ'})});
 const r=await x.fn(x.req());assert.equal(r.status,422);
});
test('no provider exception or source content leaks on internal error',async()=>{
 const x=fixture({analyze:async()=>{throw Error('PRIVATE_SECRET_TOKEN sensitive claim');}});
 const r=await x.fn(x.req());assert.equal(r.status,500);
 const body=JSON.stringify(await r.json());assert.doesNotMatch(body,/PRIVATE_SECRET_TOKEN/);
});
test('large request is rejected without case lookup',async()=>{
 const x=fixture();const r=await x.fn(x.req({...good(),extras:'x'.repeat(71000)}));
 assert.equal(r.status,413);assert.deepEqual(x.seen.calls,[]);
});
test('wrong operation and silent expert approval are rejected',async()=>{
 const x=fixture();
 let r=await x.fn(x.req({...good(),operation:'unsafe.operation'}));assert.equal(r.status,400);
 r=await x.fn(x.req({...good(),requireExpertApproval:false}));assert.equal(r.status,400);
});
