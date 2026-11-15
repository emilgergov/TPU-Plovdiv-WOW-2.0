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
/* KT92: use the existing, case-bound V11 review provider before any fallback.
 * Never turn the dossier title, GIS overlay or selected organ into legal proof. */
function reviewedCase(c){
 const provider=window.KT83V11CaseEvidenceProvider;
 const ctx={caseId:c.s.caseCycleId,generation:c.s.generation,
   evidenceRevision:window.KT82EvidenceInvalidation?.getRevision?.()??0,
   subject:c.p.text,scope:c.p.scope};
 if(!provider||!c.confirmed)return null;
 const r=provider.getCaseReview?.(ctx);
 return r&&provider.verifyCaseReview?.(r,ctx)===true?r:null;
}
/* KT93: collect only case-bound, provenance-labelled facts already established
 * by earlier stages. A confirmed fact is not proof of legal applicability.
 * Never infer the nature of an activity from the dossier title. */
function caseEvidence(c){
 const facts=[],add=(factId,value,sourceId,sourceType,sourceLocation)=>{
  if(value==='true'||value==='false')facts.push({factId,value,sourceId,sourceType,sourceLocation});
 };
 if(c.p.expertConfirmed===true&&c.p.text)
  add('subject_confirmed','true','KT83:subjectConfirmed','expert-confirmation','Етап 2 · потвърден предмет');
 if(c.p.scopeConfirmed===true&&c.p.scope)
  add('scope_confirmed','true','KT83:scopeConfirmed','expert-confirmation','Етап 2 · потвърден обхват');
 if(c.e.pdfOK===true)
  add('pdf1_created','true','KT82:PDF1','GIS-document','Етап 3 · PDF1; проверете оригиналния документ');
 // Only a confirmed spatial classification is factual; absence of
 // intersection does not disprove an indirect impact or exempt OS.
 if(c.e.pdfOK===true&&(c.spatial==='OUTSIDE'||c.spatial==='INSIDE'))
  add('spatial_intersection',c.spatial==='INSIDE'?'true':'false',
      'KT83:spatialClass','GIS-result','Етап 3 · '+c.ids.join(', '));
 return facts;
}
function buildAssessment(c,defs){
 const review=reviewedCase(c);
 if(review){
  // The original independent engine validates each exact V11 legal reference.
  const result=assessStage4({confirmedSubject:c.p.text,scopeConfirmed:true,
    evidence:review.legalFacts,rules:review.rules});
  return {result,review,mode:'verified'};
 }
 const rules=defs.filter(d=>d.ref&&VERIFIED_ARTICLES[d.ref]).map(d=>({
  id:d.id,title:d.title,legalBasis:verifiedReference(d.ref),
  condition:{all:[{fact:d.fact},{not:{fact:d.exception}}]},
  missingFactProposal:'Предложение: '+d.action,
  supportedProposal:'Предложение: проверете приложимостта и компетентността за '+d.title+'.',
  notSupportedProposal:'Предложение: проверете други конкуриращи се основания.'
 }));
 // Until a case-reviewed packet exists, no legal prerequisites are proved.
 const result=assessStage4({confirmedSubject:c.p.expertConfirmed===true?c.p.text:'',
   scopeConfirmed:c.p.scopeConfirmed===true,evidence:caseEvidence(c),rules});
 return {result,review:null,mode:'unverified'};
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
 const cards=node('div');cards.style.cssText='display:grid;gap:7px';
 const trace=node('div');trace.id='kt93EvidenceTrace';
 trace.style.cssText='padding:12px;border:1px solid #77917d;background:#214635;border-radius:8px;margin:8px 0 12px;line-height:1.5';
 box.append(trace);
 const summary=node('div');summary.id='kt91Proposal';summary.style.cssText='margin:0 0 12px;padding:14px;border-left:5px solid #dbbb7b;border-radius:8px;background:#254d3a;color:#ffffff;line-height:1.5;font-size:16px';box.append(summary);
 const contrast=node('style');contrast.textContent='#kt91Proposal{background:#254d3a !important;color:#ffffff !important;opacity:1 !important}#kt91Proposal,#kt91Proposal *{color:#ffffff !important;opacity:1 !important;visibility:visible !important;text-shadow:none !important;-webkit-text-fill-color:#ffffff !important}#kt91Proposal strong{font-weight:800 !important}#kt91Proposal p{margin:9px 0 !important;line-height:1.5 !important}#kt91Stage4 details>summary{cursor:pointer}';box.prepend(contrast);
 const hypotheses=node('details');hypotheses.style.cssText='border:1px solid #678873;border-radius:8px;padding:9px';hypotheses.append(node('summary','Конкуриращи правни хипотези · подробна проверка'));hypotheses.append(cards);box.append(hypotheses);
 const more=node('details');more.style.cssText='margin-top:12px';
 more.append(node('summary','Източници, доказателствени ограничения и независим контрол'));box.append(more);
 let snapshot=null,lastKey='';
 // The legacy editor can be inserted AFTER this module starts. Fold it whenever present.
 function foldExpertEditor(){
  const groups=[...rhs.querySelectorAll('.kt86-norm')].filter(el=>!el.closest('#kt91ExpertMapping'));
  if(!groups.length)return;
  let fold=$('kt91ExpertMapping');
  if(!fold){fold=node('details');fold.id='kt91ExpertMapping';fold.style.cssText='margin:10px 0;border:1px solid #73947c;border-radius:8px;padding:10px';
   fold.append(node('summary','Експертна корекция на връзките факт–норма'));groups[0].before(fold);}
  groups.forEach(el=>fold.append(el));fold.querySelector('summary').textContent='Експертна корекция на връзките факт–норма · '+fold.querySelectorAll('.kt86-norm').length+' групи';
 }
 foldExpertEditor();
 const editorObserver=new MutationObserver(()=>foldExpertEditor());
 editorObserver.observe(rhs,{childList:true,subtree:true});
 const oldBridge=$('kt83B2CaseBridgeStage4');
 const oldOptional=$('kt89OptionalNormChoices');
 const oldSources=$('kt87V11Sources');
 function draw(){
  foldExpertEditor();
  const c=context();if(lastKey===c.key)return;lastKey=c.key;
  const defs=DEFINITIONS.filter(d=>c.kind==='other'||d.kind==='all'||d.kind===c.kind||d.kind==='both'&&c.kind!=='other');
  let packet,assessment;
  try{packet=buildAssessment(c,defs);assessment=packet.result}catch(error){status.textContent='Нормативният двигател не е достъпен: '+error.message;return}
  const findings=new Map(assessment.legalFindings.map(f=>[f.ruleId,f]));
  const actual=packet.mode==='verified';
  status.textContent='Предмет и обхват: '+(c.confirmed?'потвърдени':'непотвърдени')+
   ' · ПИ: '+(c.ids.join(', ')||'няма въведени')+
   ' · ГИС: '+(c.spatial==='OUTSIDE'?'пространствено непресичане':c.spatial==='INSIDE'?'пространствено пресичане':'недостатъчна квалификация')+
   ' · PDF1: '+(c.e.pdfOK?'отчетен':'неудостоверен')+
   ' · Потвърдени входни доказателства: '+caseEvidence(c).length+' · Експертно приети правни факти: '+(actual?packet.review.legalFacts.length:0)+
   (actual?' · проверен пакет V11':' · необходим е преглед на първичните източници')+
   '. Входните факти не се редактират в Етап 4.';
  // Evidence trace is always visible, unlike the advanced expert editors.
  trace.replaceChildren(node('strong','ДОКАЗАТЕЛСТВА → ПРАВНИ ПРЕДПОСТАВКИ'));
  const established=caseEvidence(c);
  const legal=actual?packet.review.legalFacts:[];
  const evidenceList=node('div');evidenceList.style.cssText='display:grid;gap:5px;margin-top:7px;font-size:13px';
  for(const f of established){
   evidenceList.append(node('div','Установен факт: '+f.factId+' = '+f.value+
    ' · Източник: '+f.sourceId+' · '+f.sourceLocation));
  }
  for(const f of legal){
   evidenceList.append(node('div','Правен доказателствен факт: '+f.factId+' = '+f.value+
    ' · Източник: '+f.sourceId+' · '+(f.sourceLocation||'място в оригинала не е посочено')));
  }
  if(!established.length&&!legal.length)
   evidenceList.append(node('div','Няма потвърдени входни факти с проследим източник.'));
  trace.append(evidenceList);
  trace.append(node('p',actual?
   'Правните условия са проверени в експертно приетия пакет за текущата преписка.':
   'Правните предпоставки за ОВОС, ОС, ЕО и компетентност още НЕ са доказани от първични документи. Потвърден предмет или ГИС непресичане не ги замества.'));
  cards.replaceChildren();
  for(const def of (actual?assessment.legalFindings.map(f=>({id:f.ruleId,title:f.title,ref:f.basis?.registryId,question:'Проверка на установените предпоставки и изключения по тази норма.',action:f.proposedAction})):defs)){
   const finding=findings.get(def.id);
   const card=node('details');card.style.cssText='background:#234a38;border:1px solid #668573;border-radius:8px;padding:8px 10px';
   const title=node('summary',def.title+' · '+(finding?({'supported':'подкрепена','not_supported':'неподкрепена','undetermined':'неустановена','disputed':'противоречива'}[finding.state]):'неустановена'));title.style.cssText='font-size:14px;font-weight:700;color:#efd18f;cursor:pointer';card.append(title);
   const citation=def.ref&&VERIFIED_ARTICLES[def.ref];
   const source=node('div',citation?'V11: '+citation.act+' · '+citation.article+' · '+citation.archivePath:
     'Необходима е конкретна проверка в пълния V11 — удостоверен цитат за цялата хипотеза липсва в ограничения индекс.');
   source.style.cssText='font-size:12px;color:#caddce;margin:5px 0';card.append(source);
   const state=node('div','Автоматична оценка: '+(finding?({'supported':'ПОДКРЕПЕНА','not_supported':'НЕПОДКРЕПЕНА','undetermined':'НЕУСТАНОВЕНА','disputed':'ПРОТИВОРЕЧИВА'}[finding.state]):'НЕУСТАНОВЕНА — липсва удостоверена пълна норма'));
   state.style.cssText='font-weight:700;margin:6px 0';card.append(state);
   card.append(node('div',def.question),node('p','Следващо действие: '+def.action));
   // Show the factual gap per legal rule, not only when the user opens JSON.
   if(finding?.missingEvidenceIds?.length)
    card.append(node('p','Неустановени правни предпоставки: '+finding.missingEvidenceIds.join(', ')+'.'));
   if(actual&&finding){
    const sources=finding.evidenceIds.flatMap(id=>(assessment.evidence[id]?.observations||[]).map(o=>id+': '+o.value+' · '+o.sourceType+' / '+o.sourceId+(o.sourceLocation?' · '+o.sourceLocation:'')));
    card.append(node('p',sources.length?'Доказателствена следа: '+sources.join(' | '):'Липсва доказателствена следа за предпоставките.'));
   }
   cards.append(card);
  }
  summary.replaceChildren(node('strong','ПРОЦЕДУРНО ПРЕДЛОЖЕНИЕ · за експертен преглед'));
  hypotheses.querySelector('summary').textContent='Конкуриращи правни хипотези · '+assessment.legalFindings.length+' проверени правила (разгърнете при необходимост)';
  summary.append(node('p',c.confirmed?'Входните предмет и обхват са потвърдени от експерта.':'Потвърдете предмета и обхвата в Етап 2, преди окончателната експертна преценка.'));
  const candidates=assessment.legalFindings.filter(f=>f.state==='supported');
  const unresolved=assessment.legalFindings.filter(f=>f.state==='undetermined'||f.state==='disputed');
  const msg=actual
    ?(candidates.length?'Предложение за процедура според подкрепените хипотези: '+candidates.map(f=>f.title+' ('+f.basis.act+', '+f.basis.article+')').join('; ')+'.':'Не е удостоверена приложима процедура. Предложение: изискайте конкретните липсващи факти и проверете конкуриращите се режими.')
    :'Работно предложение: проверете режимите по ОВОС и ОС (а при план или програма — ЕО), според действителните дейности и пълните нормативни предпоставки. Не е направена доказана правна квалификация.';
  summary.append(node('p',msg));
  if(actual){
   summary.append(node('p','Правни хипотези: подкрепени '+candidates.length+' · неустановени/противоречиви '+unresolved.length+'. Източниците и правните основания са от експертно удостоверения пакет за тази преписка.'));
   for(const p of assessment.proposals)summary.append(node('p',p));
  }else{
   summary.append(node('p','Няма приет пакет с доказателства за тази преписка от V11. Предложение: извършете експертна проверка по източници, факти, условия и изключения; не използвайте празен резултат като отрицателно заключение.'));
  }
  const authority=actual?packet.review.confirmedCompetence:null;
  summary.append(node('p','КОМПЕТЕНТЕН ОРГАН: '+(authority||'неустановен; РИОСВ – Пловдив е само кандидат за проверка')+'.'));
  summary.append(node('p','СЛЕДВАЩО ДЕЙСТВИЕ: '+(actual&&assessment.readyForStage5Draft?'експертът преглежда мотивите и компетентността и преминава към Етап 5 за проект, без автоматично издаване на акт.':'проверете посочените първични доказателства и правни изключения; след това възстановете експертната приемка.')));
  more.replaceChildren(node('summary','Източници, доказателствени ограничения и независим контрол'));
  more.append(node('p','Проверен архив: '+LOCKED_ARCHIVE+'. Правните цитати са проверени архивни текстове; приложимостта и изключенията се оценяват за конкретната преписка.'));
  if(oldBridge){const technical=node('details');technical.append(node('summary','Експертен контрол с независимия механизъм V11'));technical.append(oldBridge);more.append(technical)}
  if(oldOptional)more.append(oldOptional);
  if(oldSources)more.append(oldSources);
  snapshot=Object.freeze({caseKey:c.key,archive:LOCKED_ARCHIVE,legalFindings:assessment.legalFindings,
   proposals:assessment.proposals,screenProposal:msg,expertApproved:actual,finalProcedure:false,
   readyForStage5Draft:actual&&assessment.readyForStage5Draft,source:'stage4-independent-legal-engine.mjs'});
 }
 const first=rhs.querySelector('#kt89B2Automatic')||rhs.querySelector('#kt89OptionalNormChoices')||rhs.querySelector('#kt87V11Sources');
 if(first)first.before(box);else rhs.prepend(box);
 const duplicate=$('kt89B2Automatic');if(duplicate)duplicate.remove();
 ['kt80:stage-open','kt80:case-change','kt80:case-reset','kt82:evidence-invalidated','kt83:review-submitted','kt83:v11-review-updated'].forEach(event=>document.addEventListener(event,()=>{lastKey='';draw()}));
 window.KT89AutomaticB2=Object.freeze({refresh:()=>{lastKey='';draw()},snapshot:()=>snapshot});
 draw();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,1250),{once:true});
else setTimeout(start,1250);
