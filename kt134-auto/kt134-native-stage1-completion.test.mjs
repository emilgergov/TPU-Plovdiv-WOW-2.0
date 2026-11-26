import test from 'node:test';
import assert from 'node:assert/strict';
import {createKt134NativeStage1Completion} from './kt134-native-stage1-completion.mjs';
const CASE='7d895a17-e947-4c61-9f31-7e887cef0117';
const HASH='a'.repeat(64);
const ORIGIN='https://tpu-plovdiv-kt134-test.emilgergov.workers.dev';
const intake={
 archive_name:'synthetic.zip',
 files:[{name:'01_notification.pdf'},{name:'02_prior_letter.pdf'},{name:'03_objection.pdf'}],
 document_texts:[
  {source:'01_notification.pdf',text:'Известие за първоначално инвестиционно предложение.'},
  {source:'02_prior_letter.pdf',text:'Предходно писмо по чл. 2, ал. 2.'},
  {source:'03_objection.pdf',text:'Актуално възражение срещу предходно писмо по преписката.'}
 ]};
const req=(x={})=>new Request(ORIGIN+'/kt134/new-case/complete-stage1',{
 method:'POST',headers:{origin:ORIGIN,cookie:'kt125_session=synthetic',
 'content-type':'application/json'},
 body:JSON.stringify({caseId:CASE,sha256:HASH,intake,...x})});
const json=x=>new Response(JSON.stringify(x),{headers:{'Content-Type':'application/json'}});
const response=()=>json({caseId:CASE,stage:1,status:'stage1_documentary_proposal',
 author:{leadingDocumentId:'03_objection.pdf'},reviewer:{leadingDocumentId:'03_objection.pdf'},
 reviewerStatus:'completed',selected:{
  leadingDocumentId:'03_objection.pdf',rationale:'Текущо възражение след предходното писмо.',
  subject:'Разглеждане на възражение',scope:'Преразглеждане на последното писмо',
  currentRequest:'Иска промяна на предходен извод'}});
test('real native case ACL, original digest and shared case state are required',async()=>{
 let saved;
 const nativeFetch=async request=>{
  const path=new URL(request.url).pathname;
  if(path==='/kt126/registry/'+CASE&&request.method==='GET')
   return json({record:{case_id:CASE,revision:1,internal_number:'EG-2026-000016'},state:{}});
  if(path==='/kt126/registry/'+CASE+'/source')return json({file:{complete:1,sha256:HASH}});
  if(path==='/kt126/registry/'+CASE+'/state'){
   saved=await request.json();
   assert.equal(saved.revision,1);
   return json({record:{case_id:CASE,revision:2,internal_number:'EG-2026-000016'}});
  }
  throw Error('Unexpected native path: '+path);
 };
 let sent;
 const egFetch=async(_,init)=>{sent=JSON.parse(init.body);return response()};
 const run=createKt134NativeStage1Completion({nativeFetch,egFetch,egAccessToken:'synthetic'});
 const x=await run({request:req()});
 assert.equal(x.status,'stage1_completed');
 assert.equal(x.stage,2);
 assert.equal(x.internalNumber,'EG-2026-000016');
 assert.equal(sent.documents.length,3);
 assert.equal(saved.state.state.leadingDocument.sourceId,'03_objection.pdf');
 assert.equal(saved.state.globals.KT80WorkflowState.intake.document_texts.length,3);
 assert.equal(saved.state.globals.KT134AutomaticStage1.completed,true);
 assert.equal(saved.state.values.kt80SubjectConfirmation,false);
 assert.equal(saved.state.values.kt80ScopeConfirmation,false);
 assert.equal(saved.state.globals.KT134AutomaticStage1.reviewerStatus,'completed');
});
test('bad original digest blocks EG and state mutation',async()=>{
 let egCalls=0,saveCalls=0;
 const nativeFetch=async request=>{
  const p=new URL(request.url).pathname;
  if(p.endsWith('/source'))return json({file:{complete:1,sha256:'b'.repeat(64)}});
  if(request.method==='POST'){saveCalls++;return json({})}
  return json({record:{case_id:CASE,revision:1,internal_number:'EG-2026-000016'},state:{}});
 };
 const run=createKt134NativeStage1Completion({
  nativeFetch,egFetch:async()=>{egCalls++;return response()},egAccessToken:'synthetic'});
 await assert.rejects(run({request:req()}),/KT134_STAGE1_ORIGINAL_DIGEST_MISMATCH/);
 assert.equal(egCalls,0);assert.equal(saveCalls,0);
});
test('reviewer must choose a real document, never a fake leader',async()=>{
 let writes=0;
 const nativeFetch=async request=>{
  if(new URL(request.url).pathname.endsWith('/source'))return json({file:{complete:1,sha256:HASH}});
  if(request.method==='POST')writes++;
  return json({record:{case_id:CASE,revision:1,internal_number:'EG-2026-000016'},state:{}});
 };
 const wrong=json({caseId:CASE,status:'stage1_documentary_proposal',
  selected:{leadingDocumentId:'invented.pdf',rationale:'Invented',subject:'Subject',scope:'Scope'}});
 const run=createKt134NativeStage1Completion({nativeFetch,
  egFetch:async()=>wrong,egAccessToken:'synthetic'});
 await assert.rejects(run({request:req()}),/KT134_STAGE1_LEADING_DOCUMENT_UNVERIFIED/);
 assert.equal(writes,0);
});
