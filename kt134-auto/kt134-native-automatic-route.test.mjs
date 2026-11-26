import test from 'node:test';
import assert from 'node:assert/strict';
import {createKt134NativeAutomaticHandler} from './kt134-native-automatic-route.mjs';
const base='https://tpu-plovdiv-kt134-test.emilgergov.workers.dev';
const caseId='11111111-1111-4111-8111-111111111111';
const cookie='test-session-cookie';
const nativeData={
 caseId,revision:5,record:{case_id:caseId,owner_id:'expert-1',revision:5,
   external_number:'РИОСВ-123/2026',external_status:'confirmed'},
 principal:{userId:'expert-1',role:'expert',active:true},
 values:{kt80SubjectText:'Възражение срещу административно писмо',
   kt80ScopeText:'Искане за корекция на мотивите',
   kt80SubjectConfirmation:true,kt80ScopeConfirmation:true},
 state:{gisSkipConfirmed:true,gisSkipReason:'Възражение без ново инвестиционно предложение',
  intake:{document_texts:[{source:'vazrazhenie.pdf',text:'Подадено е възражение по предходно становище.'}]}},
 globals:{KT80DossierAudit:{filesExpected:1,filesExtracted:1,filesNeedReview:0,
   requiresExpertReview:false}}
};
const req=(payload={caseId},origin=base,authed=true)=>new Request(base+'/kt134/automatic/draft',{
 method:'POST',headers:{origin,'content-type':'application/json',...(authed?{cookie}: {})},
 body:JSON.stringify(payload)
});
function handler({state=nativeData,nativeStatus=200,egCalls=[]}={}){
 return createKt134NativeAutomaticHandler({
  nativeFetch:async request=>{
   assert.equal(request.method,'GET');
   assert.match(request.url,/\/kt126\/registry\/.*\/state$/);
   return new Response(nativeStatus===200?JSON.stringify(state):'Permission denied',{
    status:nativeStatus,headers:nativeStatus===200?{'content-type':'application/json'}:{}});
  },
  egWorkerBase:'https://eg-test.invalid',egAccessToken:'server-only-testing-token',
  wordBuilder:async()=>Uint8Array.from({length:180},(_,i)=>i%256),
  fetchImpl:async(url,init)=>{
   if(url.endsWith('/legal-archive-health'))
    return {ok:true,json:async()=>({status:'ready',archiveSHA256:'b'.repeat(64),
      exactProvisionsReady:9,requiredProvisionsVerified:7})};
   const input=JSON.parse(init.body);
   assert.equal(init.headers.Authorization,'Bearer server-only-testing-token');
   egCalls.push({url,input});
   if(url.endsWith('/stage4-proposal')){
    assert.equal(input.subject,'Възражение срещу административно писмо');
    assert.equal(input.completeCaseEvidence.sourceTexts[0].source,'vazrazhenie.pdf');
    assert.equal(input.completeCaseEvidence.gis.analysisMode,'contextual_skip');
    const proposal='ИЗБРАН ПАНЕЛ: 17 — Проект на отговор\nПредлага се мотивиран отговор.';
    return {ok:true,json:async()=>({caseId,evidenceRevision:input.evidenceRevision,
      authorDraft:proposal,draft:proposal,
      reviewerIntermediate:{caseId,intermediateConfirmed:true,selectedPanelId:17,
        reviewedText:proposal},reviewerIntermediateProof:'test-reviewer-proof',
      normativeAudit:{reviewVerdict:'pass',findings:[]}})};
   }
   if(url.endsWith('/stage5-document'))
    return {ok:true,json:async()=>({caseId,projectOnly:true,documentIssued:false,
      automaticReviewerIntermediate:true,
      draft:'Относно: „Възражение срещу административно писмо“\nПредлага се изготвяне на мотивиран отговор.'})};
   throw Error('Unexpected EG endpoint: '+url);
  }
 });
}
test('complete native ACL state -> Stage4 EG -> independent reviewer -> Stage5 -> actual DOCX response',async()=>{
 const calls=[];
 const output=await handler({egCalls:calls})(req());
 assert.equal(output.status,200);
 const d=await output.json();
 assert.equal(d.status,'draft_ready');
 assert.equal(d.stage5.panelId,17);
 assert.equal(d.expertApproved,false);
 assert.equal(d.finalDecision,null);
 assert.equal(d.registryNumber,'РИОСВ-123/2026');
 assert.equal(calls.length,2);
 assert.equal(calls[0].input.completeCaseEvidence.gis.reason,
  'Възражение без ново инвестиционно предложение');
 assert.equal(Uint8Array.from(atob(d.docxBase64),x=>x.charCodeAt(0)).length,180);
});
test('no authenticated native session never enters EG',async()=>{
 const calls=[];
 const r=await handler({nativeStatus:403,egCalls:calls})(req());
 assert.equal(r.status,422);assert.equal((await r.json()).error,'KT125_CASE_ACCESS_DENIED');
 assert.equal(calls.length,0);
});
test('unconfirmed Stage2 subject must fail before EG',async()=>{
 const calls=[];
 const r=await handler({state:{...nativeData,values:{...nativeData.values,kt80SubjectConfirmation:false}},
  egCalls:calls})(req());
 assert.equal(r.status,422);
 assert.equal((await r.json()).error,'KT134_E2_CONFIRMATIONS_NOT_AVAILABLE');
 assert.equal(calls.length,0);
});
test('cross-origin request is rejected even with a cookie',async()=>{
 const calls=[];
 const r=await handler({egCalls:calls})(req({caseId},'https://unknown.example'));
 assert.equal(r.status,403);assert.equal(calls.length,0);
});
test('unverified GIS skip cannot be fabricated for a complaint',async()=>{
 const calls=[];
 const r=await handler({state:{...nativeData,state:{intake:nativeData.state.intake}},
   egCalls:calls})(req());
 assert.equal((await r.json()).error,'KT134_GIS_OR_CONTEXT_CONFIRMED_REQUIRED');
 assert.equal(calls.length,0);
});
test('unverified user identity cannot be inferred from case owner alone',async()=>{
 const calls=[];
 const r=await handler({state:{...nativeData,principal:undefined},egCalls:calls})(req());
 assert.equal((await r.json()).error,'KT125_PRINCIPAL_AND_CASE_PERMISSION_NOT_CONFIRMED');
 assert.equal(calls.length,0);
});
