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
 const refs=()=>Object.values(VERIFIED_ARTICLES).filter(r=>['ZOOS_93','N_OS_6A','PRAVILNIK_RIOSV_TERRITORY'].includes(r.id))
  .map(r=>({id:r.id,act:r.act,article:r.article,archivePath:r.archivePath,textAnchor:r.anchor,
   citationVerified:true,applicabilityVerified:false}));
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
   output.textContent=data.draft;output.style.display='block';
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
 return true;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1500),{once:true});
else setTimeout(boot,1500);
