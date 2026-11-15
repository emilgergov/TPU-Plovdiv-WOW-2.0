/* VT03-R4 interface supplement. Keeps all evidence and decision engines unchanged. */
(function(w){'use strict';
const $=id=>document.getElementById(id),stage=n=>document.querySelector('.kt80-stage-panel[data-panel="'+n+'"]');
const mk=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
const style=mk('style');style.textContent=[
'.kt80-workflow>.kt83-p1-route,.kt80-workflow>.kt84-work-step{display:none!important}',
'.kt80-stage-panel[data-panel="3"] .kt85-stage3-header{display:none!important}',
'.kt80-stage-panel[data-panel="3"] .kt85-gis-main{grid-template-columns:minmax(0,1.55fr) minmax(345px,.95fr)!important;gap:10px}',
'.kt80-stage-panel[data-panel="3"] .kt85-gis-sidebar{gap:7px!important}',
'.kt80-stage-panel[data-panel="3"] #kt80GISMap{max-height:440px!important;min-height:270px!important}',
'.kt80-stage-panel[data-panel="3"] .kt85-side-card{padding:9px!important}',
'.kt80-stage-panel[data-panel="3"] #kt80GISLabelsMode{max-width:150px}',
'.kt80-stage-panel[data-panel="3"] label[for="kt80GISLabelsMode"]{color:#17432f!important}',
'.kt86-matrix{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start}',
'.kt86-panel{background:#193f30;border:1px solid #759479;border-radius:9px;padding:13px;min-width:0;margin:9px 0}',
'.kt86-panel h3{color:#efd18a;margin:0 0 10px;font:700 17px "Segoe UI",Arial}',
'.kt86-item{padding:9px 0;border-bottom:1px solid #577961;font:13px/1.5 "Segoe UI",Arial;overflow-wrap:anywhere}',
'.kt86-item strong{display:block;color:#f0d28c;margin:0 0 4px}',
'.kt86-item small{display:block;color:#c6d7c7}',
'.kt86-norm{padding:9px;margin:8px 0;background:#234b38;border:1px solid #658c6e;border-radius:7px}',
'.kt86-norm select,.kt86-norm textarea{width:100%;font:13px "Segoe UI",Arial;margin-top:5px}',
'.kt86-matrix button{margin:7px 0!important}',
'.kt86-result{border:1px solid #d4ba80;background:#234433;padding:14px;border-radius:9px;margin:12px 0}',
'.kt86-result h3{color:#f6d897;margin:0 0 9px}',
'.kt86-result #kt80Authority{max-width:520px}',
'.kt86-result label{margin:6px 0!important}',
'.kt86-fold{border:1px solid #64826d;border-radius:8px;padding:10px;margin:9px 0}',
'.kt86-fold summary{cursor:pointer;color:#f6d28c;font-weight:700}',
'#kt86-stage5{position:fixed;inset:0;background:#05180feb;z-index:400;overflow:auto;padding:20px}',
'#kt86-stage5[hidden]{display:none!important}',
'.kt86-sheet{max-width:1120px;margin:0 auto;padding:18px;background:#103528;border:1px solid #d4b16e;border-radius:12px;color:#f0ead6}',
'.kt86-sheet h2{color:#f0d18b;margin:0}',
'.kt86-cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
'.kt86-sheet textarea{width:100%;min-height:160px;background:#faf8ed;color:#17372a;padding:12px;border-radius:7px;font:14px/1.5 "Segoe UI",Arial}',
'.kt86-sheet button{background:#daba76;color:#153627;border:1px solid #e8cd8b;border-radius:8px;padding:10px;font-weight:700;cursor:pointer;margin:5px}',
'.kt86-sheet button:disabled{opacity:.45}',
'.kt86-sheet select{width:100%}',
'.kt86-pending{border-left:4px solid #e4bb6b;padding:10px;background:#3a3627;margin:10px 0}',
'@media(max-width:900px){.kt86-matrix,.kt86-cols{grid-template-columns:1fr}.kt80-stage-panel[data-panel="3"] .kt85-gis-main{grid-template-columns:1fr!important}}'
].join('\n');document.head.append(style);
const facts=(el)=>{const s=w.KT80WorkflowState||{},c=s.subjectConfirmed||{};el.replaceChildren();
for(const [key,value,meta] of [
['Предмет',c.text||$('kt80SubjectText')?.value||'НЯМА ДАННИ',c.expertConfirmed?'Потвърден':'Непотвърден проект'],
['Обхват',c.scope||$('kt80ScopeText')?.value||'НЯМА ДАННИ',c.scopeConfirmed?'Потвърден':'Непотвърден проект'],
['Имот и ГИС',$('kt80ParcelInput')?.value||'НЯМА ДАННИ',$('kt80GISStatus')?.textContent||'Няма удостоверен ГИС резултат'],
['Документи','Преписка, ПИ MASTER, ГИС/PDF1','Източниците и статусът се запазват в оригиналните етапи']
]){const line=mk('div',undefined,'kt86-item');line.append(mk('strong',key),mk('span',value),mk('small',meta));el.append(line)}};
function stage4(){
const p=stage(4);if(!p||$('kt86Matrix'))return;
const matrix=mk('div',undefined,'kt86-matrix');matrix.id='kt86Matrix';
const left=mk('section',undefined,'kt86-panel'),right=mk('section',undefined,'kt86-panel');
left.append(mk('h3','Входни факти · Етапи 1–3'));const lines=mk('div');left.append(lines);
const refresh=mk('button','Обнови фактите');refresh.type='button';refresh.onclick=()=>facts(lines);left.append(refresh);
right.append(mk('h3','Факт → приложима норма · MASTER V11'),mk('p','Съпоставете с точните разпоредби. Изборът не променя фактите и не удостоверява приложимостта.'));
for(const [title,main,alternative] of [
['Характер на дейността','ЗООС · приложения №1/№2','Наредба за ОВОС · приложимост'],
['Защитени зони','ЗБР · чл. 31 и Наредба за ОС','ЗЗТ и индивидуални заповеди'],
['Компетентност','ЗООС/ЗБР · компетентен орган','Наредба за ОС · чл. 6а, когато е приложим'],
['Процесуален ред','Приложима специална процедура','АПК · субсидиарно']
]){
const group=mk('div',undefined,'kt86-norm');group.append(mk('strong',title));
const select=mk('select');for(const [v,label] of [['','Основание за експертна проверка'],[main,main],[alternative,alternative],['other','Друго основание от MASTER']]){const o=mk('option',label);o.value=v;select.append(o)}
const why=mk('textarea');why.rows=2;why.placeholder='Точен член, алинея, точка, архивен ИД и мотив';
group.append(select,why);right.append(group);
}
const existing=$('kt83B2CaseBridgeStage4');if(existing){const detail=mk('details',undefined,'kt86-fold');detail.append(mk('summary','Пълна независима нормативна проверка · архив V11'),existing);right.append(detail)}
matrix.append(left,right);
const heading=p.querySelector('h2');heading?.after(matrix);
const intro=p.querySelector(':scope > p');if(intro)intro.hidden=true;
const result=mk('section',undefined,'kt86-result');result.append(mk('h3','Компетентен орган и мотивирано процедурно предложение'));
result.append(mk('p','Предложение: проверете компетентността на РИОСВ – Пловдив спрямо приложимите разпоредби и всички изключения; при липса на данни предложете конкретно допълване.'));
const auth=$('kt80Authority'),notes=$('kt80LegalNotes'),check=$('kt80LawConfirmed'),next=$('kt80ToProposal');
for(const el of [p.querySelector('label[for="kt80Authority"]'),auth,p.querySelector('label[for="kt80LegalNotes"]'),notes,check?.closest('label'),next])if(el)result.append(el);
matrix.after(result);facts(lines);
for(const event of ['kt80:stage-open','kt80:case-change','kt80:case-reset','kt82:evidence-invalidated'])document.addEventListener(event,()=>facts(lines));
w.KT86Stage4={refresh:()=>facts(lines)};
}
function stage5(){
if($('kt86-stage5'))return;const overlay=mk('section',undefined);overlay.id='kt86-stage5';overlay.hidden=true;
const sheet=mk('div',undefined,'kt86-sheet');overlay.append(sheet);
const top=mk('div');top.style.display='flex';top.style.justifyContent='space-between';top.append(mk('h2','5 · Процедура и административен резултат'));
const close=mk('button','Затвори');close.onclick=()=>{overlay.hidden=true;document.body.style.overflow=''};top.append(close);sheet.append(top);
sheet.append(mk('p','Винаги има предложение за следващо действие. Потвърждение на процедура и Word са достъпни само при проверена правна готовност.'));
const cols=mk('div',undefined,'kt86-cols'),a=mk('section',undefined,'kt86-panel'),b=mk('section',undefined,'kt86-panel');cols.append(a,b);sheet.append(cols);
a.append(mk('h3','Получени факти'));const f=mk('div');a.append(f);
b.append(mk('h3','Мотивирано предложение и проект на писмо'));const message=mk('p',undefined,'kt86-pending');b.append(message);
const draft=mk('textarea');draft.id='kt86ProposalText';b.append(draft);
const restore=mk('button','Възстанови предложението'),approve=mk('button','Експертно потвърждение');b.append(restore,approve);
const route=mk('section',undefined,'kt86-panel');route.append(mk('h3','Служебно заключение · маршрутизиране'));
const chosen=mk('p','№ на кандидат панел: непотвърден'),citation=mk('p','Нормативно основание: предстои проверка');
route.append(chosen,citation);
const menu=mk('select');menu.append(new Option('Изберете кандидат след проверка',''));
for(const c of w.KT80RouteCatalog||[])menu.append(new Option('№'+String(c.id).padStart(2,'0')+' · '+c.title,c.id));
menu.onchange=()=>{const c=(w.KT80RouteCatalog||[]).find(x=>String(x.id)===menu.value);chosen.textContent=c?'Предложен №'+String(c.id).padStart(2,'0')+' · '+c.title:'№ на кандидат панел: непотвърден';citation.textContent=c?'Каталожна референция: '+c.legal+' · подлежи на проверка':'Нормативно основание: предстои проверка'};
route.append(menu);sheet.append(route);
const word=mk('section',undefined,'kt86-panel');word.append(mk('h3','Word по служебната бланка · запазен оригинален генератор'));
word.append(mk('p','Оригиналният DOCX генератор изисква нормативно потвърждение и оригинална бланка РИОСВ – Пловдив. Повторният печат изисква реално съхранена версия; не се симулира архив.'));
const go=mk('button','Отвори работния генератор след потвърждение');go.onclick=()=>{if(w.KT83RouteAccess?.canOpenStage?.(5)===true){close.onclick();w.KT80DashboardOpenStage?.(5)}else message.textContent='Няма потвърдени данни за легитимен Word проект. Предложение: довършете Етап 4 и проверете оригиналната бланка.'};word.append(go);sheet.append(word);
let initial='';
function render(){facts(f);const s=w.KT80WorkflowState||{},ready=Boolean(s.subjectConfirmed?.expertConfirmed&&s.subjectConfirmed?.scopeConfirmed);
const law=w.KT83RouteAccess?.currentV11?.(),valid=Boolean(ready&&law?.verified===true&&law?.ok===true);
initial=valid?String(law.motivatedProposal||law.reasonedAssessment||'Проверете нормативния резултат'):
'Предложение: '+(!ready?'потвърдете предмета и обхвата; ':'')+'проверете приложимите норми и компетентността във V11; изяснете конкретните липсващи доказателства. Процедурата остава непотвърдена.';
draft.value=initial;message.textContent=valid?'Правната проверка е налична; необходим е експертен преглед.':'Правната готовност не е удостоверена. Не се представя фиктивна процедура.';
approve.disabled=!valid;menu.value='';chosen.textContent='№ на кандидат панел: непотвърден';citation.textContent='Нормативно основание: предстои проверка';}
restore.onclick=()=>{draft.value=initial};
approve.onclick=()=>{message.textContent='За окончателно потвърждение използвайте оригиналните нормативни контроли в Етап 5.'};
document.body.append(overlay);w.KT86Stage5Preview={open(){render();overlay.hidden=false;document.body.style.overflow='hidden'}};
document.addEventListener('click',e=>{const t=e.target.closest?.('.kt80-dashboard-tile[data-kt80-kind="step"][data-kt80-index="5"]');if(!t||w.KT83RouteAccess?.canOpenStage?.(5)===true)return;e.preventDefault();e.stopImmediatePropagation();w.KT86Stage5Preview.open()},true);
}
function init(){stage4();stage5();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,1100),{once:true});else setTimeout(init,1100);
})(window);
