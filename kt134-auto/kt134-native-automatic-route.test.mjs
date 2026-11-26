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
function handler({state=nativeData,nativeStatus=200,egCalls=[],rpcProof=null}={}){
 return createKt134NativeAutomaticHandler({
  nativeFetch:async request=>{
   assert.equal(request.method,'GET');
   assert.equal(new URL(request.url).pathname,'/kt126/registry/'+caseId);
   return new Response(nativeStatus===200?JSON.stringify(state):'Permission denied',{
    status:nativeStatus,headers:nativeStatus===200?{'content-type':'application/json'}:{}});
  },
  nativeRpc:{getCaseContext:async ({cookie:current,caseId:id,action})=>{
   assert.equal(current,cookie);
   assert.equal(id,caseId);
   assert.equal(action,'case.edit');
   return rpcProof===null?{verified:true,caseId,revision:state.record?.revision??5,
      actorId:'expert-1',externalNumber:'РИОСВ-123/2026'}:rpcProof;
  }},
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
    assert.ok(['contextual_skip','contextual_unverified',
      'verified_intersections_pending_pdf1'].includes(input.completeCaseEvidence.gis.analysisMode));
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
test('new native KT126 case: reviewed E1 feeds automatic E2 without forging classic confirmations or external number',async()=>{
 const calls=[];
 const newState={
  ...nativeData,
  record:{...nativeData.record,internal_number:'EG-2026-000016',
   external_number:null,external_status:null},
  values:{kt80SubjectText:'ИП за нова преписка',
   kt80ScopeText:'Предмет и обхват от рецензирания Етап 1',
   kt80SubjectConfirmation:false,kt80ScopeConfirmation:false},
  globals:{...nativeData.globals,KT134AutomaticStage1:{
   completed:true,caseId,
   leadingDocument:{caseId,sourceId:'vazrazhenie.pdf',
    fileName:'vazrazhenie.pdf',selectedBy:'EG_AUTHOR_AND_REVIEWER'},
   reviewerStatus:'completed',subject:'Възражение срещу административно писмо',
   scope:'Искане за корекция на мотивите',expertApproved:false
  }}
 };
 const r=await handler({state:newState,egCalls:calls})(req());
 assert.equal(r.status,200);
 const result=await r.json();
 assert.equal(result.status,'draft_ready');
 assert.equal(result.registryNumber,'EG-2026-000016');
 assert.equal(result.expertApproved,false);
 assert.equal(calls.length,2);
});
test('new native case without a completed reviewer must not bypass manual E2',async()=>{
 const calls=[];
 const state={...nativeData,record:{...nativeData.record,
  internal_number:'EG-2026-000016',external_number:null,external_status:null},
  values:{...nativeData.values,kt80SubjectConfirmation:false,kt80ScopeConfirmation:false},
  globals:{...nativeData.globals,KT134AutomaticStage1:{
   completed:true,caseId,leadingDocument:{caseId,selectedBy:'EG_AUTHOR_AND_REVIEWER'},
   reviewerStatus:'pending',subject:'Предмет',scope:'Обхват'
  }}};
 const r=await handler({state,egCalls:calls})(req());
 assert.equal(r.status,422);
 assert.equal((await r.json()).error,'KT134_E2_CONFIRMATIONS_NOT_AVAILABLE');
 assert.equal(calls.length,0);
});
test('cross-origin request is rejected even with a cookie',async()=>{
 const calls=[];
 const r=await handler({egCalls:calls})(req({caseId},'https://unknown.example'));
 assert.equal(r.status,403);assert.equal(calls.length,0);
});
test('missing E3 confirmation triggers evidence-limited reviewer, never a fabricated GIS skip',async()=>{
 const calls=[];
 const r=await handler({state:{...nativeData,state:{intake:nativeData.state.intake}},
   egCalls:calls})(req());
 assert.equal(r.status,200);
 assert.equal((await r.json()).status,'draft_ready');
 assert.equal(calls.length,2);
 assert.equal(calls[0].input.completeCaseEvidence.gis.analysisMode,'contextual_unverified');
 assert.equal(calls[0].input.completeCaseEvidence.gis.pdf1Verified,false);
 assert.equal(calls[0].input.evidence.find(x=>x.factId==='GIS_E3_LIMITATION')?.status,'uncertain');
});
test('unverified user identity cannot be inferred from case owner alone',async()=>{
 const calls=[];
 const r=await handler({state:{...nativeData,principal:undefined},
  rpcProof:{verified:false,caseId,revision:5,actorId:'expert-1'},egCalls:calls})(req());
 assert.equal((await r.json()).error,'KT125_CASE_EDIT_ACCESS_NOT_VERIFIED');
 assert.equal(calls.length,0);
});

test('native RPC grants delegated actor explicit case.edit without pretending ownership',async()=>{
 const calls=[];
 const state={...nativeData,record:{...nativeData.record,owner_id:'someone-else'}};
 const r=await handler({state,egCalls:calls,rpcProof:{
  verified:true,caseId,revision:5,actorId:'authorized-delegate'
 }})(req());
 assert.equal(r.status,200);
 assert.equal(calls.length,2);
});
test('native RPC rejects a case that changed revision after state read',async()=>{
 const calls=[];
 const r=await handler({egCalls:calls,rpcProof:{
  verified:true,caseId,revision:6,actorId:'expert-1'
 }})(req());
 assert.equal(r.status,422);
 assert.equal((await r.json()).error,'KT125_CASE_REVISION_CHANGED');
 assert.equal(calls.length,0);
});

test('native packed KT126 workflow snapshot restores original dossier texts and completes EG/Word',async()=>{
 const snapshot={state:nativeData.state,values:nativeData.values,globals:nativeData.globals};
 const gz=await new Response(new Blob([JSON.stringify(snapshot)]).stream().pipeThrough(
  new CompressionStream('gzip'))).arrayBuffer();
 const packed={format:'KT126-GZIP-1',
  payload:btoa(String.fromCharCode(...new Uint8Array(gz)))};
 const state={caseId,revision:5,record:nativeData.record,state:packed};
 const calls=[];
 const r=await handler({state,egCalls:calls})(req());
 assert.equal(r.status,200);
 const result=await r.json();
 assert.equal(result.status,'draft_ready');
 assert.equal(result.stage5.panelId,17);
 assert.equal(calls.length,2);
 assert.equal(calls[0].input.completeCaseEvidence.sourceTexts[0].text.includes('Подадено е възражение'),true);
});
test('native packed KT126 snapshot with no dossier evidence cannot get an invented proposal',async()=>{
 const packed={format:'KT126-GZIP-1',
  payload:btoa(String.fromCharCode(...new Uint8Array(await new Response(new Blob([
   JSON.stringify({state:{intake:{document_texts:[]}},values:nativeData.values,globals:nativeData.globals})
   ]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer())))};
 const calls=[];
 const r=await handler({state:{caseId,record:nativeData.record,state:packed},egCalls:calls})(req());
 assert.equal(r.status,422);
 assert.equal((await r.json()).error,'KT134_DOCUMENT_TEXTS_NOT_AVAILABLE');
 assert.equal(calls.length,0);
});

test('KT134 dossier review flags are passed to independent reviewer, do not block automatic E1–E5',async()=>{
 const calls=[];
 const state={...nativeData,globals:{...nativeData.globals,KT80DossierAudit:{
  filesExpected:1,filesExtracted:1,filesNeedReview:1,requiresExpertReview:true
 }}};
 const r=await handler({state,egCalls:calls})(req());
 assert.equal(r.status,200);
 const result=await r.json();
 assert.equal(result.status,'draft_ready');
 assert.equal(result.expertApproved,false);
 assert.equal(calls.length,2);
 const e=calls[0].input;
 assert.equal(e.completeCaseEvidence.dossierReview.required,true);
 assert.equal(e.completeCaseEvidence.dossierReview.filesNeedReview,1);
 assert.equal(e.completeCaseEvidence.dossierReview.requiresExpertReview,true);
 assert.equal(e.evidence.find(x=>x.factId==='DOSSIER_QUALITY_REVIEW')?.status,'uncertain');
});
test('KT134 incomplete dossier remains prohibited even if reviewer mode is automatic',async()=>{
 const calls=[];
 const state={...nativeData,globals:{...nativeData.globals,KT80DossierAudit:{
  filesExpected:3,filesExtracted:2,filesNeedReview:1,requiresExpertReview:true
 }}};
 const r=await handler({state,egCalls:calls})(req());
 assert.equal(r.status,422);
 assert.equal((await r.json()).error,'KT134_DOSSIER_INCOMPLETE');
 assert.equal(calls.length,0);
});

test('native full GIS per-parcel verified overlay enters Stage4 with uncertain PDF1 and never fakes a PDF receipt',async()=>{
 const calls=[];
 const state={...nativeData,state:{...nativeData.state,
  gisSkipConfirmed:false,gisSkipReason:''},
  globals:{...nativeData.globals,KT80FreeGISResults:{
   source:'FULL_GIS_MASTER',verified:false,ids:['56789.22.1'],
   results:[{input:'56789.22.1',cadnum:'56789.22.1',status:'Намерен',
    geojson:{features:[{geometry:{type:'Polygon'}}]},
    verified_zone_intersections:[{name:'BG0000123'}],
    intersection_verified_outside:false}]
  }}};
 const result=await handler({state,egCalls:calls})(req());
 assert.equal(result.status,200);
 const response=await result.json();
 assert.equal(response.status,'draft_ready');
 assert.equal(calls.length,2);
 const input=calls[0].input;
 assert.equal(input.completeCaseEvidence.gis.analysisMode,'verified_intersections_pending_pdf1');
 assert.equal(input.completeCaseEvidence.gis.pdf1Verified,false);
 assert.equal(input.completeCaseEvidence.gis.protectedZones[0].name,'BG0000123');
 assert.equal(input.evidence.find(x=>x.factId==='GIS_E3_LIMITATION').status,'uncertain');
});
test('missing protected zone overlay verification never claims spatial intersection',async()=>{
 const calls=[];
 const state={...nativeData,state:{...nativeData.state,gisSkipConfirmed:false,
  gisSkipReason:''},globals:{...nativeData.globals,KT80FreeGISResults:{
   ids:['56789.22.1'],verified:false,
   results:[{input:'56789.22.1',status:'Намерен',
     verified_zone_intersections:undefined,geojson:{features:[{geometry:{type:'Polygon'}}]}}]
  }}};
 const response=await handler({state,egCalls:calls})(req());
 assert.equal(response.status,200);
 assert.equal(calls[0].input.completeCaseEvidence.gis.analysisMode,'contextual_unverified');
 assert.deepEqual(calls[0].input.completeCaseEvidence.gis.protectedZones,[]);
});
