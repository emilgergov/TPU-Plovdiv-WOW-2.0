/* КТ82 — архитектурен мост 4→5, v60.4 с контрол на доказателствена ревизия.
   Работно предложение, но не автоматична правна квалификация или потвърден маршрут.
   Запазени: общ каталог от 22 кандидата; експертен избор; изход OUT неактивен.
 */
(function(root){'use strict';
const $=id=>document.getElementById(id);
const t=x=>String(x??'').replace(/\s+/gu,' ').trim();
const kindNames={
 SIGNAL:'сигнал',COMPLAINT:'жалба',REQUEST:'искане',APPLICATION:'заявление',
 CORRESPONDENCE:'административна кореспонденция',INVESTMENT:'инвестиционно предложение'
};
const special={SIGNAL:18,COMPLAINT:17};
function advise(data,catalog){
 const kind=data?.type||'CORRESPONDENCE';
 const subject=t(data?.subject),scope=t(data?.scope);
 const hasLaw=Boolean(data?.lawConfirmed?.expertConfirmed&&t(data.lawConfirmed.legal));
 const gate=data?.normativeGate||null;
 const gisNeeded=gate?.decision==='REQUIRED';
 const ids=data?.parcelIds||[];
 const result={kind,subject,scope,hasLaw,gate,ids,routeId:null,title:'',reason:'',next:'',cautions:[]};
 if(!subject){result.title='Проверете предмета на преписката';result.reason='Няма потвърден предмет, върху който да се основе административен маршрут.';result.next='Предложение: върнете се към №2 и потвърдете предмета и обхвата.';return result;}
 if(!hasLaw){result.title='Необходима е експертна нормативна преценка';result.reason='Маршрутът не може да бъде определен само от наименованието на преписката или ГИС резултат.';result.next='Предложение: довършете и потвърдете относимите правни основания и компетентния орган в №4.';return result;}
 if(special[kind]){
  const route=catalog.find(r=>Number(r.id)===special[kind]&&r.type!=='internal_tool');
  if(route){
   result.routeId=route.id;result.title='Работен кандидат №'+route.id+' · '+route.title;
   result.reason='В потвърдения предмет е разпозната '+kindNames[kind]+'. Кандидатът служи за проверка на приложимия административен ред и не доказва компетентност, срокове или формата на произнасяне.';
   result.next='Предложение: сравнете правната преценка от №4 с изискванията на кандидат №'+route.id+'; при съответствие го изберете и потвърдете експертно.';
   result.cautions.push('Специалният ред и компетентността имат предимство пред общата квалификация по вида на постъпилия документ.');
  }
 }else if(kind==='INVESTMENT'){
  result.title='Необходим е избор между специалните режими';
  result.reason='Предметът е инвестиционно предложение. Пространственият анализ'+(gisNeeded?' е приложим':' не е изискан')+', но пресичането или непресичането на ЗЗ/ЗТ не определя само по себе си процедурата.';
  result.next='Предложение: проверете фактическите характеристики, приложимите нормативни предпоставки и компетентността. Едва след това съпоставете проверената хипотеза с кандидатите по ОВОС/ОС/ЕО.';
  result.cautions.push('Не се избира автоматично Classic A/Б, решение или писмо от каталога.');
 }else{
  result.title='Каталогът изисква преценка за този вид преписка';
  result.reason='Потвърденият предмет е '+(kindNames[kind]||'административен въпрос')+'. В текущите 22 кандидата няма универсален правомерен изход за всяко такова искане.';
  result.next='Предложение: определете приложимия административен ред по установените правни основания и проверете дали каталогът съдържа относимия маршрут. Ако липсва, регистрирайте необходимост от нов кандидат, без да избирате неподходящ.';
  result.cautions.push('Не се използва маршрут за ОВОС, ОС или ЕО само защото е наличен в каталога.');
 }
 if(!result.title){result.title='Необходима е допълнителна правна проверка';result.reason='Няма еднозначен кандидат от наличните доказателства.';result.next='Предложение: проверете специалния ред и компетентността преди експертен избор.';}
 return result;
}
root.KT82RouteAdvice=Object.freeze({advise});
function init(){
 const stage=document.querySelector('.kt80-stage-panel[data-panel="5"]');
 const select=$('kt80ProcedureSelect'),info=$('kt80ProposalInfo'),summary=$('kt80ReviewSummary');
 if(!stage||!select||!info||!summary)return;
 let panel=$('kt82RouteAdvicePanel');
 if(!panel){
  panel=document.createElement('section');panel.id='kt82RouteAdvicePanel';panel.className='kt82-route-advice';
  panel.setAttribute('aria-label','Предварително предложение за административен маршрут');
  const header=document.createElement('h3');header.textContent='Работно предложение по преписката';
  const title=document.createElement('strong');title.id='kt82RouteAdviceTitle';
  const reason=document.createElement('p');reason.id='kt82RouteAdviceReason';
  const next=document.createElement('p');next.id='kt82RouteAdviceNext';
  const caution=document.createElement('p');caution.id='kt82RouteAdviceCaution';
  panel.append(header,title,reason,next,caution);
  const target=stage.querySelector('label[for="kt80ProcedureSelect"]');target?.before(panel);
 }
 const style=document.createElement('style');style.id='kt82-route-advice-style';
 style.textContent='.kt82-route-advice{background:#eaf0e7;color:#213e2b;border:1px solid #8dab92;border-left:4px solid #60836a;border-radius:6px;padding:13px 15px;margin:12px 0;font:400 13px/1.52 "Segoe UI",Arial,sans-serif}.kt82-route-advice h3{font:700 16px "Segoe UI",Arial,sans-serif;color:#234c35;margin:0 0 7px}.kt82-route-advice strong{display:block;color:#224733;margin:4px 0}.kt82-route-advice p{font:400 13px/1.5 "Segoe UI",Arial,sans-serif!important;color:#31513b!important;margin:6px 0}.kt82-route-advice #kt82RouteAdviceCaution{font-size:12px!important;color:#536853!important}.kt80-stage-panel[data-panel="5"]{font-family:"Segoe UI",Arial,sans-serif!important}';
 document.head.append(style);
 function render(){
  const state=root.KT80WorkflowState||{};
  const dossier=root.KT82UniversalStage2Result||{};
  const parcelIds=state.parcelsConfirmed?.ids||[];
  const data={type:dossier.type||'CORRESPONDENCE',subject:state.subjectConfirmed?.text,
   scope:state.subjectConfirmed?.scope,lawConfirmed:state.lawConfirmed,
   normativeGate:state.normativeGate,parcelIds};
  const a=Object.freeze({...advise(data,root.KT80RouteCatalog||[]),
   caseId:state.caseCycleId||null,generation:state.generation??null,
   evidenceRevision:root.KT82EvidenceInvalidation?.getRevision?.()??null});
  $('kt82RouteAdviceTitle').textContent=a.title;
  $('kt82RouteAdviceReason').textContent=a.reason;
  $('kt82RouteAdviceNext').textContent=a.next;
  $('kt82RouteAdviceCaution').textContent=a.cautions.join(' ');
  panel.dataset.kt82RouteId=a.routeId||'';
  // Не изменя автоматично избраната от експерта стойност.
  root.KT82RouteAdviceLast=a;
 }
 document.addEventListener('kt80:stage-open',e=>{if(e.detail?.step===5)render()});
 document.addEventListener('kt82:evidence-invalidated',()=>{root.KT82RouteAdviceLast=null;panel.dataset.kt82RouteId='';if(!stage.hidden)render()});
 document.addEventListener('kt80:case-change',()=>{root.KT82RouteAdviceLast=null;panel.dataset.kt82RouteId='';if(!stage.hidden)render()});
 document.addEventListener('kt80:case-reset',()=>{root.KT82RouteAdviceLast=null;panel.dataset.kt82RouteId='';if(!stage.hidden)render()});
 // Стъпка 5 се отваря от оригиналния workflow; следващият microtask
 // позволява следващите UI обновявания да приключат, без да ги заместваме.
 const observer=new MutationObserver(()=>{if(!stage.hidden)Promise.resolve().then(render)});
 observer.observe(stage,{attributes:true,attributeFilter:['hidden']});
 root.KT82RouteAdviser=Object.freeze({refresh:render,get:()=>{
  const a=root.KT82RouteAdviceLast,w=root.KT80WorkflowState||{};
  if(!a||a.caseId!==(w.caseCycleId||null)||a.generation!==(w.generation??null)||a.evidenceRevision!==(root.KT82EvidenceInvalidation?.getRevision?.()??null))return null;
  return a;
 }});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);