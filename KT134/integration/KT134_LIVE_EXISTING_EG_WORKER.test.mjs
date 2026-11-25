import fs from 'node:fs';
const base='https://tpu-plovdiv-kt134-eg-test.emilgergov.workers.dev';
const bearer=process.env.KT134_SMOKE_BEARER;
if(!bearer)throw new Error('Live test bearer missing');
const headers={'Content-Type':'application/json',Authorization:'Bearer '+bearer};
const excerpt='Възражение относно текст в предходно писмо на компетентния орган. Възложителят посочва, че инвестиционното предложение е за модернизация на съществуващ склад в един поземлен имот, без ново строителство. Съществуващото писмо съдържа спорна формулировка за защитена зона. Възложителят иска административна проверка и корекция на текста, но не представя ново инвестиционно предложение. Това са синтетични данни за тест, които не доказват действително пространствено положение.';
const caseId='KT134-EG-LIVE-SYNTHETIC-20261125',rev='KT134-SYNTH-1';
const report={environment:base,caseId,realModelsCalled:false,sourceSpan:null,stage4:null,stage5:null};
async function post(route,payload,timeoutMs=130000){
 const ctl=new AbortController(),timeout=setTimeout(()=>ctl.abort(),timeoutMs);
 try{
  const resp=await fetch(base+route,{method:'POST',headers,body:JSON.stringify(payload),signal:ctl.signal});
  const raw=await resp.text();let data;
  try{data=JSON.parse(raw)}catch{data={error:'Non-JSON response',rawSnippet:raw.slice(0,150)}}
  return {http:resp.status,data};
 }finally{clearTimeout(timeout)}
}
function assertion(c,msg){if(!c)throw new Error(msg)}
const health=await fetch(base+'/kt134-candidate-health');
const healthData=await health.json();
assertion(health.ok&&healthData.contract==='KT134_EVIDENCE_SPAN_V1'&&healthData.aiConfigured===true,
 'Wrong candidate health or AI configuration');
const sourceReq={task:'read_case_evidence_span',caseId,evidenceRevision:rev,
 requestId:'EG-LIVE-SOURCE-01',
 chunk:{source:'Синтетично възражение.txt',documentIndex:0,start:0,end:excerpt.length,totalChars:excerpt.length,text:excerpt}};
const source=await post('/kt134-evidence-span',sourceReq,75000);
report.sourceSpan={http:source.http,examined:source.data.examined===true,
 claims:source.data.claims?.length??0,matched:(source.data.claims||[]).filter(x=>x.sourceQuoteMatched===true).length,
 sourceTextStored:source.data.sourceTextStored};
assertion(source.http===200,'Real dossier source reader unavailable: '+source.http+' '+String(source.data.error||''));
assertion(source.data.examined===true&&source.data.caseId===caseId,'Real model did not examine document');
assertion((source.data.claims||[]).every(x=>x.sourceQuoteMatched===true&&excerpt.includes(x.quote)),
 'Not all quotes matched original source text');
report.realModelsCalled=true;
console.log('LIVE REAL MODEL: full synthetic document examined; anchored quotes:',report.sourceSpan.matched);
const sourceAnchoredClaims=(source.data.claims||[]).map(x=>({
 source:x.source,documentIndex:x.documentIndex,start:x.start,end:x.end,quote:x.quote,summary:x.summary
}));
const payload={
 task:'draft_normative_proposal',documentType:'PROJECT_NOT_ACT',
 caseId,evidenceRevision:rev,requestId:'EG-LIVE-STAGE4-01',
 subject:'Възражение относно съдържанието на писмо на РИОСВ – Пловдив',
 scope:'Административно разглеждане на възражение за редакция на предходно писмо без нов инвестиционен предмет',
 parcelIds:[],
 evidence:[
  {factId:'dossier_received',value:'true',status:'established',sourceId:'синтетично възражение',sourceLocation:'Етап 1',description:'Възражение срещу формулировка в предходно писмо'},
  {factId:'objection_subject',value:'Корекция на писмо',status:'established',sourceId:'Синтетично възражение.txt',sourceLocation:'стр. 1',description:'Иска се преценка на възражение, не нова процедура по ИП'},
  {factId:'parcel_identifiers_confirmed',value:'unknown',status:'missing',sourceId:'синтетично възражение',sourceLocation:'Етап 2',description:'Няма потвърден имот в тази тестова преписка'},
  {factId:'spatial_intersection',value:'unknown',status:'missing',sourceId:'Синтетична преписка',sourceLocation:'Етап 3',description:'За жалба не се предполага ГИС резултат'}
 ],
 archive:{sha256:'8d3851affd72fb44b4d663920196e00ec317c8e45d36fc16c6ad6b0ce965226c',
 verifiedReferences:[]},
 constraints:{expertApprovalRequired:true,neverIssueAct:true},
 completeCaseEvidence:{
   sourceTexts:[{source:'Синтетично възражение.txt',text:excerpt,totalChars:excerpt.length,truncated:false}],
   documentRecords:[{source:'Синтетично възражение.txt',name:'Синтетично възражение.txt'}],
   kt134DossierCoverage:{complete:true,allClaimEvidenceIncluded:true,expectedChunks:1,examinedChunks:1,
    unexamined:[],unreadableDocuments:[],sourceAnchoredClaims}
 }
};
const stage4=await post('/stage4-proposal',payload,145000);
report.stage4={http:stage4.http,modelReturnedDraft:typeof stage4.data.draft==='string'&&stage4.data.draft.length>=120,
 draftChars:stage4.data.draft?.length||0,reviewed:stage4.data.normativeAudit?.reviewed===true,
 selectedPanel:stage4.data.normativeAudit?.selectedPanelId??null,
 qualificationProof:!!stage4.data.qualificationProof,
 sourceAnchorsMatched:stage4.data.qualificationGate?.sourceAnchorsMatched===true,
 qualityIssues:(stage4.data.qualityIssues||stage4.data.normativeAudit?.findings||[]).length,
 error:stage4.data.error||null};
console.log('LIVE EG Author/Reviewer:',JSON.stringify(report.stage4));
if(stage4.http===200&&report.stage4.modelReturnedDraft&&report.stage4.qualificationProof&&report.stage4.sourceAnchorsMatched){
 const direction=stage4.data.draft.match(/ИЗБРАН\s+ПАНЕЛ\s*:\s*0?(\d{1,2})\b[^\n]*/iu);
 if(direction){
  const line=direction[0].trim(),title=line.replace(/^ИЗБРАН\s+ПАНЕЛ\s*:\s*0?\d{1,2}\s*[—–-]?\s*/iu,'').trim();
  const payload5={
   task:'draft_stage5_candidate',projectOnly:true,expertConfirmed:false,caseId,evidenceRevision:rev,
   requestId:'EG-LIVE-STAGE5-01',stage4Version:1,confirmedStage4Text:stage4.data.draft,
   selectedPanelLine:line,documentTitle:title,incomingReference:'ОВОС-ХХХХ/ХХ.ХХ.ХХХХ г.',
   subject:payload.subject,scope:payload.scope,parcelIds:[],
   qualificationRecord:stage4.data.qualificationRecord,
   qualificationProof:stage4.data.qualificationProof,
   qualificationGate:stage4.data.qualificationGate,
   stage5Evidence:{caseId,evidenceRevision:rev,documents:[{name:'Синтетично възражение.txt'}],
    sourceTexts:[{source:'Синтетично възражение.txt',text:excerpt,truncated:false,totalChars:excerpt.length}],
    evidenceLedger:{allSpansExamined:true,expectedChunks:1,examinedChunks:1,claimsTotal:sourceAnchoredClaims.length,
      claimsIncluded:sourceAnchoredClaims.length,anchoredEvidence:sourceAnchoredClaims},
    observations:[],gis:{pdf1Available:false,spatialClass:'UNKNOWN'}}
  };
  const stage5=await post('/stage5-document',payload5,120000);
  report.stage5={http:stage5.http,unapproved:stage5.data.kt134PreFinal===true,
   draftChars:stage5.data.draft?.length||0,
   findings:stage5.data.kt134Content?.findings?.length||0,error:stage5.data.error||null};
  console.log('LIVE EG Stage5 PRE-FINAL:',JSON.stringify(report.stage5));
 }
}
fs.writeFileSync(process.env.KT134_REPORT_PATH||'kt134-live-result.json',JSON.stringify(report,null,2));
if(source.http!==200||stage4.http!==200||!report.stage4.modelReturnedDraft||!report.stage4.reviewed)
 throw new Error('Live E4 Author/Reviewer acceptance not met; see sanitized report');
if(!report.stage5||report.stage5.http!==200||!report.stage5.unapproved||report.stage5.draftChars<120)
 throw new Error('Live E5 prefinal acceptance not met; see sanitized report');
console.log('KT134 LIVE EG TEST: PASS (real AI source+review+prefinal draft, no final expert signing, no Word claimed).');
