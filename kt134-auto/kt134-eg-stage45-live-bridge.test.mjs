import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createKt134EgStage45Bridge} from './kt134-eg-stage45-live-bridge.mjs';
import {createProtectedAutomaticCoordinator} from './kt134-protected-auto-coordinator.mjs';
const id='EG-2026-000004',revision='2',evidenceRevision='rev2',digest='a'.repeat(64);
const rec=type=>({type,caseId:id,sourceId:'synthetic-'+type,digest,verifiedAt:'2026-11-25'});
const authorText='ИЗБРАН ПАНЕЛ: 17 — Отговор по жалба\n'+'А'.repeat(135);
const reviewerText='ИЗБРАН ПАНЕЛ: 19 — Произнасяне по възражение\n'+'Б'.repeat(135);
function fixture({documents=[],stage5MaxBytes=Infinity}={}){
 const calls=[];let wordText='';
 const ctx={principal:{source:'KT125_SERVER',authenticated:true,status:'active',userId:'expert',roles:['expert']},
 caseRecord:{id,revision,subject:'Синтетична преписка',registryNumber:'PD-004',registryConfirmed:true,status:'active',ownerUserId:'expert',gisMode:'required'},
 evidence:{dossier:rec('dossier'),normativeMaster:rec('normative_master'),piMaster:rec('pi_master'),gisPdf1:rec('gis_pdf1')},
 policy:{source:'KT125_SERVER',liveAutomaticEnabled:true}};
 const stage4Result={caseId:id,evidenceRevision,authorDraft:authorText,draft:reviewerText,
 reviewerIntermediate:{mode:'KT134_REVIEWER_INTERMEDIATE',caseId:id,evidenceRevision,reviewedText:reviewerText,
 selectedPanelId:19,intermediateConfirmed:true,expertApproved:false},
 reviewerIntermediateProof:'synthetic-proof',normativeAudit:{reviewVerdict:'revise',findings:[]},
 qualificationRecord:{selectedPanel:19},qualificationProof:'synthetic-qualification',
 qualificationGate:{sourceAnchorsMatched:true}};
 const fetchImpl=async(url,request)=>{
  const body=JSON.parse(request.body);calls.push({url,body});
  if(url.endsWith('/stage4-proposal'))return {ok:true,json:async()=>stage4Result};
  if(new TextEncoder().encode(request.body).length>stage5MaxBytes)
   return {ok:false,status:413,json:async()=>({})};
  return {ok:true,json:async()=>({caseId:id,draft:'Относно: „Тест“\nТекст от Етап 5.',projectOnly:true,documentIssued:false,automaticReviewerIntermediate:true})};
 };
 const eg=createKt134EgStage45Bridge({workerBase:'https://example.invalid',accessToken:'synthetic',
 fetchImpl,stage4RequestFactory:async()=>({task:'draft_normative_proposal',caseId:id,
 subject:ctx.caseRecord.subject,scope:'Синтетичен обхват',parcelIds:[],
 requestId:'request-4',evidenceRevision,incomingReference:ctx.caseRecord.registryNumber,
 completeCaseEvidence:{sourceTexts:documents}})});
 const adapters={loadProtectedContext:async()=>ctx,loadEvidenceBundle:async()=>({caseId:id,revision,
 serverVerified:true,caseIsolated:true,receiptRefs:Object.values(ctx.evidence).map(v=>v.type+':'+v.digest)}),
 ...eg,buildDraftWord:async({content})=>{wordText=content;return new Uint8Array(512)}};
 return {ctx,calls,stage4Result,adapters,wordText:()=>wordText};
}
const run=f=>createProtectedAutomaticCoordinator(f.adapters).prepareDraft({authenticatedSession:'test-session',caseId:id});
test('actual endpoint contracts Stage4 → reviewer intermediate → Stage5 → Word',async()=>{
 const f=fixture();const result=await run(f);
 assert.deepEqual(f.calls.map(c=>new URL(c.url).pathname),['/stage4-proposal','/stage5-document']);
 assert.equal(result.author.panelId,17);assert.equal(result.intermediateDecision.panelId,19);
 assert.equal(result.stage5.panelId,19);assert.equal(result.expertApproved,false);
 assert.match(f.wordText(),/Текст от Етап 5/u);
 assert.equal(f.calls[1].body.expertConfirmed,false);
 assert.equal(f.calls[1].body.automaticReviewerIntermediate,true);
 assert.equal(f.calls[1].body.reviewerIntermediateProof,'synthetic-proof');
 assert.equal(f.calls[1].body.documentTitle,'Произнасяне по възражение');
});
test('no reviewer proof means no Stage5 request and no Word',async()=>{
 const f=fixture();f.stage4Result.reviewerIntermediateProof=null;
 const r=await run(f);assert.equal(r.status,'intermediate_review_unavailable');
 assert.equal(f.calls.length,1);assert.equal(f.wordText(),'');
});
test('Stage5 draft is not accepted if it says document was issued',async()=>{
 const f=fixture();const original=f.adapters.generateStage5Draft;
 f.adapters.generateStage5Draft=async p=>({...await original(p),expertApproved:true});
 await assert.rejects(()=>run(f),/INVALID_STAGE5_AUTOMATIC_DRAFT/);
 assert.equal(f.wordText(),'');
});

test('oversized Stage 5 falls back after upstream 413 without changing the signed handoff',async()=>{
 const documents=Array.from({length:18},(_,i)=>({source:'Документ '+i,text:'Ж'.repeat(2600)}));
 const f=fixture({documents,stage5MaxBytes:42000});
 const result=await run(f);
 assert.equal(result.stage5.panelId,19);
 assert.match(f.wordText(),/Текст от Етап 5/u);
 assert.equal(f.calls.length,3);
 const request=f.calls[2].body;
 assert.ok(new TextEncoder().encode(JSON.stringify(request)).length<=41000);
 assert.equal(request.confirmedStage4Text,reviewerText);
 assert.equal(request.reviewerIntermediate.reviewedText,reviewerText);
 assert.equal(request.reviewerIntermediateProof,'synthetic-proof');
 assert.deepEqual(request.caseContext.documents.map(d=>d.source),documents.map(d=>d.source));
 assert.ok(request.caseContext.documents.every(d=>d.excerptOnly===true&&d.text.includes('извадка')));
});
