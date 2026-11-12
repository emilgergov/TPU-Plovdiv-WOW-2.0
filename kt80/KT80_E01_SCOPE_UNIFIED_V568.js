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