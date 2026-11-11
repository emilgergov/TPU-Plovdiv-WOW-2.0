/* KT80 FREE GIS V17: lean expert workflow; V26 engines are linked, original scripts untouched. */
(function(root){'use strict';
const $=id=>document.getElementById(id);
const state={step:1,highest:1,fileName:null,intake:null,subjectConfirmed:null,parcelsConfirmed:null,lawConfirmed:null,routeConfirmed:null,activeRoute:null,generation:0,abort:null};
function say(value){$('kt80FlowMessage').textContent=value||''}
function setBadge(){ $('kt80CaseBadge').textContent=state.fileName?'Преписка: '+state.fileName:'Нова преписка';$('kt80SubjectBadge').textContent=state.subjectConfirmed?'Предмет: потвърден':'Предмет: непотвърден';$('kt80RouteBadge').textContent=state.routeConfirmed?'Маршрут №'+state.routeConfirmed.routeId+' · приет':'Процедура: неопределена'}
function candidate(){return (root.KT80RouteCatalog||[]).find(r=>String(r.id)===$('kt80ProcedureSelect').value)||null}
function invalidate(level){
 if(level<=2){state.subjectConfirmed=null;$('kt80SubjectConfirmation').checked=false}
 if(level<=3){state.parcelsConfirmed=null;$('kt80ParcelsConfirmation').checked=false}
 if(level<=4){state.lawConfirmed=null;$('kt80LawConfirmed').checked=false}
 if(level<=5){state.routeConfirmed=null;state.activeRoute=null;$('kt80RouteConfirmation').checked=false;$('kt80RoutePanels').hidden=true}
 setBadge();
}
function go(step){
 // Navigation is unrestricted; legal progression and procedural acceptance remain gated by confirmation.
 state.step=step;state.highest=Math.max(step,state.highest);
 document.querySelectorAll('.kt80-stage-panel[data-panel]').forEach(p=>p.hidden=Number(p.dataset.panel)!==step);
 document.querySelectorAll('.kt80-step').forEach(b=>{const i=Number(b.dataset.step);b.disabled=false;b.setAttribute('aria-current',i===step?'step':'false')});
 say('');setBadge();
 if(typeof root.KT80DashboardOpenStage==='function')root.KT80DashboardOpenStage(step);
}
function routes(){
 const sel=$('kt80ProcedureSelect');(root.KT80RouteCatalog||[]).filter(r=>r.type!=='internal_tool').forEach(r=>{
 const opt=document.createElement('option');opt.value=String(r.id);opt.textContent='№'+String(r.id).padStart(2,'0')+' · '+r.title;sel.append(opt)
 });
}
function intakeResults(data){
 state.intake=data;invalidate(2);
 const docs=data.files||[],subjects=data.subject_candidates||[],ids=data.classification?.leading_candidates||[];
 $('kt80InputStatus').textContent='Прочетени файлове: '+docs.length+'; кандидати за предмет: '+subjects.length+'; кандидати за водещи имоти: '+ids.length+'.\nИзвличането е предварително и изисква преглед.';
 const title=subjects.map(x=>typeof x==='string'?x:x?.title||x?.heading||'').find(x=>typeof x==='string'&&x.trim());
 if(title&&!$('kt80SubjectText').value.trim()){$('kt80SubjectText').value=title;$('kt80SubjectHint').textContent='Кандидат от прочетеното (непотвърден); редактирайте и потвърдете.'}
 if(ids.length&&!$('kt80ParcelInput').value.trim()){$('kt80ParcelInput').value=ids.join('; ');$('kt80ParcelNormalize').click()}
 const possible=[];for(const d of docs){
 const nm=String(d.filename||d.file||d.name||'').toLocaleLowerCase('bg');
 const label=/уведомлен|notification|uvedomlen/.test(nm)?'Възможно уведомление':/искане|request/.test(nm)?'Възможно искане':/жалба/.test(nm)?'Възможна жалба':/сигнал/.test(nm)?'Възможен сигнал':null;
 if(label)possible.push(label+' — '+(d.filename||d.file||d.name));
 }
 $('kt80FormMatches').textContent=possible.length?possible.join('\n')+'\nСамо разпознаване на кандидати по име, без нормативно удостоверяване.':'Няма надеждно определен входен образец по имената на файловете. Сравнението по реквизити предстои.';
}
async function process(){
 const file=$('kt80InputFile').files?.[0];if(!file)return say('Изберете преписка.');
 if(typeof root.V26LocalIntake?.process!=='function')return say('Наличният модул за обработка на преписки не е зареден.');
 const generation=++state.generation;
 if(state.abort)state.abort.abort();state.abort=new AbortController();
 const isCurrent=()=>generation===state.generation&&!state.abort?.signal.aborted;
 $('kt80ProcessFile').disabled=true;state.fileName=file.name;setBadge();$('kt80InputStatus').textContent='Обработка: '+file.name+'…';
 try{
  const result=await root.V26LocalIntake.process(file);
  if(!isCurrent())return;
  intakeResults(result);
  if(root.KT80IPMaster){const draft=root.KT80IPMaster.build(result);if(!isCurrent())return;root.KT80IPMasterDraft=draft;root.KT80IPMaster.render(draft);}
  if(typeof root.KT80FormMatcher?.compare==='function')await root.KT80FormMatcher.compare(result,{isCurrent,signal:state.abort.signal});
  if(!isCurrent())return;
  say('Прочитът приключи. Следва проверка на предмета и имотите от експерта.');
 }catch(e){
  if(!isCurrent())return;
  $('kt80InputStatus').textContent='Обработката не успя: '+String(e?.message||e);
  say('Не успяхме да прочетем преписката. Можете да продължите с ръчно въвеждане.');
 }finally{if(isCurrent()){$('kt80ProcessFile').disabled=false;state.abort=null}}
}
function confirmSubject(){
 const value=$('kt80SubjectText').value.trim();
 if(!value)return say('Въведете или редактирайте предмета.');
 if(!$('kt80SubjectConfirmation').checked)return say('Потвърдете предмета като експерт.');
 invalidate(3);state.subjectConfirmed={text:value,source:state.fileName,expertConfirmed:true};go(3);
}
function confirmParcels(){
 const raw=$('kt80ParcelInput').value.trim();
 if(raw)$('kt80ParcelNormalize').click(); // no stale normalization after edits
 const draft=raw?root.KT80ParcelDraft:null;
 if(raw&&!draft)return say('Неуспешна нормализация. Проверете имотите.');
 if(draft&&(draft.invalid.length||draft.uncertain.length))return say('Има невалидни или нееднозначни имоти. Коригирайте ги преди продължаване.');
 if(!$('kt80ParcelsConfirmation').checked)return say('Потвърдете прегледа на имотите и ролите им.');
 invalidate(4);state.parcelsConfirmed={ids:[...(draft?.ids||[])],expertConfirmed:true,spatiallyVerified:false};go(4);
}
function confirmLaw(){
 const authority=$('kt80Authority').value,legal=$('kt80LegalNotes').value.trim();
 if(!authority||authority==='other'||!legal||!$('kt80LawConfirmed').checked)return say('Необходим е проверен компетентен орган, аргументирано основание и експертно потвърждение.');
 invalidate(5);state.lawConfirmed={authority,legal,expertConfirmed:true};go(5);
}
function showProposal(){
 invalidate(5);const r=candidate(),target=$('kt80ProposalInfo');
 if(!r){target.textContent='Не е избран маршрут.';return}
 target.textContent='№'+r.id+' · '+r.title+'\nПравни ориентири: '+r.legal+'\nКонтролни изисквания: '+r.validation+'\nТова е предложение от каталога, а НЕ автоматизирана правна преценка.';
 $('kt80ReviewSummary').textContent='Предмет: '+(state.subjectConfirmed?.text||'няма')+'\nИмоти: '+(state.parcelsConfirmed?.ids.join(', ')||'не са посочени')+'\nКомпетентен орган (експертно посочен): '+(state.lawConfirmed?.authority==='riosv'?'РИОСВ – Пловдив':'МОСВ')+'\nПравни основания: '+state.lawConfirmed?.legal;
}
function confirmProcedure(){
 const r=candidate();
 if(!state.subjectConfirmed||!state.parcelsConfirmed||!state.lawConfirmed)return say('Не са потвърдени всички предходни етапи.');
 if(!r||!$('kt80RouteConfirmation').checked)return say('Изберете маршрут и потвърдете експертната приемка.');
 state.routeConfirmed={routeId:r.id,label:r.title,expertConfirmed:true,legalReadiness:false,finalAdministrativeAct:false};
 state.activeRoute=r;$('kt80RoutePanels').hidden=false;setBadge();
 say('Приет е работен маршрут №'+r.id+'. Тепърва се проверяват специализираните доказателства. Изходящ документ НЕ е разрешен.');
}
/* Reset is one central operation, independent of the currently selected stage. */
function resetAll(){
 ++state.generation;
 if(state.abort){state.abort.abort();state.abort=null}
 // Clear only this KT80 working case. NEVER mutate permanent archives, V27.35 or documents saved outside this page.
 Object.assign(state,{step:1,highest:1,fileName:null,intake:null,subjectConfirmed:null,parcelsConfirmed:null,lawConfirmed:null,routeConfirmed:null,activeRoute:null});
 for(const id of ['kt80InputFile','kt80SubjectText','kt80ParcelInput','kt80LegalNotes']){
  const node=$(id);if(node)node.value='';
 }
 for(const id of ['kt80SubjectConfirmation','kt80ParcelsConfirmation','kt80LawConfirmed','kt80RouteConfirmation']){
  const node=$(id);if(node)node.checked=false;
 }
 for(const id of ['kt80Authority','kt80ProcedureSelect']){const node=$(id);if(node)node.selectedIndex=0}
 $('kt80ProcessFile').disabled=false;
 $('kt80InputStatus').textContent='Няма заредена преписка. Можете да започнете отначало.';
 $('kt80SubjectHint').textContent='Предметът не е потвърден. Редактирайте при необходимост.';
 $('kt80FormMatches').textContent='След обработката ще се появят кандидатите за входен образец.';
 $('kt80IPMasterEvidence').replaceChildren();
 $('kt80IPMasterEvidence').textContent='Доказателствените полета ще се появят след прочит на преписката.';
 $('kt80ParcelResults').replaceChildren();
 $('kt80ProposalInfo').textContent='Няма потвърдена процедура.';
 $('kt80ReviewSummary').textContent='';
 $('kt80RoutePanels').hidden=true;
 delete root.KT80IPMasterDraft;delete root.KT80ParcelDraft;
 // Clear pending overlays and opened case-related guide panels; the catalogue itself remains intact.
 const overlay=$('overlay');overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');
 for(const id of ['tabs','rows','source'])$(id)?.replaceChildren();
 const guide=$('kt80Guide');if(guide)guide.open=false;
 document.querySelectorAll('.kt80-template-help').forEach(x=>x.open=false);
 // Reset case-independent search/filter as a clean entry screen.
 if($('search')){$('search').value='';$('search').dispatchEvent(new Event('input',{bubbles:true}))}
 if($('family')){$('family').selectedIndex=0;$('family').dispatchEvent(new Event('change',{bubbles:true}))}
 document.dispatchEvent(new Event('kt80:case-reset'));
 go(1);root.KT80DashboardHome?.();setBadge();say('Готово! Всичко е изчистено. Можем да започнем нова преписка.');
 return {reset:true,generation:state.generation};
}
function init(){
 routes();$('kt80ProcessFile').addEventListener('click',process);
 $('kt80ToSubject').addEventListener('click',()=>go(2));
 $('kt80ToParcels').addEventListener('click',confirmSubject);
 $('kt80ToLaw').addEventListener('click',confirmParcels);
 $('kt80ToProposal').addEventListener('click',confirmLaw);
 $('kt80ProcedureSelect').addEventListener('change',showProposal);
 $('kt80ActivateRoute').addEventListener('click',confirmProcedure);
 $('kt80OpenConditions').addEventListener('click',()=>{if(state.routeConfirmed&&typeof root.KT80OpenRoute==='function')root.KT80OpenRoute(state.activeRoute)});
 document.querySelectorAll('.kt80-step').forEach(b=>b.addEventListener('click',()=>{const target=Number(b.dataset.step);go(target)}));
 $('kt80SubjectText').addEventListener('input',()=>invalidate(2));
 $('kt80ParcelInput').addEventListener('input',()=>invalidate(3));
 $('kt80LegalNotes').addEventListener('input',()=>invalidate(4));
 $('kt80Authority').addEventListener('change',()=>invalidate(4));
 $('kt80InputFile').addEventListener('change',()=>{++state.generation;if(state.abort){state.abort.abort();state.abort=null}$('kt80ProcessFile').disabled=false;state.fileName=null;state.intake=null;invalidate(2);$('kt80InputStatus').textContent='Избран файл: '+($('kt80InputFile').files?.[0]?.name||'няма')+'. Натиснете „Обработи преписката“.'});
 go(1);root.KT80WorkflowState=state;root.KT80ResetCurrentCase=resetAll;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
