/* KT80 V56.2 — one visible proposal and exact-text expert approval. */
(function(root){'use strict';
const $=id=>document.getElementById(id);
function init(){
 const scope=$('kt80ScopeText'),confirmation=$('kt80ScopeConfirmation'),proposals=$('kt80RelevanceProposals');
 const status=$('kt80ScopeProposalStatus');
 if(!scope||!confirmation||!proposals||!status)return;
 const panel=document.createElement('section');panel.id='kt80V562Unified';panel.className='kt80-v562-unified';
 const title=document.createElement('h3');title.textContent='Предложение за обхвата';
 const guide=document.createElement('p');guide.textContent='Един работен проект → едно предложение → един окончателно потвърден текст. Непроверените сведения остават в доказателствения анализ.';
 panel.append(title,guide);
 const review=$('kt80EGScopeReview');
 if(review)review.insertAdjacentElement('afterend',panel);else status.insertAdjacentElement('afterend',panel);
 panel.append(proposals);
 const sync=()=>{
  const ai=$('kt80EGScopeReview');
  const aiVisible=!!ai&&!ai.hidden&&!!ai.textContent.trim();
  panel.hidden=aiVisible;
  title.textContent=aiVisible?'':'Алгоритмично предложение за обхвата';
 };
 const observer=new MutationObserver(sync);
 if(review)observer.observe(review,{attributes:true,attributeFilter:['hidden'],childList:true,subtree:true});
 sync();
 const dialog=document.createElement('dialog');dialog.id='kt80V562Confirm';dialog.className='kt80-v562-dialog';
 const heading=document.createElement('h3');heading.textContent='Потвърждение на окончателния обхват';
 const explanation=document.createElement('p');explanation.textContent='Прочетете текста по-долу. Потвърждаването се отнася точно за него, а не за предложения, останали неприети.';
 const preview=document.createElement('pre');preview.id='kt80V562FinalText';
 const checks=document.createElement('label');checks.className='kt80-v562-approval';
 const check=document.createElement('input');check.type='checkbox';
 checks.append(check,document.createTextNode(' Прегледах този окончателен текст и доказателствените сведения.'));
 const row=document.createElement('div');row.className='kt80-v562-dialog-actions';
 const back=document.createElement('button');back.type='button';back.textContent='Върни към редакцията';
 const yes=document.createElement('button');yes.type='button';yes.textContent='Потвърди показания обхват';yes.disabled=true;
 row.append(back,yes);dialog.append(heading,explanation,preview,checks,row);document.body.append(dialog);
 let captured='';
 check.addEventListener('change',()=>{yes.disabled=!check.checked});
 back.addEventListener('click',()=>dialog.close());
 yes.addEventListener('click',()=>{
  if(!check.checked||!captured||scope.value!==captured||!$('kt80SubjectConfirmation')?.checked){
   dialog.close();status.textContent='Текстът или предметът е променен. Прегледайте отново окончателния обхват.';return;
  }
  dialog.close();confirmation.checked=true;
  confirmation.dispatchEvent(new Event('change',{bubbles:true}));
  status.textContent='Потвърден е точно показаният окончателен обхват. За промяна отменете потвърждението.';
 });
 confirmation.addEventListener('click',event=>{
  if(confirmation.checked)return; // Permit explicit unconfirmation.
  event.preventDefault();event.stopImmediatePropagation();
  if(!$('kt80SubjectConfirmation')?.checked){status.textContent='Първо потвърдете предмета.';return}
  captured=scope.value.trim();
  if(!captured){status.textContent='Няма проект за потвърждение. Конструирайте или редактирайте обхвата.';return}
  preview.textContent=captured;check.checked=false;yes.disabled=true;
  dialog.showModal();
 },true);
 document.addEventListener('kt80:case-reset',()=>{if(dialog.open)dialog.close();captured=''});
 document.addEventListener('kt80:case-change',()=>{if(dialog.open)dialog.close();captured=''});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);