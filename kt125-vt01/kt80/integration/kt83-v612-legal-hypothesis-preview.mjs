/**
 * WOW V61.1: compact, separate KT80 preview for the accepted independent
 * B2 engine. Uses no route catalog, no Classic A/B and no automatic act.
 */
import {createKT83V611Bridge} from './kt83-v611-case-bound-b2-bridge.mjs';
import {createCaseAssessmentPacket} from './kt83-v612-independent-rule-packet.mjs';
const $=id=>document.getElementById(id);
function el(tag,value){const node=document.createElement(tag);if(value!==undefined)node.textContent=value;return node;}
function boot(){
 const p4=document.querySelector('.kt80-stage-panel[data-panel="4"]');
 const p5=document.querySelector('.kt80-stage-panel[data-panel="5"]');
 if(!p4||!p5)return;
 const bridge=createKT83V611Bridge(window);
 const box4=el('section');box4.id='kt83B2CaseBridgeStage4';
 box4.className='kt83-independent-panel';
 box4.append(el('h3','Б2 · Независима нормативна преценка'));
 const intro=el('p','Основа: заключен нормативен архив V11. Не се извеждат правни изводи от примерна преписка, ключови думи или каталога от 22 изхода.');
 const inputs=el('details');
 const head=el('summary','Независими правни хипотези и факти · архив V11');inputs.append(head);
 const how=el('p','Тестова среда: не въвеждайте лични данни или реални поверителни преписки. Всяка хипотеза се конструира от експерта с архивна разпоредба, предпоставки, изключения и доказателства. Няма готова процедура.');
 const ruleLabel=el('label','Хипотези — JSON масив');const ruleInput=el('textarea');ruleInput.id='kt83V612Rules';ruleInput.rows=7;ruleInput.placeholder='[{"id":"h1","title":"Хипотеза","registryId":"ZOOS_93","requirements":["f1"],"exceptions":["ex1"],"exceptionAudit":{"status":"listed","sourceId":"V11","sourceLocation":"разпоредба","reason":"преглед"},"missingFactProposal":"Предложение за уточняване","supportedProposal":"Предложение за проверка","notSupportedProposal":"Предложение за алтернативна хипотеза"}]';ruleLabel.htmlFor=ruleInput.id;
 const factLabel=el('label','Фактически доказателства — JSON масив');const factInput=el('textarea');factInput.id='kt83V612Facts';factInput.rows=7;factInput.placeholder='[{"factId":"f1","value":"true","sourceId":"документ","sourceType":"преписка","sourceLocation":"стр. 1","reason":"експертно установяване"}]';factLabel.htmlFor=factInput.id;
 inputs.append(how,ruleLabel,ruleInput,factLabel,factInput);
 const run4=el('button','Провери нормативната готовност');run4.type='button';
 const status4=el('p','Потвърдете предмета и обхвата.');status4.setAttribute('role','status');
 box4.append(intro,inputs,run4,status4);
 const box5=el('section');box5.id='kt83B2CaseBridgeStage5';box5.className='kt83-independent-panel';
 box5.append(el('h3','Б2 → Етап 5 · Независимо предложение'));
 const run5=el('button','Предложи следващо действие');run5.type='button';
 const status5=el('p','Няма актуално нормативно заключение.');status5.setAttribute('role','status');
 box5.append(run5,status5);
 p4.append(box4);p5.append(box5);
 function clear(){bridge.invalidate();status4.textContent='Изменени данни. Необходима е нова преценка.';status5.textContent='Няма актуално предложение за тази преписка.';}
 run4.addEventListener('click',()=>{
  try{
   const x=bridge.inspect();
   if(!x.ready)throw new Error('Първо потвърдете предмета и обхвата в Етап 2.');
   // Explicit expert supplied, independently sourced hypotheses only.
   const hypotheses=JSON.parse(ruleInput.value.trim()||'[]');
   const facts=JSON.parse(factInput.value.trim()||'[]');
   const packet=createCaseAssessmentPacket({hypotheses,facts});
   const result=bridge.assess(packet);
   status4.textContent=['Работен цикъл: '+x.caseId,
    'Проверени условни хипотези от архивния индекс V11: '+result.legalFindings.length,
    ...result.legalFindings.map(f=>'• '+f.title+' — '+f.state+'; изключенията се оценяват като условия, не като предварителен извод'),
    ...result.proposals,
    'Не е направена правна квалификация. Не е издаден административен акт.'].join('\n');
   status5.textContent='Готово е предложение за следваща проверка, без определена процедура.';
  }catch(e){clear();status4.textContent='Нормативната преценка не е приложена: '+String(e.message||e)}
 });
 run5.addEventListener('click',()=>{
  try{
   const result=bridge.propose();
   status5.textContent=result.independentText+'\nНе е издаден административен акт.';
  }catch(e){status5.textContent='Предложение: '+String(e.message||e)+' Проверете доказателствата от Етап 4.';}
 });
 for(const event of ['kt80:case-change','kt80:case-reset','kt82:evidence-invalidated'])
  document.addEventListener(event,clear);
 for(const field of [ruleInput,factInput])field.addEventListener('input',clear);
 document.addEventListener('kt80:case-reset',()=>{ruleInput.value='';factInput.value='';});
 document.addEventListener('kt80:case-change',()=>{ruleInput.value='';factInput.value='';});
 document.addEventListener('input',event=>{
  if(['kt80SubjectText','kt80ScopeText','kt80ParcelInput'].includes(event.target?.id))clear();
 });
 window.KT83B2CaseBridge=bridge;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
