/* KT80 V56.8 — one proposal, one evidence disclosure, case-safe refresh. */
(function(root){'use strict';
const $=id=>document.getElementById(id);
function init(){
 const scope=$('kt80ScopeText'),confirmation=$('kt80ScopeConfirmation'),proposals=$('kt80RelevanceProposals');
 const status=$('kt80ScopeProposalStatus');
 if(!scope||!confirmation||!proposals||!status)return;
 const tools=$('kt80ImproveScope')?.parentElement;
 const composer=$('kt80KT53Composer');
 const review=$('kt80EGScopeReview');
 const relevance=$('kt80RelevancePanel');
 const extra=composer?.querySelector('.kt80-v56-extra');
 if(!tools||!composer||!review||!relevance)return;
 // The scope draft stays first, the three tools second, and ONE proposal third.
 const panel=document.createElement('section');panel.id='kt80V565OneProposal';panel.setAttribute('aria-label','Единно предложение за обхвата');
 tools.insertAdjacentElement('afterend',panel);
 const algo=document.createElement('div');algo.id='kt80V565Algorithm';panel.append(review,algo);algo.append(proposals);
 // The sources and the detailed audit remain available only on demand.
 const evidence=document.createElement('details');evidence.id='kt80V565Evidence';
 const summary=document.createElement('summary');summary.textContent='Мотиви и доказателства';
 evidence.append(summary);
 panel.insertAdjacentElement('afterend',evidence);
 evidence.append(relevance);
 if(extra){evidence.append(...Array.from(extra.querySelector('.kt80-v56-detail')?.children||[]));extra.remove();}
 const metadata=$('kt80KT53Status');if(metadata)evidence.append(metadata);
 const label=$('kt80ScopeProposalStatus');if(label)panel.insertAdjacentElement('afterend',label);
 const sync=()=>{
   const aiVisible=!review.hidden&&Boolean(review.textContent.trim());
   const algoVisible=Boolean(proposals.textContent.trim())&&algo.dataset.stale!=='true';
   algo.hidden=aiVisible||!algoVisible;
   panel.hidden=!aiVisible&&!algoVisible;
   panel.dataset.active=aiVisible?'eg':algoVisible?'algorithm':'none';
   // No duplicated reasons outside the disclosure.
   const previous=evidence.querySelector('.kt80-v567-algo-evidence');
   const nested=algo.querySelector('.kt81-why');
   if(nested){
     const content=document.createElement('section');content.className='kt80-v567-algo-evidence';
     content.append(...Array.from(nested.children).filter(el=>el.tagName!=='SUMMARY'));
     nested.remove();
     if(previous)previous.replaceWith(content);else evidence.append(content);
   }else if(!proposals.textContent.trim()&&previous)previous.remove();
 };
 const observer=new MutationObserver(records=>{if(records.some(m=>m.target===proposals&&m.type==='childList'))algo.dataset.stale='false';sync()});
 observer.observe(review,{attributes:true,attributeFilter:['hidden'],childList:true,subtree:true});
 observer.observe(proposals,{childList:true,subtree:true});
 scope.addEventListener('input',()=>{algo.dataset.stale='true';sync()});
 document.addEventListener('kt80:case-reset',()=>{algo.dataset.stale='false';const previous=evidence.querySelector('.kt80-v567-algo-evidence');if(previous)previous.remove();evidence.open=false;sync()});
 document.addEventListener('kt80:case-change',()=>{algo.dataset.stale='false';const previous=evidence.querySelector('.kt80-v567-algo-evidence');if(previous)previous.remove();evidence.open=false;sync()});
 sync();
 // Keep a structured, read-only evidence interface for the subsequent procedural stage.
 // This does not claim that the legal decision engine already consumes it.
 root.KT80ScopeEvidence=Object.freeze({
   snapshot:()=>{
     const r=root.KT80KT53?.getCurrent?.();
     const subject=$('kt80SubjectText')?.value.trim()||'';
     const a=root.KT80Relevance?.assess?.(root.KT80KT52Draft,subject)||r?.relevance||null;
     return Object.freeze({
       schema:'KT80-SCOPE-EVIDENCE-V1',
       subject,
       scope:scope.value.trim(),
       subjectConfirmed:Boolean($('kt80SubjectConfirmation')?.checked),
       scopeConfirmed:Boolean(confirmation.checked),
       review:(a?.review||[]).map(x=>({...x})),
       excluded:(a?.excluded||[]).map(x=>({...x})),
       crucial:(a?.crucial||[]).map(x=>({...x})),
       verified:(a?.verified||[]).map(x=>({...x})),
       sources:r?.evidence||{},
       proceduralDecision:null,
       requiresLegalAssessment:true
     });
   }
 });
 // VT03 correction: an explicit, reversible scope-only unlock. Never unfix subject.
 const unlock=document.createElement('button');
 unlock.type='button';unlock.id='kt84ScopeUnlock';
 unlock.textContent='Отмени потвърждението и редактирай обхвата';
 unlock.className='kt84-scope-unlock';unlock.hidden=true;
 const approvalLabel=confirmation.closest('label')||confirmation.parentElement;
 approvalLabel?.insertAdjacentElement('afterend',unlock);
 const updateUnlock=()=>{unlock.hidden=!confirmation.checked||!$('kt80SubjectConfirmation')?.checked};
 unlock.addEventListener('click',()=>{
  if(!$('kt80SubjectConfirmation')?.checked)return;
  if(dialog.open)dialog.close();
  confirmation.checked=false;
  confirmation.dispatchEvent(new Event('change',{bubbles:true}));
  scope.readOnly=false;
  const edit=$('kt80EditScope');if(edit)edit.disabled=false;
  root.KT80ScopeLock?.sync?.();
  status.textContent='Потвърждението на обхвата е отменено. Предметът остава потвърден. Редактирайте и потвърдете обхвата отново.';
  updateUnlock();scope.focus();
 });
 confirmation.addEventListener('change',updateUnlock);
 $('kt80SubjectConfirmation')?.addEventListener('change',updateUnlock);
 document.addEventListener('kt80:case-change',updateUnlock);
 document.addEventListener('kt80:case-reset',updateUnlock);
 // Other modules sometimes synchronize checkboxes without dispatching change.
 const unlockObserver=new MutationObserver(updateUnlock);
 unlockObserver.observe(approvalLabel||confirmation,{attributes:true,subtree:true,attributeFilter:['class','disabled']});
 updateUnlock();
 const insufficientScope=text=>{
  const v=String(text||'').trim();
  return v.length<125&&/(?:район|община|област|местност|гр\\.|град|село)/iu.test(v)&&
   !/(?:дейност|строител|реконструк|оборудван|склад|обект|производств|монтаж|експлоатац|сграда|съоръжен|инфраструктур)/iu.test(v);
 };
 const dialog=document.createElement('dialog');dialog.id='kt80V562Confirm';dialog.className='kt80-v562-dialog';
 const heading=document.createElement('h3');heading.textContent='Потвърждение на окончателния обхват';
 const explanation=document.createElement('p');explanation.textContent='Прочетете текста по-долу. Потвърждаването се отнася точно за него, а не за предложения, останали неприети.';
 const preview=document.createElement('pre');preview.id='kt80V562FinalText';
 const checks=document.createElement('label');checks.className='kt80-v562-approval';
 const check=document.createElement('input');check.type='checkbox';
 checks.append(check,document.createTextNode(' Потвърждавам само действително установените сведения в този обхват. Липсващите технически дейности и доказателства остават за проверка.'));
 const row=document.createElement('div');row.className='kt80-v562-dialog-actions';
 const back=document.createElement('button');back.type='button';back.textContent='Върни към редакцията';
 const yes=document.createElement('button');yes.type='button';yes.textContent='Потвърди показания обхват';yes.disabled=true;
 row.append(back,yes);dialog.append(heading,explanation,preview,checks,row);document.body.append(dialog);
 
 // VT03-R6: existing case drafts may still carry the old evidence-gap paragraph.
 // Never silently overwrite user content; offer an explicit reversible conversion.
 const repairDialog=document.createElement('dialog');
 repairDialog.id='kt87ScopeRepairDialog';repairDialog.className='kt80-v562-dialog';
 const repairTitle=document.createElement('h3');repairTitle.textContent='Предложение за корекция на работния обхват';
 const repairIntro=document.createElement('p');repairIntro.textContent='Старият проект смесва описание на инвестиционното предложение с непотвърдени обстоятелства. Предлагаме да отделим известния предмет от недоказаните технически дейности. Недостатъчните доказателства остават за проверка; това не е удостоверяване на процедура.';
 const repairPreview=document.createElement('pre');repairPreview.className='kt87-scope-repair-preview';
 const repairActions=document.createElement('div');repairActions.className='kt80-v562-dialog-actions';
 const repairBack=document.createElement('button');repairBack.type='button';repairBack.textContent='Запази текущия текст';
 const repairAccept=document.createElement('button');repairAccept.type='button';repairAccept.textContent='Приеми коригирания обхват';
 repairActions.append(repairBack,repairAccept);
 repairDialog.append(repairTitle,repairIntro,repairPreview,repairActions);
 document.body.append(repairDialog);
 let repairOriginal='',repairSubject='',repairCandidate='';
 const needsRepair=text=>/Не са установени достатъчно надеждни описания на конкретни предвидени дейности/iu.test(text);
 function proposeRepair(){
  const subject=$('kt80SubjectText')?.value?.trim()||'';
  const stableSubject=subject.replace(/\s+/gu,' ').replace(/[.!?]+$/u,'').trim();
  if(!stableSubject||stableSubject.length<20)return '';
  return 'Предметно определен обхват на инвестиционното предложение: '+stableSubject+'.';
 }
 function offerRepair(){
  repairOriginal=scope.value;
  repairSubject=$('kt80SubjectText')?.value||'';
  repairCandidate=proposeRepair();
  if(!repairCandidate){
   status.textContent='Не е установено достатъчно описание на предмета. Проверете оригиналите и редактирайте обхвата ръчно.';
   root.KT84Feedback?.notify?.(status.textContent,{forceTone:'critical'});return;
  }
  repairPreview.textContent=repairCandidate;
  repairDialog.showModal();
 }
 repairBack.addEventListener('click',()=>repairDialog.close());
 repairAccept.addEventListener('click',()=>{
  if(!repairCandidate||scope.value!==repairOriginal||($('kt80SubjectText')?.value||'')!==repairSubject||!$('kt80SubjectConfirmation')?.checked){
   repairDialog.close();status.textContent='Данните са променени. Извършете нова проверка на обхвата.';return;
  }
  scope.value=repairCandidate;
  scope.dispatchEvent(new Event('input',{bubbles:true}));
  // Both old and new are drafts; prior scope approval must never carry over.
  confirmation.checked=false;
  confirmation.dispatchEvent(new Event('change',{bubbles:true}));
  repairDialog.close();
  status.textContent='Коригираният работен обхват е приложен без измислени технически факти. Прегледайте го и го потвърдете отделно. Неизяснените дейности остават в доказателствения отчет.';
  root.KT84Feedback?.notify?.(status.textContent,{forceTone:'warning'});
  scope.focus();
 });
 document.addEventListener('kt80:case-reset',()=>{if(repairDialog.open)repairDialog.close()});
 document.addEventListener('kt80:case-change',()=>{if(repairDialog.open)repairDialog.close()});
 let captured='';
 check.addEventListener('change',()=>{yes.disabled=!check.checked});
 back.addEventListener('click',()=>{dialog.close();check.checked=false;yes.disabled=true;status.textContent='Потвърждението не е променено. За редакция на вече потвърден обхват използвайте „Отмени потвърждението и редактирай обхвата“.';updateUnlock()});
 yes.addEventListener('click',()=>{
  if(!check.checked||!captured||scope.value!==captured||!$('kt80SubjectConfirmation')?.checked){
   dialog.close();status.textContent='Текстът или предметът е променен. Прегледайте отново окончателния обхват.';return;
  }
  dialog.close();confirmation.checked=true;
  confirmation.dispatchEvent(new Event('change',{bubbles:true}));
  status.textContent='Потвърден е точно показаният окончателен обхват. За промяна отменете потвърждението.';
 });
 confirmation.addEventListener('click',event=>{
  if(!confirmation.checked)return; // Native uncheck is allowed; opening a new approval requires a preview.
  event.preventDefault();event.stopImmediatePropagation();
  if(!$('kt80SubjectConfirmation')?.checked){status.textContent='Първо потвърдете предмета.';return}
  captured=scope.value.trim();
  if(needsRepair(captured)){
   offerRepair();return;
  }
  if(/^Работен обхват: конкретният предмет и характерът/iu.test(captured)){
   status.textContent='Не може да се потвърди обхват без установен предмет. Проверете оригиналите и редактирайте конкретната дейност.';return;
  }

  if(insufficientScope(captured)){
   status.textContent='Обхватът съдържа само местоположение. Добавете конкретната дейност, обекта и доказаните технически характеристики, преди потвърждение.';
   return;
  }
  if(!captured){status.textContent='Няма проект за потвърждение. Конструирайте или редактирайте обхвата.';return}
  // An object/subject-only description can be acknowledged for routing, but not as a
  // claim that unspecified construction or technical activities were verified.
  const evidenceState=root.KT80KT53?.getCurrent?.()?.scopeSummary;
  explanation.textContent=evidenceState?.approvedParameters===0
   ? 'Потвърждавате само известния предметно определен обхват от преписката. Няма потвърдени технически характеристики; тези липси остават в „Мотиви и доказателства“ и не се превръщат в установени дейности или правна готовност.'
   : 'Прочетете текста по-долу и сравнете с оригиналите. Потвърждението се отнася само за действително установеното; липсите остават за проверка.';
  preview.textContent=captured;check.checked=false;yes.disabled=true;
  dialog.showModal();
 },true);
 document.addEventListener('kt80:case-reset',()=>{if(dialog.open)dialog.close();captured=''});
 document.addEventListener('kt80:case-change',()=>{if(dialog.open)dialog.close();captured=''});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);