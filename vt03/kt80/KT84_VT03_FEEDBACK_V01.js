/* WOW VT03-R2: short administrative action panels and per-case in-memory log.
   Read-only presentation. Never approves or changes dossier/evidence state. */
(function(root){'use strict';
const id=x=>document.getElementById(x);
const css=document.createElement('style');css.id='kt84-vt03-feedback-css';
css.textContent=`
#kt84FeedbackDock{position:fixed;right:20px;top:90px;width:min(480px,calc(100vw - 36px));z-index:10120;display:grid;gap:9px;pointer-events:none}
#kt84FeedbackDock .kt84-feedback{pointer-events:auto;background:#183b2e;color:#f5f0df;border:2px solid #c9b47a;border-left:8px solid #c9b47a;border-radius:11px;box-shadow:0 10px 35px #00170f99;padding:12px 14px;font:500 14px/1.43 "Segoe UI",Arial,sans-serif}
#kt84FeedbackDock .kt84-feedback[data-tone="success"]{border-color:#8ec7a3;border-left-color:#7bc992}
#kt84FeedbackDock .kt84-feedback[data-tone="critical"]{border-color:#e9a08f;border-left-color:#df766c}
#kt84FeedbackDock .kt84-feedback-head{display:flex;align-items:center;gap:12px;justify-content:space-between;font-weight:750;color:#f7db9b}
#kt84FeedbackDock button{border:1px solid #b8a778;background:#274b39;color:#fff3dc;font-size:13px;border-radius:6px;padding:3px 9px;cursor:pointer}
#kt84FeedbackDock p{margin:6px 0 0;overflow-wrap:anywhere}
.kt84-feedback-source-hidden{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip-path:inset(50%)!important;white-space:nowrap!important}
#kt84FeedbackHistory{position:fixed;bottom:15px;right:16px;z-index:10119;background:#173a2c;border:1px solid #bca46f;border-radius:9px;color:#f4e9cf;padding:7px 10px;max-width:min(480px,calc(100vw - 36px));font:500 12px/1.4 "Segoe UI",Arial,sans-serif}
#kt84FeedbackHistory>summary{cursor:pointer;color:#f0d293;font-weight:750}
#kt84FeedbackHistory[open]{padding:12px}
#kt84FeedbackHistory ol{max-height:200px;overflow-y:auto;padding-left:20px;margin:9px 0}
#kt84FeedbackHistory li{padding:3px 0;border-bottom:1px solid #43604e}
@media(max-width:600px){#kt84FeedbackDock{top:55px;right:8px}#kt84FeedbackHistory{bottom:9px;right:8px}}
`;
document.head.append(css);
const dock=document.createElement('section');dock.id='kt84FeedbackDock';dock.setAttribute('aria-label','Съобщения за действията');dock.setAttribute('aria-live','polite');
const history=document.createElement('details');history.id='kt84FeedbackHistory';
const summary=document.createElement('summary');summary.textContent='Дневник на действията (0)';history.append(summary);
const list=document.createElement('ol');history.append(list);document.body.append(dock,history);
let seq=0,seen=new Map(),timers=new Map();
function currentCase(){return root.KT80WorkflowState?.caseId||root.KT80WorkflowState?.intake?.archive_name||id('kt80CaseBadge')?.textContent||'Нова преписка'}
let activeCase=currentCase();
function classify(message){
 if(/(?:грешка|неуспя|не може|не могат|липсва|недостатъчно|непъл|непрочетен|блокир|отказа достъп|потвърдете и обхвата|задължително)/iu.test(message))return 'critical';
 if(/(?:за проверка|предложени|непотвърден|прегледайте|проверете|предстои|не е удостовер|изисква)/iu.test(message))return 'warning';
 return 'success';
}
function hideNoncriticalOrigin(origin,tone){
 // Critical proof and field validation must always remain visible near the input.
 if(!origin)return;
 origin.classList.toggle('kt84-feedback-source-hidden',tone!=='critical');
}
function emit(message,{origin=null,forceTone=null}={}){
 const text=String(message||'').replace(/\s+/gu,' ').trim();
 if(text.length<12||/^(?:КТ\d+(?:\.\d+)?\s*[·:])?\s*(?:Проект за проверка|Текстът подлежи на експертна проверка)/iu.test(text))return;
 const tone=forceTone||classify(text);
 const key=origin?.id||text.slice(0,30);
 if(seen.get(key)===text)return;
 seen.set(key,text);hideNoncriticalOrigin(origin,tone);
 if(tone==='critical')history.open=false;
 const item=document.createElement('div');item.className='kt84-feedback';item.dataset.tone=tone;
 const header=document.createElement('div');header.className='kt84-feedback-head';
 const title=document.createElement('strong');title.textContent=tone==='success'?'Действието е отчетено':tone==='warning'?'За експертно внимание':'Необходимо действие';
 const close=document.createElement('button');close.type='button';close.textContent='Затвори';close.setAttribute('aria-label','Затвори съобщението');
 const remove=()=>{clearTimeout(timers.get(item));timers.delete(item);item.remove()};
 close.addEventListener('click',remove);header.append(title,close);
 const body=document.createElement('p');body.textContent=text.length>360?text.slice(0,357)+'…':text;item.append(header,body);
 for(const old of [...dock.children])if(old.dataset.tone!=='critical')old.remove();
 dock.append(item);
 const li=document.createElement('li');li.textContent=new Date().toLocaleTimeString('bg-BG')+' · '+text;
 list.prepend(li);while(list.children.length>60)list.lastElementChild.remove();
 summary.textContent='Дневник на действията ('+list.children.length+')';
 if(tone!=='critical'){const t=setTimeout(remove,tone==='success'?4500:8500);timers.set(item,t)}
}
function init(){
 const ids=['kt80InputStatus','kt80ScopeProposalStatus','kt80KT53Status','kt80RelevanceDecisionStatus','kt80DashboardNotice','kt80SubjectHint','kt80KT53Warnings'];
 for(const nodeId of ids){
  const node=id(nodeId);if(!node)continue;
  const observer=new MutationObserver(()=>{
   queueMicrotask(()=>emit(node.textContent,{origin:node}));
  });
  observer.observe(node,{childList:true,characterData:true,subtree:true});
 }
 function resetCase(){
  const next=currentCase();
  if(next===activeCase)return;
  activeCase=next;seen.clear();
  for(const [node,t] of timers){clearTimeout(t);node.remove()}timers.clear();
  for(const n of [...dock.children])n.remove();
  for(const el of document.querySelectorAll('.kt84-feedback-source-hidden'))el.classList.remove('kt84-feedback-source-hidden');
  list.replaceChildren();summary.textContent='Дневник на действията (0)';
 }
 document.addEventListener('kt80:case-change',resetCase);
 document.addEventListener('kt80:case-reset',resetCase);
 root.KT84Feedback=Object.freeze({notify:emit,historyCount:()=>list.children.length});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
