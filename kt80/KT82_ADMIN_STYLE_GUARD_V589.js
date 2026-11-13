/* КТ82-09 · V58.9 — административен интерфейс без промяна на потвърдените текстове,
 * ГИС двигатели, PDF1 или доказателствената основа. */
(function(root){'use strict';
const $=id=>document.getElementById(id);
const normalize=s=>String(s??'').replace(/\s+/gu,' ').trim();
let pending=false;
function refresh(){
 pending=false;
 const type=root.KT82UniversalStage2Result?.type||'INVESTMENT';
 const ip=type==='INVESTMENT',hasSubject=!!normalize($('kt80SubjectText')?.value);
 const next=$('kt80ToParcels');if(next)next.textContent='Продължи към нормативната ориентация';
 const lock=$('kt80ScopeLockNotice');
 if(lock&&!ip&&lock.dataset.locked==='true')lock.textContent='Потвърдете предмета на преписката, за да отключите обхвата.';
 const subjectStatus=$('kt80SubjectProposalStatus');
 if(subjectStatus&&!ip&&hasSubject&&/няма доказан кандидат|няма надежден кандидат/iu.test(subjectStatus.textContent)){
  subjectStatus.textContent='Изготвено е предложение за предмет по прочетената преписка. Проверете съдържанието и източника, преди да го потвърдите.';
 }
 const panel=document.querySelector('.kt80-stage-panel[data-panel="2"]');
 if(panel&&!ip){
  const headings=panel.querySelectorAll('h2,h3,h4,p,summary,label');
  for(const el of headings){
   if(el.children.length||!el.textContent)continue;
   const t=normalize(el.textContent);
   if(/основна дейност, обект и технически характеристики|конкретната основна дейност, обекта и доказаните технически характеристики/iu.test(t)){
    el.textContent='Проверете дали обхватът отразява относимите факти, поставеното искане и необходимото административно действие.';
   }
   if(t==='Предмет на инвестиционното предложение')el.textContent='Предмет на преписката';
  }
  const relevance=panel.querySelector('.kt80-v565-one-proposal-note, .kt80-v565-scope-review');
  if(relevance&&/основна дейност, обект/i.test(relevance.textContent)&&!relevance.children.length)relevance.textContent='Проверете предмета, искането и относимите обстоятелства от преписката.';
 }
}
function schedule(){if(pending)return;pending=true;Promise.resolve().then(refresh);}
function init(){
 const next=$('kt80ToParcels');if(!next)return;
 const style=document.createElement('style');style.id='kt82-admin-589-style';
 style.textContent='.kt82-normative-gate,.kt82-normative-gate *{font-family:"Segoe UI",Arial,sans-serif!important}.kt82-normative-gate h2{font-size:19px!important}.kt82-normative-gate .kt82-gate-content{padding:16px 19px}.kt82-normative-gate .kt82-gate-pair{padding:7px 0}.kt82-normative-gate .kt82-gate-actions{gap:8px}.kt82-normative-gate .kt82-gate-actions button{border-radius:5px;box-shadow:none!important}.kt80-v56-stage .kt82-universal-note{margin:6px 0 10px!important;padding:6px 10px!important}';
 document.head.append(style);
 $('kt80SubjectConfirmation')?.addEventListener('change',()=>setTimeout(refresh,0));
 $('kt80ScopeConfirmation')?.addEventListener('change',()=>setTimeout(refresh,0));
 document.addEventListener('kt80:stage-open',e=>{if(e.detail?.step===2)schedule()});
 document.addEventListener('kt80:case-reset',()=>setTimeout(refresh,0));
 document.addEventListener('kt80:case-change',()=>setTimeout(refresh,0));
 const observer=new MutationObserver(muts=>{
  if(!root.KT82UniversalStage2Result||root.KT82UniversalStage2Result.type==='INVESTMENT')return;
  if(muts.some(m=>m.target?.id==='kt80SubjectProposalStatus'||m.target?.id==='kt80ScopeLockNotice'))schedule();
 });
 for(const id of ['kt80SubjectProposalStatus','kt80ScopeLockNotice']){
  const x=$(id);if(x)observer.observe(x,{childList:true,characterData:true,subtree:true});
 }
 refresh();
 root.KT82AdminStyle=Object.freeze({refresh});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);