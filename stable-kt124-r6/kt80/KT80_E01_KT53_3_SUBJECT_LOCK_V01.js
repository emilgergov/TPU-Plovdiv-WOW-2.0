/* KT80 / KT53.3 — two sequential sub-screens.
 * Subject expert approval unlocks scope. Preserves scope contents while locked.
 */
(function(root){'use strict';
const $=id=>document.getElementById(id);
let locked=true;
function sync(){
 const subject=$('kt80SubjectText'),approval=$('kt80SubjectConfirmation'),scope=$('kt80ScopeText');
 const section=$('kt80KT53Composer')?.closest?.('.kt80-v56-field');
 const notice=$('kt80ScopeLockNotice'),scopeApproval=$('kt80ScopeConfirmation');
 if(!subject||!approval||!scope||!section||!notice)return;
 // The checked approval is explicit expert acceptance of the current subject text.
 if(approval.checked&&!subject.value.trim())approval.checked=false;
 const confirmed=!!approval.checked&&!!subject.value.trim();
 const wasLocked=locked;
 locked=!confirmed;
 // The fixed subject is truly read-only. The checkbox alone can unfix it.
 subject.readOnly=confirmed;
 for(const id of ['kt80ImproveSubject','kt80EditSubject','kt80ConstructSubject']){
  const button=$(id);if(button)button.disabled=confirmed;
 }
 const proposal=$('kt80AISubjectReview');
 if(proposal){
  proposal.classList.toggle('kt80-subject-proposal-fixed',confirmed);
  proposal.querySelectorAll('button').forEach(button=>{button.disabled=confirmed});
 }
 const subjectHint=$('kt80SubjectHint');
 if(subjectHint)subjectHint.textContent=confirmed?'Предметът е фиксиран. За редакция първо отменете потвърждението.':'Предметът не е потвърден. Редактирайте при необходимост.';
 section.inert=locked;
 section.classList.toggle('kt80-scope-locked',locked);
 section.setAttribute('aria-label',locked?'Обхват — заключен до потвърждение на предмета':'Обхват — редакция при фиксиран предмет');
 notice.textContent=locked?'Първо потвърдете предмета на инвестиционното предложение, за да отключите редакцията на обхвата.':'Предметът е фиксиран. Можете да редактирате обхвата.';
 notice.dataset.locked=String(locked);
 if(scopeApproval)scopeApproval.disabled=locked;
 if(locked&&scopeApproval?.checked){scopeApproval.checked=false}
 if(confirmed&&wasLocked&&root.KT80KT52Draft&&root.KT80Relevance?.assess){
  const analysis=root.KT80Relevance.assess(root.KT80KT52Draft,subject.value);
  root.KT80RelevanceActions?.render?.(analysis);
 }
}
function init(){
 $('kt80SubjectText')?.addEventListener('input',sync);
 $('kt80SubjectConfirmation')?.addEventListener('change',sync);
 document.addEventListener('kt80:case-reset',sync);
 document.addEventListener('kt80:case-change',sync);
 document.addEventListener('kt80:subject-review-reset',sync);
 sync();
}
root.KT80ScopeLock=Object.freeze({sync,isLocked:()=>locked});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);