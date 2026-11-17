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
import { discoverLegalHypotheses, rulesFromDiscoveredHypotheses } from './kt83-v1-4-hypothesis-discovery.mjs';
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
 panel4.append(mk('p','Автоматично откриване на кандидат-хипотези от потвърдения предмет. Наличието на тематичен сигнал не доказва приложимост. Експертът допълва доказателства, а не избира предварително член.'));
 const discoveryInfo=mk('p','', 'kt83-independent-state');discoveryInfo.id='kt83DiscoveryInfo'; panel4.append(discoveryInfo);
 const subjectState=mk('p','', 'kt83-independent-state');subjectState.id='kt83SubjectState';
 panel4.append(subjectState);
 const reference=selection('kt83RuleId',[['','Определя се автоматично от потвърдения предмет'],['ZOOS_93','ЗООС, чл. 93 — КАНДИДАТ за проверка']]);
 reference.disabled=true;
 const fact=selection('kt83Fact',[['','Недостатъчно данни'],['true','Установена приложимост (експертно доказана)'],['false','Установена неприложимост (експертно доказана)'],['conflict','Противоречиви доказателства']]);
 const source=input('kt83Source','Документ, входящ № или друг идентификатор');
 const location=input('kt83SourceLocation','Страница, точка, раздел в доказателството');
 const notes=input('kt83EvidenceReason','Кратък експертен мотив за фактическата преценка');
 const rulebox=mk('div',null,'kt83-independent-fields');
 for(const [title,el] of [
  ['Автоматично предложена правна хипотеза',reference],
  ['Установена фактическа предпоставка',fact],
  ['Източник от преписката',source],
  ['Място в източника',location],
  ['Фактически мотив',notes]
 ]){rulebox.append(label(title,el),el);}
 panel4.append(rulebox);
 const run4=mk('button','Анализирай предмета и доказателствата по V11');run4.type='button';run4.id='kt83RunStage4';
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
  try {
   const rec=refresh();
   if(!rec.stage4Gate)throw new Error('Потвърдете предмета и обхвата в етап 2.');
   const discovery=discoverLegalHypotheses(rec);
   discoveryInfo.textContent=discovery.candidates.length
    ? 'Автоматично предложено за проверка: '+discovery.candidates.map(c=>c.title).join('; ')+
      '. Тематични сигнали: '+(discovery.candidates[0].signals.join(', ')||'общ предмет на ИП')
    : discovery.nextAction;
   reference.value=discovery.candidates[0]?.registryId||'';
   const rawValue=fact.value;
   if(rawValue && !discovery.candidates.length)
     throw new Error('Няма удостоверена в индекса правна хипотеза, към която да се отнесе доказателството.');
   if(rawValue && (!clean(source.value)||!clean(location.value)||!clean(notes.value)))
     throw new Error('Установяването на приложимост изисква документ, конкретно място и експертен мотив.');
   if(!rawValue && (clean(source.value)||clean(notes.value)))
     throw new Error('Изберете фактическо състояние или изчистете недоказаното твърдение.');
   let dossier=rec;
   if(rawValue && discovery.candidates.length){
     dossier=addEvidence(rec,{
      factId:discovery.candidates[0].factId,value:rawValue,
      sourceId:clean(source.value),sourceType:'Преписка / експертна преценка',
      sourceLocation:clean(location.value)
     });
   }
   const rules=rulesFromDiscoveredHypotheses(discovery,verifiedReference);
   state.lastStage4=assessStage4(stage4RequestFromKT80(dossier,rules));
   state.lastStage5=null;
   state.signature=currentSignature();
   const descriptions=state.lastStage4.legalFindings.map(f=>{
      const human={supported:'Посочена като доказана от експерта — подлежи на документна проверка',
       not_supported:'Посочена като неприложима — подлежи на проверка',
       disputed:'Противоречиви доказателства',undetermined:'Неустановена'}[f.state];
      return ['Хипотеза: '+f.title,'Статус: '+human,
       'Разпоредба: '+f.basis.act+', '+f.basis.article,
       'Отпечатък на текста: '+f.basis.articleSha256,
       'Препоръчано действие: '+f.proposedAction].join('\n');
   });
   stage4Out.value=[
     'Предмет: '+rec.confirmedSubject,
     'Обхват: '+rec.scopeTextDraft,
     'Автоматично откриване: '+discovery.status,
     discovery.nextAction,
     ...(descriptions.length?descriptions:['Няма достатъчно удостоверени разпоредби в текущия индекс.']),
     'Източник на въведена фактическа преценка: '+(rawValue?clean(source.value)+' · '+clean(location.value):'липсва — остава неустановена'),
     'Мотив: '+(clean(notes.value)||'не е представен експертен мотив'),
     'Не е издаден акт. Не е определена процедура автоматично.'
   ].join('\n\n');
   stage5Out.value='Етап 4 е преразгледан. Етап 5 може да формулира предложение и при липсващи доказателства.';
  } catch(err){resetOutputs('Не е извършен анализ: '+err.message);}
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
    if(!state.lastStage4.legalFindings.some(f=>f.ruleId==='kt83_ZOOS_93' && f.state==='supported'))
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
 document.addEventListener('kt80:stage-open',e=>{if(e.detail?.step===4||e.detail?.step===5){refresh();if(state.signature && state.signature!==currentSignature())resetOutputs('Данните по преписката са променени — необходима е нова оценка.');if(e.detail?.step===4 && !state.lastStage4)stage4();}});
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
  version:'KT83_V1_4'
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
