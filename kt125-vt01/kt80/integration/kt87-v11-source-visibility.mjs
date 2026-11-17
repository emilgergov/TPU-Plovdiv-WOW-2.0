/* KT87 VT03 — V11 source visibility only. No automatic legal qualification.
   The locked, audited V11 registry is the source of identifiers and citations;
   archival matches are never presented as case-specific applicability. */
import {VERIFIED_ARTICLES, LOCKED_ARCHIVE, LOCKED_ARCHIVE_SHA256} from './v11-trusted-source-registry.mjs';

const $=id=>document.getElementById(id);
const mk=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
function start(){
 const panel=document.querySelector('.kt80-stage-panel[data-panel="4"]');
 if(!panel||$('kt87V11Sources'))return;
 const source=mk('section');source.id='kt87V11Sources';
 source.style.cssText='border:1px solid #9fb18e;border-left:5px solid #d7bb7b;border-radius:9px;background:#203f30;padding:13px;margin:12px 0;';
 const title=mk('h3','Нормативен MASTER V11 · проверени архивни препратки');
 title.style.cssText='font:700 18px/1.3 "Segoe UI",Arial,sans-serif;color:#f2d38e;margin:0 0 8px';source.append(title);
 const info=mk('p','Източник: заключен индекс на V11. Изборът показва удостоверен в архива цитат, но НЕ доказва приложимост, компетентност или готовност за процедура.');
 info.style.cssText='font:13px/1.5 "Segoe UI",Arial,sans-serif;margin:0 0 10px;color:#edf2df';source.append(info);
 const pick=mk('select');pick.id='kt87V11Article';pick.setAttribute('aria-label','Избери проверена нормативна препратка');
 pick.style.cssText='width:100%;min-width:0;max-width:100%;padding:9px;background:#fcfaf0;color:#16392b;font:14px "Segoe UI",Arial;border-radius:7px';
 pick.append(new Option('Избери разпоредба от проверения индекс V11',''));
 const records=Object.values(VERIFIED_ARTICLES).sort((a,b)=>a.act.localeCompare(b.act,'bg')||a.article.localeCompare(b.article,'bg'));
 records.forEach(r=>pick.append(new Option(r.act+' · '+r.article,r.id)));
 source.append(pick);
 const detail=mk('div');detail.id='kt87V11Detail';detail.setAttribute('role','status');detail.style.cssText='white-space:pre-wrap;font:13px/1.5 "Segoe UI",Arial;color:#ecf1e5;margin:10px 0;overflow-wrap:anywhere;';
 source.append(detail);
 const status=mk('p');status.id='kt87V11Diagnostics';status.style.cssText='font:12px/1.45 "Segoe UI",Arial;color:#efd08a;margin:8px 0';source.append(status);
 const buttons=mk('div');buttons.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
 const use=mk('button','Предай ИД към проверката на компетентността');use.type='button';
 const refresh=mk('button','Провери връзката V11');refresh.type='button';
 use.style.cssText=refresh.style.cssText='padding:9px 12px;border-radius:7px;background:#dbbd75;color:#173527;font-weight:700;cursor:pointer;border:1px solid #f0d58e;';
 buttons.append(use,refresh);source.append(buttons);
 const update=()=>{
  const r=VERIFIED_ARTICLES[pick.value];
  detail.textContent=r?['Архивен ИД: '+r.id,'Акт: '+r.act,'Разпоредба: '+r.article,'Път ВЪТРЕ в заключения ZIP: '+r.archivePath,'Контролирана извадка: '+r.anchor,'SHA-256 на документа: '+r.documentSha256,'Статус: архивна препратка; приложимостта остава за независима експертна преценка.'].join('\n'):'Налични в проверения индекс: '+records.length+' разпоредби. Архивът е идентифициран като '+LOCKED_ARCHIVE+'.';
 };
 const diagnostics=()=>{
  const wf=window.KT80WorkflowState||{};
  const bridge=window.KT83NormativeArchiveV11;
  const p=window.KT83V11CaseEvidenceProvider;
  const confirmed=!!wf.subjectConfirmed?.expertConfirmed&&!!wf.subjectConfirmed?.scopeConfirmed;
  const context={caseId:wf.caseCycleId,generation:wf.generation,evidenceRevision:window.KT82EvidenceInvalidation?.getRevision?.()??0,subject:wf.subjectConfirmed?.text,scope:wf.subjectConfirmed?.scope};
  let review=null;try{review=p?.getCaseReview?.(context)}catch(_){}
  status.textContent='Контролна точка: '+(confirmed?'предмет и обхват потвърдени':'предмет/обхват не са потвърдени')+
   ' · индекс V11: '+records.length+' проверени препратки'+
   ' · свързващ модул: '+(bridge?.available?'достъпен':'неактивен')+
   ' · правна експертна приемка: '+(review?'налична':'непотвърдена')+
   ' · архив SHA-256: '+LOCKED_ARCHIVE_SHA256.slice(0,12)+'…'+
   '. Непотвърдената експертна приемка не означава липса на V11.';
 };
 pick.onchange=update;refresh.onclick=diagnostics;
 use.onclick=()=>{
  const field=$('kt83P5CompetenceRegistry');
  if(!pick.value)return;
  if(field){field.value=pick.value;field.dispatchEvent(new Event('input',{bubbles:true}));detail.textContent+='\nИД е прехвърлен като предложение за проверка. Компетентността НЕ е удостоверена.';}
  else detail.textContent+='\nИД: '+pick.value+' — поле за компетентност не е достъпно.';
 };
 const target=$('kt86Matrix')?.querySelector('.kt86-panel:nth-child(2)')||panel;
 const first=target.querySelector('.kt86-norm');
 if(first?.parentNode===target)target.insertBefore(source,first);else target.append(source);
 update();diagnostics();
 ['kt80:case-change','kt80:case-reset','kt82:evidence-invalidated','kt80:stage-open'].forEach(evt=>document.addEventListener(evt,diagnostics));
 window.KT87V11SourceStatus=Object.freeze({diagnostics,archive:LOCKED_ARCHIVE,indexCount:records.length});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,1450),{once:true});
else setTimeout(start,1450);
