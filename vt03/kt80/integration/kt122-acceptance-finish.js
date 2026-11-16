/* KT122 acceptance: presentation-only refinements. Do not modify source state or case authority. */
(function(w,d){'use strict';
const $=id=>d.getElementById(id),mk=(tag,cls,text)=>{const e=d.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
const panel=n=>d.querySelector('.kt80-stage-panel[data-panel="'+n+'"]');
const once=(el,key)=>{if(!el||el.dataset[key])return false;el.dataset[key]='1';return true};
function back(){
 const bar=$('kt80DashboardSubnav');if(!bar)return;
 const current=[...d.querySelectorAll('.kt80-stage-panel')].find(x=>!x.hidden);
 const step=current?.dataset.panel||'';
 d.querySelectorAll('.kt80-stage-panel button').forEach(b=>{
  if(!/^(?:←\s*)?Назад$/iu.test(b.textContent.trim())||b.classList.contains('kt122-global-back'))return;
  const stage=b.closest('.kt80-stage-panel')?.dataset.panel;if(!stage)return;
  b.dataset.kt122From=stage;b.classList.add('kt122-global-back');
  bar.insertBefore(b,$('kt80ScreenTitle')||null);
 });
 d.querySelectorAll('.kt122-global-back').forEach(b=>{b.hidden=b.dataset.kt122From!==step});
}
function one(){
 const p=panel(1);if(!p)return;
 p.querySelector('.kt80-template-help')?.setAttribute('hidden','');
 const heading=[...p.querySelectorAll('h2,h3')].find(x=>/Приемане|Входни документи/u.test(x.textContent));
 if(heading&&once(heading,'kt122Renamed'))heading.textContent='Входни документи';
 // Keep the exact format restrictions available in their disclosure.
 const lead=[...p.querySelectorAll('p')].find(x=>x.textContent.includes('Първичните файлове не се променят'));
 if(lead)lead.hidden=true;
 const status=$('kt80InputStatus');
 if(status&&once(status,'kt122Status')){
  const refresh=()=>{status.hidden=/^Няма заредена преписка/u.test(status.textContent.trim())};
  new MutationObserver(refresh).observe(status,{subtree:true,childList:true,characterData:true});refresh();
 }
 const audit=$('kt80DossierAudit');if(audit&&once(audit,'kt122Rows')){
  const mark=()=>{
   audit.querySelectorAll('.kt80-file-reason').forEach(r=>{
    if(r.dataset.kt122Ready)return;r.dataset.kt122Ready='1';r.title=r.textContent.trim();
    r.tabIndex=0;r.setAttribute('role','button');r.setAttribute('aria-label','Покажи пълната причина');
    const toggle=()=>{r.classList.toggle('kt122-unclamp');r.setAttribute('aria-expanded',String(r.classList.contains('kt122-unclamp')))};
    r.addEventListener('click',toggle);r.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}});
   });
   const nested=audit.querySelector('details>summary');if(nested&&/Документен инвентар и рискове/u.test(nested.textContent))nested.textContent='Файлове и статуси';
  };
  new MutationObserver(mark).observe(audit,{subtree:true,childList:true});mark();
 }
}
function two(){
 const p=panel(2),sc=$('kt80ScopeConfirmation');if(!p||!sc)return;
 const controls=[...p.querySelectorAll('button')],cancel=controls.find(x=>/Отмени потвърждението и редактирай обхвата/u.test(x.textContent));
 if(cancel)cancel.textContent='Отмени потвърждението';
 const scopeBox=p.querySelector('.kt80-v56-scope-container'),next=$('kt80ToParcels');
 if(once(sc,'kt122ScopeControlsRefresh'))sc.addEventListener('change',()=>w.setTimeout(two,90));
 if(scopeBox&&next&&sc.closest('label')){
  let row=scopeBox.querySelector('.kt122-scope-action-row');
  if(!row){row=mk('div','kt122-scope-action-row');scopeBox.append(row)}
  const confirmLabel=sc.closest('label');
  if(cancel&&cancel.parentElement!==row)row.prepend(cancel);
  if(confirmLabel.parentElement!==row)row.append(confirmLabel);
  if(next.parentElement!==row)row.append(next);
 }
 // Preserve the input and event handlers; styling applies to the existing controls.
 const tabs=p.querySelector('.kt122-stage2-tabs'),sub=$('kt80SubjectConfirmation');
 if(tabs&&sub){
  const toScope=()=>{if(!sub.checked)return;const b=tabs.querySelectorAll('button')[1];if(b&&!b.disabled&&!p.classList.contains('kt122-show-scope'))b.click()};
  if(once(sub,'kt122ExtraFlow')){
   sub.addEventListener('click',()=>w.setTimeout(toScope,160));
   sub.addEventListener('change',()=>w.setTimeout(toScope,160));
  }
 }
}
function gate(){
 const dialog=$('kt82NormativeGateDialog')||d.querySelector('.kt82-normative-gate');
 const select=$('kt82GateChoice');if(!dialog||!select||!once(dialog,'kt122Radio'))return;
 const wrap=mk('div','kt122-gis-radios'),label=mk('div','kt122-gis-label','Експертно решение');
 wrap.append(label);
 const options=[['REQUIRED','ГИС анализ — към Етап 3'],['NOT_REQUIRED','Без ГИС анализ — към Етап 4']];
 const radios=options.map(([value,text])=>{
  const lbl=mk('label','kt122-radio-option'),radio=mk('input');radio.type='radio';radio.name='kt122GisDecision';radio.value=value;
  lbl.append(radio,d.createTextNode(' '+text));wrap.append(lbl);
  radio.addEventListener('change',()=>{select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));});
  return radio;
 });
 select.classList.add('kt122-original-gis-select');select.before(wrap);
 const sync=()=>radios.forEach(r=>r.checked=r.value===select.value);
 new MutationObserver(()=>{if(dialog.open)sync()}).observe(dialog,{attributes:true,attributeFilter:['open']});
 select.addEventListener('change',sync);sync();
}
function three(){
 const p=panel(3),pdf=$('kt80PDF1'),status=$('kt80PDF1Status');if(!p||!pdf||!status)return;
 if(once(pdf,'kt122PdfUi')){pdf.insertAdjacentElement('afterend',status);status.classList.add('kt122-pdf-status')}
 const detail=p.querySelector('#kt80GISDetail');
 if(detail&&!detail.closest('details')&&once(detail,'kt122GisDetails')){
  const fold=mk('details','kt122-gis-detail-fold');
  fold.append(mk('summary',null,'Подробни пространствени данни'));detail.before(fold);fold.append(detail);
 }
 const sidebar=p.querySelector('.kt85-gis-sidebar');
 // Suppress only the duplicate visual result card; all source spatial data remain intact.
 for(const h of p.querySelectorAll('h2,h3,h4,strong')){
   if(h.textContent.trim()!=='Пространствен доказателствен резултат')continue;
   const card=h.closest('section,article,.kt85-evidence-card,.kt80-spatial-result')||h.parentElement;
   if(card&&card!==p&&!card.contains($('kt85Stage3Actions'))&&!card.contains($('kt80Map')))card.hidden=true;
 }
 if(sidebar&&!sidebar.querySelector('.kt122-main-gis-summary')){
  // The existing sidebar heading already names the selected property.
  // Do not add a second headline over the same evidence.
 }
}
function four(){
 const p=panel(4),editor=$('kt116Editor');if(!p||!editor)return;
 const actor=editor.querySelector('label'),actions=editor.querySelector('.actions'),paper=editor.querySelector('.paper');
 if(!actor||!actions||!paper)return;
 if(once(actions,'kt122DecisionRow')){
  const edit=[...actions.querySelectorAll('button')].find(x=>x.textContent.trim()==='Редактирай');
  const confirm=[...actions.querySelectorAll('button')].find(x=>x.textContent.trim()==='Потвърди без промяна');
  if(edit&&confirm){
   const row=mk('div','kt122-expert-row');
   const middle=mk('div','kt122-expert-id');middle.append(actor);
   actions.before(row);row.append(edit,middle,confirm);
  }
 }
 const proposal=editor.querySelector('.paper');
 if(proposal&&!proposal.closest('details')&&once(proposal,'kt122Paper')){
  const fold=mk('details','kt122-normative-fold');
  fold.append(mk('summary',null,'Подробен нормативен анализ и доказателства'));
  proposal.before(fold);fold.append(proposal);
  const live=mk('div','kt122-decision-summary');
  fold.before(live);
  const update=()=>{
   const src=proposal.textContent||'';
   // KT116 renders heading and paragraph as separate DOM nodes, so textContent
   // contains no newline between "ИЗБРАН ПАНЕЛ" and its value.
   const heading=[...proposal.querySelectorAll('h4')].find(x=>/^ИЗБРАН\s+ПАНЕЛ/iu.test(x.textContent.trim()));
   const route=heading?.nextElementSibling?.textContent?.trim()||
     src.match(/ИЗБРАН\s+ПАНЕЛ\s*[:：]?\s*(\d{1,2}\s*[—–-][^\n]{3,190})/iu)?.[1]||
     'Няма готово предложение за панел';
   const reasonHead=[...proposal.querySelectorAll('h4')].find(x=>/ЗАЩО\s+ТОЗИ\s+ПАНЕЛ|ВОДЕЩО\s+ПРЕДЛОЖЕНИЕ/iu.test(x.textContent.trim()));
   const why=reasonHead?.nextElementSibling?.textContent?.trim()||'Подробните мотиви са налични в анализа';
   // Only visual clean-up: the approved version and editable text are unchanged.
   for(const line of proposal.querySelectorAll('p')){
     const val=line.textContent.trim();
     if(val==='---'||val==='— — —'){line.hidden=true;continue}
     if(/^\*[^*]+\*$/u.test(val)&&!line.dataset.kt122DisplayClean){
       line.dataset.kt122DisplayClean='1';line.textContent=val.slice(1,-1);
     }
   }
   live.replaceChildren(mk('strong',null,route),mk('span',null,why.slice(0,340)));
  };
  new MutationObserver(update).observe(proposal,{subtree:true,childList:true,characterData:true});update();
 }
}
function five(){
 const p=$('kt117Stage5');if(!p)return;
 const context=p.querySelector('.kt117-context'),details=context?.querySelector('div:not(.kt117-main):not(.kt117-reference)'),warnings=context?.querySelector('details');
 if(context&&!context.dataset.kt122Grid){
  context.dataset.kt122Grid='1';
  const direction=context.querySelector('.kt117-main'),reference=context.querySelector('.kt117-reference');
  if(direction&&reference){
   const grid=mk('div','kt122-stage5-grid'),left=mk('div','kt122-stage5-left'),right=mk('div','kt122-stage5-right');
   direction.before(grid);grid.append(left,right);
   left.append(direction);right.append(reference);
   // Do not delete the original dynamic details or source text; move only their DOM positions.
   if(details&&details!==direction&&details!==reference&&details!==warnings)right.append(details);
  }
 }
 const generation=p.querySelector('.kt117-actions'),note=p.querySelector('.kt117-note');
 if(generation&&generation.querySelector('button')?.textContent.includes('Изготви текст')&&note&&!generation.closest('.kt122-author-action-row')){
  const row=mk('div','kt122-author-action-row');
  generation.before(row);row.append(generation,note);note.classList.add('kt122-author-status');
 }
 const notes=p.querySelectorAll('.kt117-note');
 // Keep live dynamic status and error messages intact; hide only the fixed Word-template explanation.
 notes.forEach(n=>{if(n.textContent.startsWith('Документът се създава автоматично по одобрения институционален модел')&&!n.classList.contains('kt122-duplicate-note'))n.classList.add('kt122-duplicate-note')});
}
function apply(){back();one();two();gate();three();four();five()}
function boot(){
 apply();
 // Author/editor components mount asynchronously. Re-apply only when those specific
 // hosts acquire content; do not observe the whole document or modify case state.
 const host=$('kt96EGAuthor'),fivePanel=panel(5);
 if(host)new MutationObserver(()=>four()).observe(host,{childList:true});
 if(fivePanel)new MutationObserver(()=>five()).observe(fivePanel,{childList:true,subtree:true});
 d.addEventListener('kt80:stage-open',()=>w.setTimeout(apply,120));
 d.addEventListener('kt116:stage4-confirmed',()=>w.setTimeout(apply,100));
 d.addEventListener('kt116:stage5-open',()=>w.setTimeout(apply,120));
 d.addEventListener('kt82:pdf1-completed',()=>w.setTimeout(three,150));
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',()=>w.setTimeout(boot,3600),{once:true});else w.setTimeout(boot,3600);
})(window,document);
