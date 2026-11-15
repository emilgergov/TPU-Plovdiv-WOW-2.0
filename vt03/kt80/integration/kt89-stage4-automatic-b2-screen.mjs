/* KT91: one Stage 4 presentation of the existing V11 independent evaluator.
 * Legal applicability is never inferred from a keyword, map absence or example.
 * Automatic hypotheses + concrete proposals; no user-authored JSON in main UI. */
import {LOCKED_ARCHIVE, VERIFIED_ARTICLES, verifiedReference} from './v11-trusted-source-registry.mjs';
import {assessStage4} from './stage4-independent-legal-engine.mjs';
const $=id=>document.getElementById(id);
const node=(tag,content)=>{const x=document.createElement(tag);if(content!==undefined)x.textContent=content;return x;};
const DEFINITIONS=[
 {id:'EIA_ANNEX1',title:'ОВОС · приложение № 1',kind:'investment',ref:null,fact:'annex1',exception:'annex1_exception',question:'Установени ли са конкретната дейност, категория, праг и изключения по приложение № 1?',action:'Проверете приложението и приложете доказаните технически характеристики и съответната редакция на закона.'},
 {id:'EIA_SCREEN',title:'ОВОС · преценяване на необходимостта',kind:'investment',ref:'ZOOS_93',fact:'annex2',exception:'annex2_exception',question:'Доказана ли е категорията по приложение № 2 и приложимите изключения?',action:'Съпоставете действителните дейности с точната категория, прагове и изключения по ЗООС.'},
 {id:'OS_RELEVANCE',title:'Оценка за съвместимост · ЗБР и Наредба за ОС',kind:'both',ref:null,fact:'os_relevance',exception:'os_exception',question:'Налице ли са предпоставки за ОС, включително възможни косвени въздействия?',action:'Проверете чл. 31 ЗБР и Наредбата за ОС; липсата на пресичане сама по себе си не изключва ОС.'},
 {id:'EO_ENTRY',title:'Екологична оценка · планове и програми',kind:'plan_program',ref:null,fact:'eo_relevance',exception:'eo_exception',question:'Документът е план или програма с относим режим на ЕО?',action:'Проверете естеството на документа и относимите правни предпоставки за ЕО.'},
 {id:'WATER',title:'Специален воден режим',kind:'investment',ref:null,fact:'water_trigger',exception:'water_exception',question:'Установени ли са водовземане, заустване или друга специфична дейност?',action:'Проверете дали преписката съдържа реална водна дейност и приложимите специални разпоредби.'},
 {id:'COMPETENCE',title:'Компетентност на органа',kind:'all',ref:'PRAVILNIK_RIOSV_TERRITORY',fact:'territory_confirmed',exception:'special_competence_exception',question:'Удостоверена ли е материалната, териториалната и специалната компетентност?',action:'Проверете териториалния обхват на РИОСВ – Пловдив и специалната компетентност и изключенията; не я приемайте по подразбиране.'}
];
function context(){
 const s=window.KT80WorkflowState||{},p=s.subjectConfirmed||{},e=window.KT83NormativeBridge?.getEvidence?.()||{};
 const rawKind=window.KT82UniversalStage2Result?.type||window.KT82UniversalStage2Result?.kind||s.caseKind;
 const kind=rawKind==='PLAN_PROGRAM'?'plan_program':rawKind==='INVESTMENT'?'investment':'other';
 const rev=window.KT82EvidenceInvalidation?.getRevision?.()??0;
 return {s,p,e,kind,key:[s.caseCycleId||'',s.generation||'',rev,p.text||'',p.scope||'',p.expertConfirmed,p.scopeConfirmed,kind,e.spatialClass||'',e.pdfOK||false].join('~'),
  confirmed:p.expertConfirmed===true&&p.scopeConfirmed===true,
  ids:Array.isArray(e.ids)?e.ids:[],spatial:e.spatialClass||'UNDETERMINED'};
}
function buildAssessment(c,defs){
 const rules=defs.filter(d=>d.ref&&VERIFIED_ARTICLES[d.ref]).map(d=>({
  id:d.id,title:d.title,legalBasis:verifiedReference(d.ref),
  condition:{all:[{fact:d.fact},{not:{fact:d.exception}}]},
  missingFactProposal:'Предложение: '+d.action,
  supportedProposal:'Предложение: проверете изцяло приложимостта и компетентността, след което мотивирайте '+d.title+'.',
  notSupportedProposal:'Предложение: изследвайте останалите конкуриращи се основания и изключения.'
 }));
 // An empty ledger is deliberate: subject/GIS alone does NOT establish annex
 // classifications, exception absence or statutory competence.
 return assessStage4({confirmedSubject:c.p.expertConfirmed===true?c.p.text:'',
   scopeConfirmed:c.p.scopeConfirmed===true,evidence:[],rules});
}
function start(){
 const stage=document.querySelector('.kt80-stage-panel[data-panel="4"]');
 if(!stage||$('kt91Stage4'))return;
 const rhs=$('kt86Matrix')?.querySelector('.kt86-panel:nth-child(2)')||stage;
 const box=node('section');box.id='kt91Stage4';box.style.cssText='padding:14px;border:1px solid #d6b979;border-radius:10px;background:#173d2e;color:#f5edda;margin:12px 0';
 const h=node('h3','Автоматична независима нормативна преценка · Етап 4');h.style.cssText='font-size:20px;color:#f0d18f;margin:0 0 6px';box.append(h);
 const note=node('p','Съпоставка на входните факти с всички активни групи хипотези. Неустановеното не е отрицателен факт. Предложение се извежда и при непълни данни.');
 note.style.cssText='font-size:13px;margin:0 0 12px;line-height:1.45';box.append(note);
 const status=node('div');status.setAttribute('role','status');status.style.cssText='border-left:4px solid #d8b677;background:#254d3a;padding:10px;line-height:1.45;margin-bottom:10px';box.append(status);
 const cards=node('div');cards.style.cssText='display:grid;gap:8px';box.append(cards);
 const summary=node('div');summary.style.cssText='margin-top:12px;padding:12px;border:1px solid #87a18b;border-radius:8px;background:#244a38;line-height:1.5';box.append(summary);
 const more=node('details');more.style.cssText='margin-top:12px';
 more.append(node('summary','Източници, доказателствени ограничения и независим контрол'));box.append(more);
 let snapshot=null,lastKey='';
 const oldBridge=$('kt83B2CaseBridgeStage4');
 const oldOptional=$('kt89OptionalNormChoices');
 const oldSources=$('kt87V11Sources');
 function draw(){
  const c=context();if(lastKey===c.key)return;lastKey=c.key;
  const defs=DEFINITIONS.filter(d=>c.kind==='other'||d.kind==='all'||d.kind===c.kind||d.kind==='both'&&c.kind!=='other');
  let assessment;
  try{assessment=buildAssessment(c,defs)}catch(error){status.textContent='Нормативният двигател не е достъпен: '+error.message;return}
  const findings=new Map(assessment.legalFindings.map(f=>[f.ruleId,f]));
  status.textContent='Предмет и обхват: '+(c.confirmed?'потвърдени':'непотвърдени')+
   ' · ПИ: '+(c.ids.join(', ')||'няма въведени')+
   ' · ГИС: '+(c.spatial==='OUTSIDE'?'пространствено непресичане':c.spatial==='INSIDE'?'пространствено пресичане':'недостатъчна квалификация')+
   ' · PDF1: '+(c.e.pdfOK?'отчетен':'неудостоверен')+
   '. Входните факти не се редактират в Етап 4.';
  cards.replaceChildren();
  for(const def of defs){
   const finding=findings.get(def.id);
   const card=node('div');card.style.cssText='background:#234a38;border:1px solid #668573;border-radius:8px;padding:10px';
   const title=node('strong',def.title);title.style.cssText='display:block;font-size:15px;color:#efd18f';card.append(title);
   const citation=def.ref&&VERIFIED_ARTICLES[def.ref];
   const source=node('div',citation?'V11: '+citation.act+' · '+citation.article+' · '+citation.archivePath:
     'Необходима е конкретна проверка в пълния V11 — удостоверен цитат за цялата хипотеза липсва в ограничения индекс.');
   source.style.cssText='font-size:12px;color:#caddce;margin:5px 0';card.append(source);
   const state=node('div','Автоматична оценка: '+(finding?({'supported':'ПОДКРЕПЕНА','not_supported':'НЕПОДКРЕПЕНА','undetermined':'НЕУСТАНОВЕНА','disputed':'ПРОТИВОРЕЧИВА'}[finding.state]):'НЕУСТАНОВЕНА — липсва удостоверена пълна норма'));
   state.style.cssText='font-weight:700;margin:6px 0';card.append(state);
   card.append(node('div',def.question),node('p','Следващо действие: '+def.action));cards.append(card);
  }
  summary.replaceChildren(node('strong','Автоматично мотивирано предложение'));
  summary.append(node('p',c.confirmed?'Входните предмет и обхват са потвърдени от експерта.':'Потвърдете предмета и обхвата в Етап 2, преди окончателната експертна преценка.'));
  const msg=c.kind==='investment'?'Проверете конкурентно режимите по приложения № 1 и № 2 към ЗООС и относимия ред за ОС.':
    c.kind==='plan_program'?'Проверете режимите за екологична оценка и ОС, включително изключенията и възможната координация.':
    'Установете вида на административния вход; не се избира инвестиционна или планова процедура без доказан предмет.';
  summary.append(node('p',msg+' Изискайте конкретно липсващите технически характеристики; отделно потвърдете компетентността. Това е предварително предложение, а не определена процедура.'));
  more.replaceChildren(node('summary','Източници, доказателствени ограничения и независим контрол'));
  more.append(node('p','Проверен архив: '+LOCKED_ARCHIVE+'. Правните цитати са проверени архивни текстове; приложимостта и изключенията се оценяват за конкретната преписка.'));
  if(oldBridge){const technical=node('details');technical.append(node('summary','Експертен контрол с независимия механизъм V11'));technical.append(oldBridge);more.append(technical)}
  if(oldOptional)more.append(oldOptional);
  if(oldSources)more.append(oldSources);
  snapshot=Object.freeze({caseKey:c.key,archive:LOCKED_ARCHIVE,legalFindings:assessment.legalFindings,
   proposals:assessment.proposals,screenProposal:msg,expertApproved:false,finalProcedure:false,
   readyForStage5Draft:false,source:'stage4-independent-legal-engine.mjs'});
 }
 const first=rhs.querySelector('#kt89B2Automatic')||rhs.querySelector('#kt89OptionalNormChoices')||rhs.querySelector('#kt87V11Sources');
 if(first)first.before(box);else rhs.prepend(box);
 const duplicate=$('kt89B2Automatic');if(duplicate)duplicate.remove();
 ['kt80:stage-open','kt80:case-change','kt80:case-reset','kt82:evidence-invalidated'].forEach(event=>document.addEventListener(event,()=>{lastKey='';draw()}));
 window.KT89AutomaticB2=Object.freeze({refresh:()=>{lastKey='';draw()},snapshot:()=>snapshot});
 draw();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,1250),{once:true});
else setTimeout(start,1250);
