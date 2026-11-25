// KT134 actual hosted synthetic-case acceptance against separate EG staging.
// Produces a genuine institutional Word DOCX; never uses real dossiers.
import {writeFile,mkdir} from 'node:fs/promises';
import * as fflate from 'fflate';
import {createDraftWordAdapter} from './kt134-auto-word-adapter.mjs';
const base=process.env.KT134_EG_BASE||'https://tpu-plovdiv-kt134-eg-test.emilgergov.workers.dev';
const token=process.env.LIVE_EG_TOKEN||'';
if(!token)throw Error('KT134 live EG secret is unavailable');
const id='KT134-SYNTHETIC-ACCEPTANCE',revision='SYNTHETIC-1';
const subject='Синтетично инвестиционно предложение за вътрешно преустройство на съществуващо складово помещение';
const scope='Предвижда се вътрешна промяна на разпределението в съществуваща складова сграда, без данни за ново строителство или промяна на площта на поземления имот. Материалът е измислен и предназначен само за проверка на автоматичния маршрут.';
const stage4={
 task:'draft_normative_proposal',documentType:'PROJECT_NOT_ACT',
 caseId:id,requestId:'kt134-live-synthetic-001',evidenceRevision:revision,
 subject,scope,parcelIds:['00000.1.1'],
 evidence:[
  {factId:'TEST_F1',value:'Предмет: вътрешно преустройство на съществуваща складова сграда',status:'established',sourceId:'synthetic-notice',sourceLocation:'страница 1',description:'Тестово описание'},
  {factId:'TEST_F2',value:'В тестовия документ не са заявени нови строителни площи',status:'established',sourceId:'synthetic-notice',sourceLocation:'страница 1',description:'Синтетично обстоятелство'}
 ],
 archive:{sha256:'8d3851affd72fb44b4d663920196e00ec317c8e45d36fc16c6ad6b0ce965226c',name:'V11 MASTER',verifiedReferences:[]},
 constraints:{expertApprovalRequired:true,neverIssueAct:true},
 completeCaseEvidence:{
  archiveName:'Синтетичен тестов комплект',sourceTextCount:1,
  sourceTexts:[{source:'synthetic-notice',text:'ТЕСТОВ ДОКУМЕНТ — НЕ Е РЕАЛНА ПРЕПИСКА. В съществуващо складово помещение се предвижда вътрешно преустройство, без ново строителство. Не са посочени капацитет и технологични характеристики, тъй като случаят е измислен. Няма приложени географски доказателства.',totalChars:235,truncated:false}],
  documentRecords:[],documents:[]
 }
};
async function post(route,data){
 const response=await fetch(base+route,{method:'POST',
  headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify(data),signal:AbortSignal.timeout(180000)});
 const payload=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(route+' HTTP '+response.status+' '+String(payload.error||payload.message||'unknown'));
 return payload;
}
console.log('KT134: live synthetic Stage 4 author and reviewer request');
const a=await post('/stage4-proposal',stage4);
if(a.caseId!==id)throw Error('Stage4 wrong case');
const d=a.reviewerIntermediate;
if(!d||!a.reviewerIntermediateProof||!d.intermediateConfirmed){
 console.log('Stage4 completed but reviewer intermediate approval unavailable; reason codes',
  JSON.stringify(a.qualityIssues||a.normativeAudit?.findings||[]).slice(0,600));
 throw Error('STAGE4_REVIEWER_INTERMEDIATE_NOT_READY');
}
const line=d.reviewedText.match(/ИЗБРАН\s+ПАНЕЛ\s*:\s*0?(\d{1,2})\b[^\n]*/iu)?.[0];
if(!line||Number(line.match(/\d{1,2}/)?.[0])!==d.selectedPanelId)
 throw Error('Stage4 reviewer panel mismatch');
const documentTitle=line.replace(/^ИЗБРАН\s+ПАНЕЛ\s*:\s*0?\d{1,2}\s*[—–-]?\s*/iu,'').trim();
const s5={
 task:'draft_stage5_document',caseId:id,requestId:'kt134-live-synthetic-002',
 evidenceRevision:revision,stage4Version:1,
 subject,scope,parcelIds:stage4.parcelIds,
 confirmedStage4Text:d.reviewedText,selectedPanelLine:line.trim(),
 selectedPanelId:d.selectedPanelId,documentTitle,
 incomingReference:'ОВОС-0000-00/25.11.2026 г.',
 reviewerIntermediate:d,reviewerIntermediateProof:a.reviewerIntermediateProof,
 automaticReviewerIntermediate:true,expertConfirmed:false,projectOnly:true,
 qualificationRecord:a.qualificationRecord,qualificationProof:a.qualificationProof,
 qualificationGate:a.qualificationGate
};
console.log('KT134: live Stage 5 reviewer-approved intermediate, panel',d.selectedPanelId);
const b=await post('/stage5-document',s5);
if(b.caseId!==id||b.projectOnly!==true||b.documentIssued!==false||
   b.automaticReviewerIntermediate!==true||!b.draft?.startsWith('Относно:'))
 throw Error('Stage5 not an automatic reviewer-authorized document draft');
globalThis.window=globalThis;globalThis.fflate=fflate;
const adapter=createDraftWordAdapter({fflate,templateWindow:globalThis});
const doc=await adapter.buildDraft({status:'draft',panelId:d.selectedPanelId,
 documentTitle,content:b.draft});
if(doc.length<1000)throw Error('DOCX missing');
await mkdir('kt134-auto/live-test-deliverables',{recursive:true});
await writeFile('kt134-auto/live-test-deliverables/KT134_REAL_EG_SYNTHETIC_DRAFT.docx',doc);
await writeFile('kt134-auto/live-test-deliverables/status.json',JSON.stringify({
 mode:'LIVE_EG_SYNTHETIC_ONLY',caseId:id,
 authorCalled:true,reviewerIntermediateConfirmed:true,stage5Called:true,
 selectedPanelId:d.selectedPanelId,wordBytes:doc.length,expertApproved:false,
 realDossierProcessed:false
},null,2));
console.log('KT134 LIVE PASS: Stage4 EG + reviewer interim → Stage5 EG → actual institutional DOCX, no human intermediate click');
