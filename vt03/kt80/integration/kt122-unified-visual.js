/* KT122: visual-only DOM layout. Existing fields, handlers, expert guards and engines retained. */
(function(w){'use strict';
const $=id=>document.getElementById(id),stage=n=>document.querySelector('.kt80-stage-panel[data-panel="'+n+'"]');
const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
function dashboard(){
 const tiles=[...document.querySelectorAll('.kt80-dashboard-tile[data-kt80-kind="step"]')];if(!tiles.length)return;
 const s=w.KT80WorkflowState||{};let active=1;
 if(s.subjectConfirmed?.expertConfirmed){active=2;if(s.subjectConfirmed?.scopeConfirmed)active=3}
 if(s.normativeGate?.expertConfirmed&&s.normativeGate?.decision==='NOT_REQUIRED')active=4;
 if(s.step===4&&s.normativeGate?.expertConfirmed)active=4;
 if(w.KT116ExpertHandoff?.snapshot?.())active=5;
 tiles.forEach(t=>{const n=Number(t.dataset.kt80Index);t.dataset.kt122State=n===active?'current':n<active?'done':'pending'});
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
 if(!p||!fields||!check||!scope||p.querySelector('.kt122-stage2-tabs'))return;
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
 a.addEventListener('click',()=>select('subject'));b.addEventListener('click',()=>{if(check.checked)select('scope')});
 check.addEventListener('change',()=>{refresh();if(check.checked)select('scope')});select(check.checked?'scope':'subject');refresh();
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
  const txt=(b.textContent||'').replace(/\\s+/g,' ').trim();
  if(/^(?:←\\s*)?Назад$/iu.test(txt))b.classList.add('kt122-back');
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
 document.addEventListener('kt116:stage4-confirmed',dashboard);
 const step2=$('kt80ScopeConfirmation');step2?.addEventListener('change',dashboard);
 const item=$('kt80SubjectConfirmation');item?.addEventListener('change',dashboard);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,1100),{once:true});else setTimeout(mount,1100);
})(window);
