/* KT83 UX acceptance batch — presentation only. No legal acceptance bypass. */
(function(root){'use strict';
const $=id=>document.getElementById(id);
const stageMeta=[
 ['Внасяне и анализ на преписката','Да се получат и оценят входните документи, като се отбележат непрочетените.','Проверете статуса на всеки приложен документ и липсващите доказателства.','Следва формулиране на предмет и обхват.'],
 ['Предмет и обхват на инвестиционното предложение','Да се установи точният предмет от входните доказателства.','Прегледайте предложените предмет и обхват и потвърдете само доказаните факти.','Следва преценка дали е необходим пространствен анализ.'],
 ['Имоти и пространствен анализ','Да се удостоверят имотите и пространственото им положение спрямо защитени територии и зони.','Проверете идентификаторите, геометрията, пресичанията и пространствения отчет.','При липса на геометрия пространствен извод и отчет не се приемат.'],
 ['Нормативна и процедурна преценка','Да се проверят относимите нормативни предпоставки и компетентният орган.','Проверете доказателствата и нормативните основания, без да приемате непотвърдени квалификации.','След правна проверка преминете към мотивирано предложение за процедура.'],
 ['Определяне на процедурата','Да се обсъди мотивирано предложение за приложимата процедура.','Съпоставете експертно потвърдените факти с проверените правни основания.','Проект на документ е допустим само след пълна експертна приемка.']
];
const css=document.createElement('style');css.id='kt83-ux-batch-css';
css.textContent=`
:root{--ux-bg:#123729;--ux-gold:#e5cb8e;--ux-muted:#c4d5c8}
.kt80-dashboard-subnav{gap:9px!important;flex-wrap:wrap}
#kt80ScreenTitle{font:700 16px/1.35 "Segoe UI",Arial,sans-serif!important}
.kt83-help-compact{display:inline-flex;justify-content:center;align-items:center;width:25px;height:25px;padding:0!important;border:1px solid #8f9e7d!important;border-radius:50%!important;background:transparent!important;color:#d7c995!important;cursor:pointer!important;flex:none!important;vertical-align:middle}
.kt83-help-compact:hover,.kt83-help-compact:focus-visible{background:#36543c!important;outline:2px solid #cba95b;outline-offset:2px}
.kt83-help-overlay[hidden],.kt83-preview-overlay[hidden]{display:none!important}
.kt83-help-overlay,.kt83-preview-overlay{position:fixed;inset:0;z-index:10050;background:rgba(3,19,14,.80);display:grid;place-items:center;padding:14px}
.kt83-help-dialog,.kt83-preview-dialog{width:min(660px,95vw);max-height:min(83vh,850px);overflow:auto;background:#173d2e;border:1px solid #c8ae73;border-radius:11px;padding:20px;color:#f0efe3;box-shadow:0 22px 70px rgba(0,0,0,.55);font:400 14px/1.5 "Segoe UI",Arial,sans-serif}
.kt83-help-dialog h2,.kt83-preview-dialog h2{color:#ead293;font:700 19px/1.35 "Segoe UI",Arial,sans-serif;margin:0 0 10px}
.kt83-help-dialog h3,.kt83-preview-dialog h3{font:700 14px/1.3 "Segoe UI",Arial,sans-serif;color:#ead293;margin:10px 0 3px}
.kt83-help-dialog p,.kt83-preview-dialog p{margin:2px 0 9px;color:#e0e9dc}
.kt83-help-dialog button,.kt83-preview-dialog button{border:1px solid #c8ae73;background:#d0b173;color:#14382a;border-radius:7px;padding:7px 11px;font-weight:700;cursor:pointer}
.kt83-help-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.kt83-ux-purpose{margin:2px 0 10px;color:#e3e9df;font:400 12px/1.4 "Segoe UI",Arial,sans-serif}
.kt83-ux-status{background:#224536;padding:8px 10px;border-radius:6px;border-left:3px solid #bca467;margin:9px 0;font-size:12px}
.kt80-v56-stage .kt80-subject-controls{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:7px!important;margin:7px 0!important}
.kt80-v56-stage .kt80-subject-controls button{min-width:0!important;max-width:none!important;width:100%!important;margin:0!important;padding:8px 9px!important;font:650 12px/1.35 "Segoe UI",Arial,sans-serif!important;white-space:normal!important}
.kt80-v56-stage .kt80-v56-fields{gap:10px!important}
.kt80-v56-stage .kt80-v56-field{min-width:0!important}
@media(max-width:760px){.kt80-v56-stage .kt80-subject-controls{grid-template-columns:1fr!important}}
.kt80-stage-panel h2,.kt80-stage-panel h3{font-family:"Segoe UI",Arial,sans-serif!important}
.kt80-stage-panel{font-family:"Segoe UI",Arial,sans-serif!important;min-width:0}
.kt80-stage-panel p{margin:5px 0 8px!important;line-height:1.4!important}
.kt80-stage-panel button{margin:4px 5px 4px 0!important;padding:8px 11px!important}
.kt80-stage-panel label:not(.kt80-check){margin:6px 0 4px!important}
.kt80-stage-panel[data-panel="3"] .kt80-free-gis{padding:9px!important;margin:8px 0!important}
.kt80-stage-panel[data-panel="3"] .kt80-gis-layout{gap:8px!important}
.kt80-stage-panel[data-panel="3"] #kt80GISMap{max-height:340px;min-height:195px;aspect-ratio:auto}
.kt80-stage-panel[data-panel="3"] #kt80GISResults{max-height:360px}
.kt80-stage-panel[data-panel="3"] .kt80-gis-map-wrap:has(#kt80GISMapEmpty:not([hidden])) #kt80GISMap{height:175px!important;min-height:0!important}
.kt80-stage-panel[data-panel="3"] .kt80-gis-map-wrap:has(#kt80GISMapEmpty:not([hidden])){max-height:230px}
.kt80-stage-panel[data-panel="3"] .kt80-parcel-intake{padding:9px!important;margin:7px 0!important}
.kt83-tech-details{margin:8px 0;border:1px solid #66826c;border-radius:8px;padding:7px 10px;background:#193a2e}
.kt83-tech-details summary{color:#e3c985;cursor:pointer;font-weight:650;font-size:13px}
.kt80-version-proof{display:none!important}
.kt80-dashboard-tile[data-kt83-state="done"]{background:#335e58!important;border-color:#8ba9a3!important}
.kt80-dashboard-tile[data-kt83-state="done"] .kt80-dashboard-tile-number:after{content:" ✓";color:#ddeddf}
.kt80-dashboard-tile[data-kt83-state="future"]{background:#204a35!important;border-color:#5b8264!important}
.kt80-dashboard-tile[data-kt83-state="next"]{background:#8c6c34!important;border-color:#f5d68d!important}
.kt83-preview-disabled{background:#263d34;padding:10px;border:1px solid #9c775d;border-radius:8px;color:#f5d4c4;margin:10px 0}
@media(max-width:900px){.kt80-stage-panel[data-panel="3"] .kt80-gis-layout{grid-template-columns:1fr!important}}
`;
document.head.append(css);
let activeStep=1;
const backdrop=(klass,inner)=>{let d=document.createElement('div');d.className=klass;d.hidden=true;d.innerHTML=inner;document.body.append(d);return d};
const help=backdrop('kt83-help-overlay','<section class="kt83-help-dialog" role="dialog" aria-modal="true" aria-labelledby="kt83HelpTitle"><div class="kt83-help-top"><h2 id="kt83HelpTitle"></h2><button id="kt83HelpClose" type="button">Затвори ×</button></div><div id="kt83HelpBody"></div></section>');
const preview=backdrop('kt83-preview-overlay','<section class="kt83-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="kt83PreviewTitle"><div class="kt83-help-top"><h2 id="kt83PreviewTitle">5. Определяне на процедурата · преглед</h2><button id="kt83PreviewClose" type="button">Затвори ×</button></div><div id="kt83PreviewBody"></div></section>');
let returnFocus=null;
function close(d){d.hidden=true;if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true})}
for(const [d,id] of [[help,'kt83HelpClose'],[preview,'kt83PreviewClose']]){
 $(id).addEventListener('click',()=>close(d));
 d.addEventListener('click',e=>{if(e.target===d)close(d)});
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!help.hidden)close(help);else if(!preview.hidden)close(preview)}});
function makeText(tag,value){const n=document.createElement(tag);n.textContent=value;return n}
function helpContent(step){
 const s=root.KT80WorkflowState||{},m=stageMeta[step-1]||stageMeta[0];
 const subject=s.subjectConfirmed?.expertConfirmed?'Предметът е потвърден.':'Предметът не е потвърден.';
 const parcels=s.parcelsConfirmed?.ids?.length?('Идентифицирани имоти: '+s.parcelsConfirmed.ids.join('; ')+'.'):'Няма потвърдени имотни идентификатори.';
 const spatial=s.parcelsConfirmed?.spatiallyVerified?'Пространствените пресичания са проверени.':'Пространствените пресичания не са удостоверени.';
 const law=s.lawConfirmed?.expertConfirmed?'Има експертно потвърдена правна преценка.':'Правната преценка не е потвърдена.';
 return [{title:'Предмет и цел',text:m[1]},{title:'Получено дотук',text:[subject,step>2?parcels:'',step>3?spatial:'',step>4?law:''].filter(Boolean).join(' ')},{title:'Какво правим сега',text:m[2]},{title:'Какво следва',text:m[3]}];
}
function openHelp(step,button){
 activeStep=step;returnFocus=button||document.activeElement;
 $('kt83HelpTitle').textContent=(step)+'. '+stageMeta[step-1][0];
 const b=$('kt83HelpBody');b.replaceChildren();
 for(const x of helpContent(step)){b.append(makeText('h3',x.title),makeText('p',x.text))}
 help.hidden=false;$('kt83HelpClose').focus();
}
function openPreview(button){
 returnFocus=button||document.activeElement;const b=$('kt83PreviewBody');b.replaceChildren();
 const s=root.KT80WorkflowState||{},legal=root.KT83RouteAccess?.currentV11?.();
 b.append(makeText('p','Информационен преглед на следващия етап — не представлява избор или потвърждение на процедура.'));
 b.append(makeText('h3','Получено дотук'));
 b.append(makeText('p',s.subjectConfirmed?.expertConfirmed?'Предмет и обхват: потвърдени от експерта.':'Предмет и обхват: не са потвърдени.'));
 b.append(makeText('p',s.parcelsConfirmed?.spatiallyVerified?'Пространствени доказателства: потвърдени.':'Пространствени доказателства: непълни или неустановени.'));
 b.append(makeText('p',legal?.ok===true?'Нормативната проверка е потвърдена за текущата преписка.':'Нормативна преценка: не е удостоверена. '+(legal?.reason||'Необходима е проверка на нормативните основания и компетентността.')));
 b.append(makeText('h3','Цел на Етап 5'));
 b.append(makeText('p','Мотивирано експертно предложение за процедура при проверени факти, правни основания и компетентност.'));
 let warning=makeText('div','Определяне на процедура и създаване на проект са недостъпни в този режим. Не попълвайте фиктивни правни основания.');warning.className='kt83-preview-disabled';b.append(warning);
 b.append(makeText('p','Следващо действие: върнете се към непълните проверки в предходните етапи.'));
 const actual=document.querySelector('.kt80-stage-panel[data-panel="5"]');
 if(actual){
  const fold=document.createElement('details');fold.className='kt83-tech-details';
  fold.append(makeText('summary','Разгледай действителната структура на Панел 5 (само за преглед)'));
  const copy=actual.cloneNode(true);copy.hidden=false;copy.removeAttribute('data-panel');copy.classList.remove('kt80-stage-panel');
  copy.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
  copy.querySelectorAll('[for]').forEach(el=>el.removeAttribute('for'));
  copy.querySelectorAll('button,input,select,textarea').forEach(el=>{el.disabled=true;el.setAttribute('aria-disabled','true')});
  copy.querySelectorAll('script').forEach(el=>el.remove());
  copy.querySelectorAll('a').forEach(el=>{el.removeAttribute('href');el.removeAttribute('target');el.setAttribute('aria-disabled','true')});
  copy.querySelectorAll('[contenteditable]').forEach(el=>el.removeAttribute('contenteditable'));
  copy.querySelectorAll('form').forEach(el=>el.addEventListener('submit',event=>event.preventDefault()));
  fold.append(copy);b.append(fold);
 }
 preview.hidden=false;$('kt83PreviewClose').focus();return true;
}
root.KT83SafeStageFive=Object.freeze({open:openPreview});
function inlineHelp(){
 const sub=$('kt80DashboardSubnav'),title=$('kt80ScreenTitle');
 if(!sub||!title)return;
 const b=document.createElement('button');b.type='button';b.id='kt83HelpButton';b.className='kt83-help-compact';b.textContent='ⓘ';b.setAttribute('aria-label','За този етап');b.title='За този етап';
 title.after(b);b.addEventListener('click',()=>openHelp(activeStep,b));
}
function renameStatic(){
 const replace=[
 ['MASTER V11','Нормативен архив'],['ПИ MASTER','Данни за имотите'],['ГИС MASTER','ГИС данни'],['КТ83',''],['КТ82',''],
 ['Б² · Независима нормативна преценка','Проверка на нормативните основания'],
 ['IN документи','Входни документи'],['OUT проект','проект на документ'],['OUT','проект на документ']
 ];
 const selectors=['.kt80-stage-panel h2','.kt80-stage-panel h3','.kt80-dashboard h2','.kt80-dashboard h3','.kt80-step'];
 for(const el of document.querySelectorAll(selectors.join(','))){
  if(!el.children.length){let t=el.textContent;for(const [a,b] of replace)t=t.replaceAll(a,b);el.textContent=t}
 }
 const clear=$('kt80ClearAll');if(clear){clear.textContent='↺ Изчисти работния екран';clear.title='Изчиства само данните от текущия работен екран. Не изтрива служебна преписка от сървър.'}
 const resetTitle=$('kt80ResetTitle');if(resetTitle)resetTitle.textContent='Изчистване на работния екран';
 const resetInfo=$('kt80ResetDescription');if(resetInfo)resetInfo.textContent='Изчистват се само данните в този отворен тестов работен екран. Това НЕ изтрива регистрирана преписка или документи от служебен сървър. Текущият несъхранен работен контекст ще се загуби.';
 const resetConfirm=$('kt80ResetConfirm');if(resetConfirm)resetConfirm.textContent='Изчисти работния екран';
 const source=$('kt80ScreenTitle');if(source)source.style.fontFamily='"Segoe UI",Arial,sans-serif';
 document.querySelectorAll('.kt80-header-actions a.kt80-legacy-float').forEach(a=>{a.title='Независим тестов пример';a.setAttribute('aria-label','Независим тестов пример')});
}
function stagePurpose(step){
 let el=$('kt83CurrentPurpose');if(!el){el=document.createElement('span');el.id='kt83CurrentPurpose';el.className='kt83-ux-purpose';const title=$('kt80ScreenTitle');title?.parentElement?.append(el)}
 if(el)el.textContent=stageMeta[step-1][1];
}
function tileStatus(){
 const s=root.KT80WorkflowState||{},tiles=document.querySelectorAll('#kt80DashboardFive .kt80-dashboard-tile');
 const gisNotRequired=s.normativeGate?.decision==='NOT_REQUIRED'&&s.normativeGate?.expertConfirmed===true;
 const spatialReady=gisNotRequired||!!(s.parcelsConfirmed?.spatiallyVerified&&s.parcelsConfirmed?.pdf1Verified);
 const legalReady=s.lawConfirmed?.expertConfirmed===true&&root.KT83RouteAccess?.currentV11?.()?.ok===true;
 const done=[!!s.intake,!!s.subjectConfirmed?.expertConfirmed&&!!s.subjectConfirmed?.scopeConfirmed,
  spatialReady,legalReady,!!s.routeConfirmed];
 let next=done.findIndex(x=>!x);if(next<0)next=4;
 for(let i=0;i<tiles.length;i++){
  const status=done[i]?'done':i===next?'next':'future';
  tiles[i].dataset.kt83State=status;
  tiles[i].setAttribute('aria-label',(status==='done'?'Завършен · ':status==='next'?'Следва · ':'Предстоящ · ')+tiles[i].textContent.replace(/➜/g,'').trim());
 }
}
function compressGIS(){
 const stage=document.querySelector('.kt80-stage-panel[data-panel="3"]');if(!stage)return;
 const gis=stage.querySelector('.kt80-free-gis');if(!gis)return;
 const source=gis.querySelector('.kt80-gis-source-status');
 if(source){source.setAttribute('aria-live','polite')}
 // Hide only backup/technical inputs, never the actual case-map/GIS result.
 const backup=gis.querySelector('.kt80-gis-backup');
 if(backup){const d=document.createElement('details');d.className='kt83-tech-details';d.append(makeText('summary','Резервно зареждане и технически данни'));backup.before(d);d.append(backup)}
 const toFold=[...gis.querySelectorAll('.kt80-local-index')].filter(n=>!n.closest('details'));
 if(toFold.length){const d=document.createElement('details');d.className='kt83-tech-details';d.append(makeText('summary','Допълнителни технически справки'));toFold[0].before(d);for(const n of toFold)d.append(n)}
}
function foldPreliminaryLegal(){
 const panel=document.querySelector('.kt80-stage-panel[data-panel="4"]');
 const preliminary=$('kt83NormativePanel');
 if(!panel||!preliminary||preliminary.closest('.kt83-legal-orientation'))return;
 const details=document.createElement('details');
 details.className='kt83-tech-details kt83-legal-orientation';
 const sum=makeText('summary','Предварителна ориентация — не е правно заключение');
 details.append(sum);
 preliminary.before(details);details.append(preliminary);
 const note=makeText('p','За процедурна преценка използвайте проверените нормативни основания и доказателства. Предварителният текст не удостоверява компетентност.');
 note.className='kt83-ux-status';details.before(note);
}
function normativeClarity(){
 const box=$('kt83B2CaseBridgeStage4');if(!box)return;
 const existing=$('kt83UXNormativeGap');
 const plain=(box.textContent||'').replace(/\s+/g,' ');
 const zero=/Проверени условни хипотези[^.]{0,170}?:\s*0(?:\s|$)/iu.test(plain);
 if(!zero){existing?.remove();return}
 if(existing)return;
 const warning=document.createElement('p');warning.id='kt83UXNormativeGap';warning.className='kt83-ux-status';
 warning.textContent='Няма проверени нормативни хипотези в този резултат. Това НЕ доказва, че не е приложима процедура. Проверете източниците в Нормативния архив и липсващите факти; при необходимост подгответе конкретно искане за информация.';
 box.after(warning);
}
function reinforceEvidence(){
 // Prevent silently turning a second file selection into a new case reset.
 const intakeFile=$('kt80InputFile');
 intakeFile?.addEventListener('change',e=>{
  if(!root.KT80WorkflowState?.intake)return;
  e.preventDefault();e.stopImmediatePropagation();
  intakeFile.value='';
  const msg=$('kt80FlowMessage');
  if(msg)msg.textContent='Текущата преписка е запазена. Изборът на друг файл не изтрива работния цикъл. Допълването на активна преписка ще се разрешава само чрез отделното действие „Добави документи“, след внедряване на защитеното съхранение.';
 },true);
 $('kt80SubjectConfirmation')?.addEventListener('change',()=>{
  if($('kt80SubjectConfirmation')?.checked)
   root.KT80AdministrativeNotice?.clearError?.('subject');
 });
 const stage4=document.querySelector('.kt80-stage-panel[data-panel="4"]');
 if(stage4&&root.MutationObserver){
  const observer=new MutationObserver(()=>normativeClarity());
  observer.observe(stage4,{subtree:true,childList:true,characterData:true});
  normativeClarity();
 }
}
function init(){inlineHelp();renameStatic();compressGIS();foldPreliminaryLegal();reinforceEvidence();tileStatus();
 document.addEventListener('kt80:stage-open',e=>{if(e.detail?.step>=1&&e.detail.step<=5){activeStep=Number(e.detail.step);stagePurpose(activeStep)}tileStatus()});
 document.addEventListener('kt80:case-change',tileStatus);document.addEventListener('kt80:case-reset',tileStatus);
 for(const id of ['kt80ToSubject','kt80ToParcels','kt80ToLaw','kt80ToProposal','kt80SubjectConfirmation','kt80ScopeConfirmation','kt80LawConfirmed'])$(id)?.addEventListener('click',()=>queueMicrotask(tileStatus));
 root.KT83UXBatch=Object.freeze({stageMeta,openHelp,openPreview,tileStatus});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
