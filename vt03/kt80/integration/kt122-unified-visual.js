/* KT122: visual-only DOM layout. Existing fields, handlers, expert guards and engines retained. */
(function(w){'use strict';
const $=id=>document.getElementById(id),stage=n=>document.querySelector('.kt80-stage-panel[data-panel="'+n+'"]');
const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
const kt123Progress={caseCycleId:null,stage4Draft:false,stage4Confirmed:false,stage5Draft:false,stage5Confirmed:false,selectedPanel:null};
function resetProgress(){Object.assign(kt123Progress,{caseCycleId:null,stage4Draft:false,stage4Confirmed:false,stage5Draft:false,stage5Confirmed:false,selectedPanel:null});}
function bindProgress(){
 const id=w.KT80WorkflowState?.caseCycleId||null;
 if(kt123Progress.caseCycleId!==id){resetProgress();kt123Progress.caseCycleId=id;}
}
function dashboard(){
 const tiles=[...document.querySelectorAll('#kt80DashboardFive .kt80-dashboard-tile[data-kt80-kind="step"]')];if(!tiles.length)return;
 bindProgress();
 const s=w.KT80WorkflowState||{};
 const handoff=w.KT116ExpertHandoff?.snapshot?.();
 const final=w.KT117Document?.snapshot?.();
 const hasCase=!!(s.fileName||s.intake||s.subjectConfirmed);
 const stage2=!!(s.subjectConfirmed?.expertConfirmed&&s.subjectConfirmed?.scopeConfirmed);
 const stage3=!!(s.parcelsConfirmed?.expertConfirmed||kt123Progress.stage4Draft||kt123Progress.stage4Confirmed||handoff);
 const stage4=!!(handoff||kt123Progress.stage4Confirmed);
 const stage5=!!final;
 const status=[
  hasCase?'done':'current',
  stage2?'done':hasCase?'current':'pending',
  stage3?'done':stage2?'current':'pending',
  stage4?'done':kt123Progress.stage4Draft?'review':stage3?'current':'pending',
  stage5?'done':kt123Progress.stage5Draft?'review':stage4?'current':'pending'
 ];
 // A new case has exactly one current stage. Navigation never marks anything as complete.
 if(stage5)status[4]='done';
 else if(kt123Progress.stage5Draft)status[4]='review';
 else if(stage4)status[4]='current';
 tiles.forEach(t=>{
  const n=Number(t.dataset.kt80Index),state=status[n-1]||'pending';
  t.dataset.kt122State=state;
  const num=t.querySelector('.kt80-dashboard-tile-number');
  if(num){const suffix=state==='done'?' · ✓ Завършен':state==='review'?' · За преглед':'';
   if(num.textContent!=='ЕТАП '+n+suffix)num.textContent='ЕТАП '+n+suffix;
  }
  t.title=state==='review'?'Изготвен резултат — необходим е експертен преглед':state==='done'?'Потвърден етап':state==='current'?'Текущ работен етап':'Достъпен за преглед и работа според правата';
 });
 // Highlight the selected administrative direction without claiming final legal approval.
 const chosen=Number(kt123Progress.selectedPanel||handoff?.text?.match(/ИЗБРАН\s+ПАНЕЛ\s*:\s*0?(\d{1,2})\b/iu)?.[1]||0);
 document.querySelectorAll('#kt80DashboardRoutes .kt80-dashboard-tile[data-kt80-kind="route"]').forEach(t=>{
  const id=Number(t.dataset.kt80Index),isSelected=chosen>0&&id===chosen;
  t.dataset.kt123Selected=String(isSelected);
  const badge=t.querySelector('.kt123-selected-direction');
  if(isSelected&&!badge){const mark=make('span','kt123-selected-direction','ИЗБРАНО НАПРАВЛЕНИЕ');t.querySelector('.kt80-dashboard-tile-number')?.after(mark);}
  if(!isSelected)badge?.remove();
 });
}
function one(){
 const p=stage(1),file=p?.querySelector('.kt80-custom-file-field'),run=$('kt80ProcessFile'),audit=$('kt80DossierAudit');
 if(!p||!file||!run||!audit||p.querySelector('.kt122-intake-row'))return;
 const row=make('div','kt122-intake-row');file.before(row);row.append(file,run);
 const fold=make('details','kt122-audit-fold'),summary=make('summary',null,'Резултат · Документен инвентар и статуси');
 audit.before(fold);fold.append(summary,audit);
 let shown=false;const update=()=>{if(shown)return;const t=audit.textContent||'';
  if(/ПРОЧЕТЕН|НЕПРОЧЕТЕН|ЗА ПРОВЕРКА/u.test(t)){shown=true;fold.open=true}};
 const obs=new MutationObserver(update);obs.observe(audit,{subtree:true,childList:true,characterData:true});update();
 const compare=p.querySelector('.kt80-template-help');if(compare){
  const intro=compare.querySelector(':scope > p');if(intro)intro.hidden=true;
  const title=compare.querySelector('summary');if(title)title.textContent='Сравнение с входни образци · подробности';
 }
}
function two(){
 const p=stage(2),fields=p?.querySelector('.kt80-v56-fields'),check=$('kt80SubjectConfirmation'),scope=p?.querySelector('.kt80-v56-scope-container');
 if(!p||!fields||!check||!scope)return;
 const existing=p.querySelector('.kt122-stage2-tabs');
 if(existing){
  const scopeTab=existing.querySelectorAll('button')[1];
  if(scopeTab)scopeTab.disabled=!check.checked;
  if(!check.checked){p.classList.remove('kt122-show-scope');p.classList.add('kt122-show-subject');existing.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-selected',String(i===0)));}
  return;
 }
 const tabs=make('div','kt122-stage2-tabs'),a=make('button',null,'Предмет'),b=make('button',null,'Обхват');
 a.type='button';b.type='button';tabs.append(a,b);fields.before(tabs);
 const select=which=>{
  p.classList.add('kt122-tabs-on');
  p.classList.toggle('kt122-show-subject',which==='subject');
  p.classList.toggle('kt122-show-scope',which==='scope');
  a.setAttribute('aria-selected',String(which==='subject'));
  b.setAttribute('aria-selected',String(which==='scope'));
 };
 const refresh=()=>{b.disabled=!check.checked;if(!check.checked&&p.classList.contains('kt122-show-scope'))select('subject')};
 const openScope=()=>{
   if(!check.checked)return;
   select('scope');refresh();
   // Keep the new active section in view after the existing expert confirmation handlers finish.
   requestAnimationFrame(()=>requestAnimationFrame(()=>{
     if(!check.checked)return;
     select('scope');b.scrollIntoView({behavior:'smooth',block:'start'});
   }));
 };
 a.addEventListener('click',()=>select('subject'));
 b.addEventListener('click',()=>{if(check.checked){select('scope');b.scrollIntoView({behavior:'smooth',block:'start'})}});
 check.addEventListener('change',()=>{refresh();if(check.checked)openScope()});
 // Other pre-existing modules may update the expert-confirmation checkbox programmatically.
 // Observe ONLY its checked-state attribute and don't re-run the original confirmation logic.
 select(check.checked?'scope':'subject');refresh();
}
function three(){
 const p=stage(3),actions=$('kt85Stage3Actions'),check=$('kt80ParcelsConfirmation')?.closest('label'),next=$('kt80ToLaw'),find=$('kt80FindParcels'),pdf=$('kt80PDF1');
 if(!p||!actions)return;
 if(check&&next&&check.parentElement!==actions){actions.insertBefore(check,next);actions.append(next)}
 if(check&&!check.dataset.kt122Label){check.dataset.kt122Label='1';const old=check.textContent.trim();check.title=old;const tn=[...check.childNodes].find(n=>n.nodeType===3&&n.textContent.trim().length>20);if(tn)tn.textContent=' Потвърждавам проверката';}
 if(find&&!find.dataset.kt122Label){find.dataset.kt122Label='1';find.title='Повторна ГИС справка. При преход от Етап 2 имотите се зареждат автоматично.';find.textContent='Обнови ГИС справката'}
 if(pdf&&!pdf.dataset.kt122Label){pdf.dataset.kt122Label='1';pdf.title='PDF1 се изготвя и автоматично при успешно приключване на пространствената проверка. Ръчно изготвяне или повторение.';pdf.textContent='Изготви / повтори PDF1'}
}
function compactBack(){
 document.querySelectorAll('.kt80-stage-panel button').forEach(b=>{
  if(b.id==='kt80DashboardBack'||b.classList.contains('kt122-back'))return;
  const txt=(b.textContent||'').replace(/\s+/g,' ').trim();
  if(/^(?:←\s*)?Назад$/iu.test(txt))b.classList.add('kt122-back');
 });
}
function four(){
 const p=stage(4),intro=p?.querySelector(':scope > p');if(intro)intro.style.cssText='font:12px/1.5 Verdana,Arial;margin:4px 0 9px;max-width:100%';
}
function directFive(){
 const five=stage(5);if(!five)return false;
 // UI-only display of the KT121 accepted Stage5. The author/Word remain locked
 // unless the case-bound KT116 expert handoff exists.
 document.body.dataset.kt80View='stage';
 document.querySelectorAll('.kt80-stage-panel').forEach(p=>p.hidden=p!==five);
 const back=$('kt80DashboardBack');if(back)back.hidden=false;
 const nav=document.querySelector('.kt80-dashboard-subnav');if(nav)nav.style.display='flex';
 const title=$('kt80ScreenTitle');if(title)title.textContent='5. Изготвяне на административния документ';
 w.KT117Document?.refresh?.();five.hidden=false;w.scrollTo?.({top:0,behavior:'smooth'});return true;
}
w.KT122Stage5Direct=directFive;
function gate(){
 const cancel=$('kt82GateCancel');if(cancel)cancel.textContent='Назад към Етап 2';
}
function mount(){
 one();two();three();four();gate();compactBack();dashboard();
 document.addEventListener('kt80:stage-open',()=>setTimeout(()=>{one();two();three();compactBack();dashboard()},220));
 document.addEventListener('kt115:stage4-draft',()=>{bindProgress();kt123Progress.stage4Draft=true;dashboard()});
 document.addEventListener('kt116:stage4-confirmed',()=>{bindProgress();kt123Progress.stage4Confirmed=true;const h=w.KT116ExpertHandoff?.snapshot?.();kt123Progress.selectedPanel=Number(h?.text?.match(/ИЗБРАН\s+ПАНЕЛ\s*:\s*0?(\d{1,2})\b/iu)?.[1]||0);dashboard()});
 document.addEventListener('kt123:stage5-draft',()=>{bindProgress();kt123Progress.stage5Draft=true;dashboard()});
 document.addEventListener('kt123:stage5-confirmed',()=>{bindProgress();kt123Progress.stage5Confirmed=true;dashboard()});
 ['kt80:case-reset','kt80:case-change','kt82:evidence-invalidated'].forEach(e=>document.addEventListener(e,()=>{resetProgress();setTimeout(()=>{two();dashboard()},160)}));
 const step2=$('kt80ScopeConfirmation');step2?.addEventListener('change',dashboard);
 const item=$('kt80SubjectConfirmation');item?.addEventListener('change',dashboard);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,1100),{once:true});else setTimeout(mount,1100);
})(window);
