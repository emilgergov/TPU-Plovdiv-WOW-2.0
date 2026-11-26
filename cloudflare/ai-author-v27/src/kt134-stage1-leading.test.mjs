import test from 'node:test';
import assert from 'node:assert/strict';
import {createKt134Stage1LeadingHandler,validateKt134LeadingResponse} from './kt134-stage1-leading.mjs';
const caseId='7d895a17-e947-4c61-9f31-7e887cef0117';
const documents=[
 {id:'notice.pdf',fileName:'notice.pdf',text:'Уведомление за промяна на оборудване.'},
 {id:'prior_letter.pdf',fileName:'prior_letter.pdf',text:'Предходно административно писмо.'},
 {id:'objection.pdf',fileName:'objection.pdf',text:'Възражение по предходното писмо.'}
];
const proposal=(leadingDocumentId,subject)=>({
 caseId,leadingDocumentId,currentRequest:'Актуално искане по входящо възражение',
 rationale:'Последният документ сезира органа, предходното писмо е контекст.',
 subject,scope:'Разглеждане на възражение и предходната преписка',
 criticalUncertainty:false});
const req=()=>new Request('https://test.example/kt134/stage1-leading',{
 method:'POST',headers:{Authorization:'Bearer test-token','Content-Type':'application/json'},
 body:JSON.stringify({caseId,stage:1,projectOnly:true,documents})});
test('reviewer correction does not block E1 and overrides author on same dossier',async()=>{
 let calls=0;
 const handler=createKt134Stage1LeadingHandler({fetchImpl:async(url,options)=>{
  calls++;
  const payload=JSON.parse(options.body);
  assert.equal(payload.input[1].role,'user');
  const doc=JSON.parse(payload.input[1].content).documents;
  assert.equal(doc.length,3);
  const selected=calls===1?proposal('notice.pdf','Първоначално уведомление'):proposal('objection.pdf','Разглеждане на възражение');
  return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:JSON.stringify(selected)}]}]}),{status:200});
 }});
 const response=await handler(req(),{OPENAI_API_KEY:'synthetic',AI_AUTHOR_ACCESS_TOKEN:'test-token'});
 assert.equal(response.status,200);
 const x=await response.json();
 assert.equal(calls,2);
 assert.equal(x.selected.leadingDocumentId,'objection.pdf');
 assert.equal(x.author.leadingDocumentId,'notice.pdf');
 assert.equal(x.reviewerStatus,'completed');
 assert.equal(x.intermediateExpertConfirmationRequired,false);
 assert.equal(x.expertApproved,false);
});
test('unverified reviewer filename is ignored, author proposal remains nonblocking',async()=>{
 let calls=0;
 const handler=createKt134Stage1LeadingHandler({fetchImpl:async()=>{
  calls++;const candidate=calls===1?proposal('objection.pdf','Текущо възражение'):proposal('invented.pdf','Несъществуващ файл');
  return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:JSON.stringify(candidate)}]}]}));
 }});
 const response=await handler(req(),{OPENAI_API_KEY:'synthetic',AI_AUTHOR_ACCESS_TOKEN:'test-token'});
 const x=await response.json();
 assert.equal(x.selected.leadingDocumentId,'objection.pdf');
 assert.equal(x.reviewerStatus,'unavailable_nonblocking');
});
test('no fabricated document is accepted and no unauthenticated model call',async()=>{
 assert.equal(validateKt134LeadingResponse(proposal('missing.pdf','X'),caseId,documents),null);
 let calls=0;
 const handler=createKt134Stage1LeadingHandler({fetchImpl:async()=>{calls++;return new Response('{}')}});
 const r=await handler(req(),{OPENAI_API_KEY:'test',AI_AUTHOR_ACCESS_TOKEN:'different'});
 assert.equal(r.status,401);
 assert.equal(calls,0);
});
