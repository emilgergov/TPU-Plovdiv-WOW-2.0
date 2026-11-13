/**
 * WOW V61.1: compact, separate KT80 preview for the accepted independent
 * B2 engine. Uses no route catalog, no Classic A/B and no automatic act.
 */
import {createKT83V611Bridge} from './kt83-v611-case-bound-b2-bridge.mjs';
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
 const run4=el('button','Провери нормативната готовност');run4.type='button';
 const status4=el('p','Потвърдете предмета и обхвата.');status4.setAttribute('role','status');
 box4.append(intro,run4,status4);
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
   // No verified, case-specific V11 rules are silently invented.
   const result=bridge.assess({evidence:[],rules:[]});
   status4.textContent=['Работен цикъл: '+x.caseId,
    'Удостоверени правни хипотези за конкретната преписка: '+result.legalFindings.length,
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
 document.addEventListener('input',event=>{
  if(['kt80SubjectText','kt80ScopeText','kt80ParcelInput'].includes(event.target?.id))clear();
 });
 window.KT83B2CaseBridge=bridge;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
