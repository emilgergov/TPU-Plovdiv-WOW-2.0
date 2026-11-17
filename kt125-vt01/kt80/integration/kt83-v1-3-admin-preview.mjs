/**
 * KT83 V1.3 — isolated KT80 V59.8 integration preview.
 * Reads actual confirmed case subject/scope from the existing workflow.
 * Adds an OPTIONAL independently researched legal hypothesis and evidence entry.
 * No Classic A/B, route-catalog or automatic administrative act output.
 */
import { readKT80V598State, addEvidence, stage4RequestFromKT80 }
  from './kt80-v598-case-evidence-adapter.mjs';
import { verifiedReference } from './v11-trusted-source-registry.mjs';
import { assessStage4 } from './stage4-independent-legal-engine.mjs';
import { proposeStage5 } from './stage5-independent-proposal.mjs';
const $=id=>document.getElementById(id);
const clean=x=>typeof x==='string'?x.trim():'';
const mk=(tag,txt,cls)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(txt!=null)el.textContent=txt;return el;};
const label=(s,el)=>{const l=mk('label',s);if(el.id)l.htmlFor=el.id;return l;};
const input=(id,placeholder='',type='text')=>{
  const e=document.createElement('input');e.id=id;e.type=type;e.placeholder=placeholder;return e;
};
const selection=(id,values)=>{const e=document.createElement('select');e.id=id;for(const [value,name] of values){
  const o=mk('option',name);o.value=value;e.append(o);}return e;};
const txtArea=(id,rows=4)=>{const e=document.createElement('textarea');e.id=id;e.rows=rows;e.readOnly=true;return e;};
const state={lastStage4:null,lastStage5:null,signature:null};
function boot(){
 const p4=document.querySelector('.kt80-stage-panel[data-panel="4"]');
 const p5=document.querySelector('.kt80-stage-panel[data-panel="5"]');
 if(!p4||!p5) return;
 const panel4=mk('section',null,'kt83-independent-panel');panel4.id='kt83IndependentStage4';
 const panel5=mk('section',null,'kt83-independent-panel');panel5.id='kt83IndependentStage5';
 panel4.append(mk('h3','Независима правна преценка · КТ83'));
 panel4.append(mk('p','Експериментален модул. Правните основания идват само от заключения V11. Обстоятелствата се приемат единствено със записан доказателствен източник.'));
 const subjectState=mk('p','', 'kt83-independent-state');subjectState.id='kt83SubjectState';
 panel4.append(subjectState);
 const reference=selection('kt83RuleId',[['','Без избрана правна хипотеза'],['ZOOS_93','ЗООС, чл. 93 — преценяване необходимостта от ОВОС']]);
 const fact=selection('kt83Fact',[['','Недостатъчно данни'],['true','Установена приложимост (експертно доказана)'],['false','Установена неприложимост (експертно доказана)'],['conflict','Противоречиви доказателства']]);
 const source=input('kt83Source','Документ, входящ № или друг идентификатор');
 const location=input('kt83SourceLocation','Страница, точка, раздел в доказателството');
 const notes=input('kt83EvidenceReason','Кратък експертен мотив за фактическата преценка');
 const rulebox=mk('div',null,'kt83-independent-fields');
 for(const [title,el] of [
  ['Проверявано нормативно основание',reference],
  ['Установена фактическа предпоставка',fact],
  ['Източник от преписката',source],
  ['Място в източника',location],
  ['Фактически мотив',notes]
 ]){rulebox.append(label(title,el),el);}
 panel4.append(rulebox);
 const run4=mk('button','Провери правната хипотеза по V11');run4.type='button';run4.id='kt83RunStage4';
 const stage4Out=txtArea('kt83Stage4Finding',8);
 panel4.append(run4,label('Независим мотивиран резултат · етап 4',stage4Out),stage4Out);
 panel5.append(mk('h3','Независимо процедурно предложение · КТ83'));
 panel5.append(mk('p','Това предложение не използва маршрута от каталога на 22 документа и не издава административен акт.'));
 const competenceSource=input('kt83CompetenceSource','Идентификатор на доказателството за компетентност');
 const competenceFact=input('kt83CompetenceFact','Конкретно нормативно основание или факт за компетентност');
 const feeChoice=selection('kt83FeeChoice', [['','Без определена такса'],['OVOS_SCREENING','Преценяване необходимостта от ОВОС — 500 лв. (архив V11)']]);
 const p5fields=mk('div',null,'kt83-independent-fields');
 for(const [title,el] of [
  ['Източник за компетентния орган',competenceSource],
  ['Установено основание за компетентност',competenceFact],
  ['Такса (само след установена процедура)',feeChoice]
 ])p5fields.append(label(title,el),el);
 panel5.append(p5fields);
 const run5=mk('button','Изготви независимо предложение');run5.type='button';run5.id='kt83RunStage5';
 const stage5Out=txtArea('kt83Stage5Proposal',11);
 panel5.append(run5,label('Проект за експертна преценка · етап 5',stage5Out),stage5Out);
 // Stable controls remain intact. The independent panels have distinct IDs
 // and do not write to the legacy route selection, signatures or OUT.
 p4.insertBefore(panel4,p4.querySelector('#kt80Authority')?.closest('label')||p4.firstChild);
 p5.insertBefore(panel5,p5.querySelector('#kt80ProcedureSelect')?.closest('label')||p5.firstChild);
 const currentSignature=()=>{
  const rec=readKT80V598State(window);
  return JSON.stringify({subject:rec.confirmedSubject,scope:rec.scopeConfirmed,
    draftSubject:rec.subjectTextDraft,draftScope:rec.scopeTextDraft,
    authority:rec.authorityCandidate,parcelReview:rec.parcelReview});
 };
 function resetOutputs(message){
  state.lastStage4=null;state.lastStage5=null;state.signature=null;
  stage4Out.value=message||'Все още няма правна оценка.';
  stage5Out.value='Няма актуално независимо процедурно предложение.';
 }
 function refresh(){
  const rec=readKT80V598State(window);
  subjectState.textContent=rec.stage4Gate
    ?'Потвърден предмет: '+rec.confirmedSubject+' · Обхват: потвърден'
    :'Необходима е експертна приемка на предмета и обхвата в етап 2. Няма допускане по подразбиране.';
  return rec;
 }
 function stage4(){
  try{
   const rec=refresh(),refId=reference.value,rawValue=fact.value;
   if(!refId) throw new Error('Избери конкретна правна хипотеза от V11.');
   const verified=verifiedReference(refId);
   if(!rec.stage4Gate)throw new Error('Предметът и обхватът не са потвърдени без изменение в етап 2.');
   if(rawValue && (!clean(source.value)||!clean(location.value)||!clean(notes.value)))
     throw new Error('Фактическата преценка изисква източник, място и мотив.');
   if(!rawValue && (clean(source.value)||clean(notes.value)))
     throw new Error('Избери фактическо състояние или изчисти недоказаното твърдение.');
   const observed=rawValue||'unknown';
   const docEvidence=observed!=='unknown'?[{
    factId:'kt83_legal_applicability_'+refId,value:observed,
    sourceId:clean(source.value),sourceType:'Документ от преписката, експертна оценка',
    sourceLocation:clean(location.value),observedAt:''
   }]:[];
   let dossier=rec;
   for(const e of docEvidence)dossier=addEvidence(dossier,e);
   const conditions=[{fact:'kt83_legal_applicability_'+refId}];
   const rules=[{
    id:'kt83_'+refId,title:'Правна хипотеза: '+verified.act+', '+verified.article,
    legalBasis:verified,
    condition:{all:conditions},
    supportedProposal:'Предложение: да се направи мотивирана преценка за приложимата процедура по '+verified.article+', след проверка на всички фактически предпоставки, изключения и компетентност.',
    notSupportedProposal:'Предложение: да се провери друга приложима хипотеза от V11, съобразена с предмета и цялостния обхват.',
    missingFactProposal:'Предложение: да се съберат и проверят доказателствата за приложимостта на '+verified.article+' преди процедурен извод.'
   }];
   state.lastStage4=assessStage4(stage4RequestFromKT80(dossier,rules));
   state.lastStage5=null;
   state.signature=currentSignature();
   const f=state.lastStage4.legalFindings[0];
   const human={supported:'Подкрепена от заявените доказателства',not_supported:'Не се подкрепя от заявените доказателства',disputed:'Противоречиви доказателства',undetermined:'Неустановена'}[f.state];
   stage4Out.value=['Проверена архивна разпоредба: '+verified.act+', '+verified.article,
    'Статус: '+human,'Нормативен източник: '+verified.archivePath,
    'Документален отпечатък: '+verified.articleSha256,
    'Източник на факта: '+(clean(source.value)||'непредставен'),
    'Мотив: '+(clean(notes.value)||'липсват доказателства'),
    'Действие: '+f.proposedAction,
    'Внимание: проверената разпоредба не е автоматично установена компетентност или административен акт.'].join('\n');
   stage5Out.value='Етап 4 е актуализиран. Създай ново независимо предложение.';
  }catch(err){resetOutputs('Проверка не е извършена: '+err.message);}
 }
 function stage5(){
  try{
   if(!state.lastStage4||state.signature!==currentSignature())
     throw new Error('Етап 4 е неактуален или предметът, обхватът или пространствените данни са изменени — повтори правната преценка.');
   const rec=refresh();
   const authorityLabels={riosv:'РИОСВ – Пловдив',moew:'МОСВ',other:'Друг компетентен орган'};
   const authorityName=authorityLabels[rec.authorityCandidate]||null;
   const competenceEvidence=(authorityName&&clean(competenceSource.value)&&clean(competenceFact.value))
    ?[{sourceId:clean(competenceSource.value),factId:clean(competenceFact.value),archiveOrDossierOrigin:'Експертно посочен документ от преписката'}]:[];
   let fee=null;
   if(feeChoice.value){
    if(feeChoice.value!=='OVOS_SCREENING')throw new Error('Таксата не е удостоверена по тарифния индекс.');
    if(state.lastStage4.legalFindings[0]?.state!=='supported' ||
       state.lastStage4.legalFindings[0]?.ruleId!=='kt83_ZOOS_93')
      throw new Error('Няма установена приложима правна хипотеза за избраната такса.');
    fee={scheduleId:'OVOS_SCREENING',linkedLegalFindingId:'kt83_ZOOS_93',bgnAmount:'500.00',
      tariffSource:verifiedReference('TARIFA_1'),euroLawSource:verifiedReference('EURO_12')};
   }
   state.lastStage5=proposeStage5({
    stage4:state.lastStage4,
    confirmedCompetence:competenceEvidence.length?authorityName:null,
    competenceEvidence,fee
   });
   stage5Out.value=state.lastStage5.independentText+
    '\n\nСТАТУС: '+(state.lastStage5.readyForFormalDraft?'Проектът може да премине към експертен преглед.':'Необходима е допълнителна експертна проверка.')+
    '\nНЕ Е ИЗДАДЕН АДМИНИСТРАТИВЕН АКТ. Няма електронно подписване или окончателно произнасяне.';
  }catch(err){state.lastStage5=null;stage5Out.value='Не може да се изготви проект: '+err.message;}
 }
 run4.addEventListener('click',stage4);run5.addEventListener('click',stage5);
 document.addEventListener('kt80:case-reset',()=>{resetOutputs('Преписката е изчистена.');source.value='';location.value='';notes.value='';fact.value='';reference.value='';feeChoice.value='';competenceSource.value='';competenceFact.value='';});
 document.addEventListener('kt80:stage-open',e=>{if(e.detail?.step===4||e.detail?.step===5){refresh();if(state.signature && state.signature!==currentSignature())resetOutputs('Данните по преписката са променени — необходима е нова оценка.');}});
 document.addEventListener('input',e=>{
   if(['kt80SubjectText','kt80ScopeText','kt80ParcelInput'].includes(e.target?.id)) {
     resetOutputs('Променени входни данни — повтори правната преценка.');
   }
 });
 refresh();
 window.KT83IndependentPreview=Object.freeze({
  getStage4:()=>state.lastStage4,
  getStage5:()=>state.lastStage5,
  getInput:()=>readKT80V598State(window),
  version:'KT83_V1_3'
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
