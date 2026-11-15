/* KT96 EG AUTHOR — case-bound AI draft at entry to Stage 4.
 * Draft only. Does not issue administrative acts or assert independently verified law.
 * Uses the SAME one-cycle RAM credential as Stage 2.
 * Required server contract: POST /stage4-proposal -> echoed caseId,
 * evidenceRevision, requestId and draft. No response identity -> no accepted draft.
 * Distinct experts' credentials never travel inside the case evidence payload. */
import {collectStageEvidence,verifyStageEvidence} from './kt95-stage-evidence-handoff.mjs';
import {VERIFIED_ARTICLES,LOCKED_ARCHIVE,LOCKED_ARCHIVE_SHA256} from './v11-trusted-source-registry.mjs';

const ENDPOINT='https://tpu-plovdiv-ai-author-v27.emilgergov.workers.dev/stage4-proposal';
const $=id=>document.getElementById(id);
const make=(tag,txt)=>{const n=document.createElement(tag);if(txt!==undefined)n.textContent=txt;return n;};
const str=x=>String(x??'').trim();
function boot(){
 const host=$('kt91Stage4');if(!host||$('kt96EGAuthor'))return false;
 const ui=make('section');ui.id='kt96EGAuthor';ui.style.cssText='padding:14px;margin:12px 0;border:2px solid #c9aa6b;border-radius:9px;background:#143c2b;color:#f7f0db';
 ui.append(make('h3','EG AI Автор · проект за Етап 4'));
 ui.append(make('p','При влизане в Етап 4 EG Авторът предлага проект по фактите от Етапи 1–3 и наличните нормативни източници. Проектът НЕ е административен акт и не удостоверява правна приложимост.'));
 const button=make('button','Изготви проект с EG Автора');button.type='button';button.id='kt96EGGenerate';
 button.style.cssText='background:#d9b874;color:#173a28;padding:10px 14px;font-weight:800;border:0;border-radius:7px;cursor:pointer';
 const status=make('p','EG Авторът още не е изготвил проект.');status.id='kt96EGStatus';status.setAttribute('role','status');
 const output=make('div');output.id='kt96EGDraft';output.style.cssText='white-space:pre-wrap;line-height:1.6;border-left:4px solid #d4ba80;padding:12px;background:#244a37;color:#fff;display:none';
 ui.append(button,status,output);
 const dialog=make('dialog');dialog.id='kt96EGPassword';dialog.style.cssText='background:#193b2d;color:#fff3db;border:1px solid #d9b874;border-radius:10px;padding:20px;max-width:460px';
 const form=make('form');form.method='dialog';
 const label=make('label','Парола за EG Автора — един път в работния цикъл');
 const password=make('input');password.type='password';password.required=true;password.autocomplete='off';password.style.cssText='display:block;width:100%;margin:10px 0;padding:10px';
 label.append(password);
 const send=make('button','Изготви проект');send.type='submit';
 const cancel=make('button','Отказ');cancel.type='button';cancel.addEventListener('click',()=>{password.value='';dialog.close()});
 form.append(label,send,cancel);dialog.append(form);document.body.append(dialog);
 const target=$('kt93EvidenceTrace')||$('kt91Proposal');
 if(target)host.insertBefore(ui,target);else host.append(ui);
 // CaseCycleId is unique to this local workflow, NOT a guaranteed multi-user persistent case identifier.
 // If the private case service provides a persistent ID, use only an explicit verified binding.
 const caseIdentity=()=>{
  const w=window.KT80WorkflowState||{},h=collectStageEvidence(window);
  let bound=null;
  try{bound=window.KT84ProtectedWorkflow?.getVerifiedCase?.()||null}catch(_){}
  const permanent=bound?.verified===true&&str(bound?.caseId)?str(bound.caseId):null;
  return {w,h,caseId:permanent||h.caseId,caseIdType:permanent?'shared-verified':'local-cycle',
   signature:[permanent||h.caseId,h.generation,h.evidenceRevision,h.key].join('::')};
 };
 // Only the locked, audited references are shipped; text anchors are NOT full articles.
 // The server must attach exact V11 text before asserting a grounded normative draft.
 const refs=()=>Object.values(VERIFIED_ARTICLES)
  .map(r=>({id:r.id,act:r.act,article:r.article,archivePath:r.archivePath,textAnchor:r.anchor,
   citationVerified:true,applicabilityVerified:false}));

 // KT99: transport extracted case material, not a mere document count.
 // Source text is untrusted dossier evidence; NEVER promote it to an approved finding.
 // Payload is bounded for the protected Worker; preserve source identity and mark truncation.
 const compact=(x,max=1300)=>str(x).slice(0,max);
 const serializable=(x,max=5000)=>{try{return JSON.stringify(x).slice(0,max)}catch(_){return ''}};
 function stageEvidenceDetail(w,h){
  const intake=w.intake||{},documents=Array.isArray(intake.document_texts)?intake.document_texts:[];
  const dossier=Array.isArray(intake.dossier_documents)?intake.dossier_documents:[];
  const pages=Array.isArray(intake.page_text_index)?intake.page_text_index:[];
  const files=Array.isArray(intake.files)?intake.files:[];
  const budgets={documents:49000,pageText:15000};
  let remaining=budgets.documents;
  const sourceTexts=documents.slice(0,60).map(d=>{
   const source=compact(d?.source,200);
   const raw=str(d?.text),length=Math.min(remaining,16000,raw.length);
   const excerpt=raw.slice(0,length);
   remaining-=length;
   return {source,text:excerpt,totalChars:raw.length,truncated:length<raw.length,
    status:'SOURCE_TEXT_NOT_EXPERT_VERIFIED'};
  }).filter(d=>d.source&&d.text);
  return {
   archiveName:compact(intake.archive_name,180),
   documents:files.slice(0,80).map(d=>({file:compact(d?.name||d?.file||d?.source,180),
    status:compact(d?.status||d?.state||d?.readStatus,150)})),
   documentRecords:dossier.slice(0,35).map(d=>({file:compact(d.file,180),
    type:compact(d.type,50),readable:d.readable===true,
    facts:Array.isArray(d.facts)?d.facts.slice(0,12).map(f=>({
     key:compact(f.key,80),value:compact(f.value,500),source:compact(f.source,180),
     verified:false})):[],
    references:Array.isArray(d.references)?d.references.slice(0,12):[]})),
   sourceTexts,
   pageTexts:pages.slice(0,50).map(p=>({file:compact(p.file,180),page:p.page,
    text:compact(p.text,300),verified:false})),
   sourceTextCount:documents.length,
   sourceTextTruncated:sourceTexts.some(d=>d.truncated)||documents.length>sourceTexts.length,
   dossierEvidence:Array.isArray(intake.evidence)?intake.evidence.slice(0,50):[],
   subjectCandidates:Array.isArray(intake.subject_candidates)?intake.subject_candidates.slice(0,12).map(s=>({
    source:compact(s.source,180),title:compact(s.title,500),
    sections:Array.isArray(s.sections)?s.sections.slice(0,15).map(t=>({
     key:compact(t.key,50),text:compact(t.text,1200),source:compact(t.source,180),
     reviewRequired:true})):[]})):[],
   semanticReview:intake.semantic_review||null,
   gis:{
    parcelIds:[...h.parcelIds],
    sourceSummary:h.observations.filter(x=>/parcel|spatial|pdf/i.test(x.factId)),
    piMaster:serializable(window.KT80PIMaster?.getResult?.(),4500),
    spatial:serializable(window.KT83NormativeBridge?.getEvidence?.(),5500),
    stage3:serializable(window.KT80Stage3?.getResult?.(),4500),
    areaContext:serializable(window.KT81ContextScreen?.getResult?.(),2600)
   }
  };
 }
 let serial=0,pendingSignature='',finishedSignature='',lastResult=null;
 const clear=()=>{
  serial++;pendingSignature='';finishedSignature='';lastResult=null;password.value='';
  if(dialog.open)dialog.close();button.disabled=false;output.textContent='';output.style.display='none';
  status.textContent='EG Авторът още не е изготвил проект.';
 };
 async function generate(firstPassword=null){
  const identity=caseIdentity(),{w,h}=identity,p=w.subjectConfirmed||{};
  if(!(p.expertConfirmed===true&&p.scopeConfirmed===true)){
   status.textContent='Необходимо е потвърждение на предмета и обхвата в Етап 2.';return;
  }
  if(!verifyStageEvidence(h,window)){status.textContent='Доказателственият пакет е променен. Върнете се към потвърдените данни.';return;}
  if(!window.KT80EGSession?.request){status.textContent='Липсва защитената сесия с EG Автора.';return;}
  if(!firstPassword&&!window.KT80EGSession.hasAccess()){dialog.showModal();return;}
  const requestId=window.crypto?.randomUUID?.();
  if(!requestId){status.textContent='Не може да се създаде уникален ИД за заявката.';return;}
  const ticket=++serial;
  pendingSignature=identity.signature;finishedSignature='';lastResult=null;
  button.disabled=true;output.style.display='none';output.textContent='';
  status.textContent='EG Авторът подготвя проект за текущата преписка. Това не е окончателна правна преценка.';
  const request={
   task:'draft_normative_proposal',documentType:'PROJECT_NOT_ACT',
   caseId:identity.caseId,caseIdType:identity.caseIdType,
   localCycleId:h.caseId,generation:h.generation,evidenceRevision:h.evidenceRevision,requestId,
   subject:str(p.text),scope:str(p.scope),
   evidence:h.observations.map(x=>({factId:x.factId,value:x.value,status:x.status,
    sourceId:x.sourceId,sourceLocation:x.sourceLocation,description:x.description})),
   parcelIds:h.parcelIds,
   completeCaseEvidence:stageEvidenceDetail(w,h),
   archive:{name:LOCKED_ARCHIVE,sha256:LOCKED_ARCHIVE_SHA256,verifiedReferences:refs(),
    archivedTextIncluded:false},
   constraints:{noInventedFacts:true,noInventedCitations:true,expertApprovalRequired:true,
    legalAppplicabilityMustBeVerified:true,neverIssueAct:true}
  };
  try{
   const response=await window.KT80EGSession.request(ENDPOINT,JSON.stringify(request),firstPassword);
   const data=await response.json().catch(()=>({}));
   if(ticket!==serial||pendingSignature!==caseIdentity().signature)return;
   if(response.status===401||response.status===403){status.textContent='Достъпът до EG Автора е отказан. Паролата за тази сесия е изчистена.';return;}
   if(!response.ok){status.textContent='EG услугата не генерира проект (код '+response.status+'). Не показвам програмиран текст като AI резултат.';return;}
   if(data.caseId!==identity.caseId||data.evidenceRevision!==h.evidenceRevision||data.requestId!==requestId){
    status.textContent='Отхвърлен е AI отговор без потвърдена идентичност на преписката, заявката и редакцията.';return;
   }
   if(data.projectOnly!==true||data.expertReviewRequired!==true||!str(data.draft)){
    status.textContent='Отхвърлен е AI отговор без обозначение „проект за експертен преглед“ или без съдържание.';return;
   }
   finishedSignature=identity.signature;lastResult=Object.freeze({
    caseId:identity.caseId,localCycleId:h.caseId,evidenceRevision:h.evidenceRevision,
    requestId,draft:data.draft,projectOnly:true,expertApproved:false,
    providerArchiveEvidenceVerified:data.archiveEvidenceVerified===true
   });
   const receipt=data.evidenceReceipt||{};
   const dossierCount=Number(receipt.documentTextsReceived)||0;
   const availableCount=Number(receipt.documentTextsAvailable)||0;
   const sourceInfo='Входни данни: '+dossierCount+' от '+availableCount+
     ' документа с извлечен текст; '+(Number(receipt.caseFactsReceived)||0)+
     ' доказателствени позиции; ГИС: '+(receipt.gisContextReceived?'предаден':'липсва')+
     '; нормативни препратки: '+(Number(receipt.archiveIndexRecordsReceived)||0)+
     '; пълни текстове на разпоредби: '+(Number(receipt.archiveArticleTextsReceived)||0)+'.'+
     (receipt.documentTextTruncated?' Част от документалния текст е съкратена по технически лимит.':'');
   output.textContent=sourceInfo+String.fromCharCode(10,10)+data.draft;output.style.display='block';
   status.textContent=data.archiveEvidenceVerified===true?
     'Получен е проект от EG Автора. Предстои независима правна и експертна проверка.':
     'Получен е проект от EG Автора. Пълният нормативен текст V11 не е удостоверен като използван; цитатите трябва да бъдат проверени.';
  }catch(err){
   if(ticket===serial)status.textContent='Няма потвърден отговор от EG Автора: '+(String(err?.message||err)==='Failed to fetch'?
    'мрежова грешка или липсващ достъпен сървърен маршрут.':'връзката с услугата не е установена.')+' Не е заместен с алгоритмичен текст.';
  }finally{
   if(ticket===serial){button.disabled=false;pendingSignature='';}
  }
 }
 button.addEventListener('click',()=>generate());
 form.addEventListener('submit',e=>{e.preventDefault();const p=password.value;password.value='';dialog.close();generate(p)});
 document.addEventListener('kt80:stage-open',e=>{if(e.detail?.step===4&&!pendingSignature&&!finishedSignature&&window.KT80EGSession?.hasAccess())generate()});
 ['kt80:case-reset','kt80:case-change','kt82:evidence-invalidated'].forEach(e=>document.addEventListener(e,clear));
 window.KT96EGStage4=Object.freeze({refresh:()=>generate(),snapshot:()=>finishedSignature===caseIdentity().signature?lastResult:null,
  getStatus:()=>status.textContent});
 // The Stage 4 panel can already be active when this module finishes loading.
 if(window.KT80WorkflowState?.step===4&&window.KT80EGSession?.hasAccess())generate();
 return true;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1500),{once:true});
else setTimeout(boot,1500);
