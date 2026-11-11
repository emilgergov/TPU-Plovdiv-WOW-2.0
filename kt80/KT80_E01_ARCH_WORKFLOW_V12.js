/* KT80 E01-ARCH V12: case intake -> subject -> competence -> proposed route -> expert confirmation.
   Existing V26 engines are reused without changing original scripts or treating extracted candidates as verified facts. */
(function(root){'use strict';
const $=id=>document.getElementById(id);
const state={step:1,fileName:null,intake:null,subjectConfirmed:null,lawConfirmed:null,routeConfirmed:null,activeRoute:null};
function message(s){$('kt80FlowMessage').textContent=s}
function route(){return (root.KT80RouteCatalog||[]).find(x=>String(x.id)===$('kt80ProcedureSelect').value)||null}
function resetFrom(step){
 if(step<=2){state.subjectConfirmed=null;$('kt80SubjectConfirmation').checked=false}
 if(step<=3){state.lawConfirmed=null;$('kt80LawConfirmed').checked=false}
 if(step<=4){state.routeConfirmed=null;state.activeRoute=null;$('kt80RouteConfirmation').checked=false;$('kt80RoutePanels').hidden=true}
}
function go(n){
 if(n>state.step+1)return message('Първо преминете последователно през предходните етапи.');
 state.step=n;
 document.querySelectorAll('[data-panel]').forEach(p=>{p.hidden=Number(p.dataset.panel)!==n});
 document.querySelectorAll('.kt80-step').forEach(btn=>{const i=Number(btn.dataset.step);btn.setAttribute('aria-current',i===n?'step':'false');btn.disabled=i>n+1});
 message('');
}
function fillRouteCatalog(){
 const sel=$('kt80ProcedureSelect');(root.KT80RouteCatalog||[]).filter(x=>x.type!=='internal_tool').forEach(x=>{
 const opt=document.createElement('option');opt.value=String(x.id);opt.textContent='№'+String(x.id).padStart(2,'0')+' · '+x.title;sel.append(opt)
 });
}
function showIntake(result){
 state.intake=result;resetFrom(2);
 const files=(result.files||[]).length,subjects=result.subject_candidates||[],ids=result.classification?.leading_candidates||[];
 const lines=['Прочетени файлове: '+files,'Кандидати за предмет: '+subjects.length,'Кандидати за водещи имоти: '+ids.length];
 if(result.semantic_review?.warnings?.length)lines.push('Внимание: '+result.semantic_review.warnings.join('; '));
 if(result.classification?.warnings?.length)lines.push(result.classification.warnings.join(' '));
 $('kt80InputStatus').textContent=lines.join('\n');
 // Source object is often structured; only cautiously use explicit recognizable text candidates.
 const first=subjects.find(x=>typeof x==='string'||typeof x?.title==='string'||typeof x?.heading==='string');
 const candidate=typeof first==='string'?first:typeof first?.title==='string'?first.title:typeof first?.heading==='string'?first.heading:'';
 if(candidate&&!$('kt80SubjectText').value.trim()){$('kt80SubjectText').value=candidate;$('kt80SubjectHint').textContent='Предложение от входящия документ — непотвърдено. Редактирайте преди продължаване.'}
 if(ids.length&&!$('kt80ParcelInput').value.trim()){$('kt80ParcelInput').value=ids.join('; ');$('kt80ParcelNormalize').click()}
}
async function process(){
 const file=$('kt80InputFile').files?.[0];if(!file)return message('Изберете файл за обработка.');
 if(!root.V26LocalIntake||typeof root.V26LocalIntake.process!=='function')return message('Модулът за приемане не е зареден. Обработката не е извършена.');
 state.fileName=file.name;$('kt80ProcessFile').disabled=true;$('kt80InputStatus').textContent='Обработка на '+file.name+' …';
 try{const result=await root.V26LocalIntake.process(file);showIntake(result);message('Извличането приключи. Предметът и имотите изискват експертно потвърждение.')}
 catch(error){$('kt80InputStatus').textContent='Неуспешна обработка на файл: '+String(error?.message||error);message('Не е направена оценка по преписката. Можете да продължите с ръчно въвеждане.')}
 finally{$('kt80ProcessFile').disabled=false}
}
function requireSubject(){
 const s=$('kt80SubjectText').value.trim();
 if(!s)return message('Въведете или редактирайте предмета преди преминаване към правната квалификация.');
 if(!$('kt80SubjectConfirmation').checked)return message('Необходимо е експертно потвърждение на предмета и преглед на имотите.');
 const parcels=root.KT80ParcelDraft||null;
 if($('kt80ParcelInput').value.trim()&&!parcels)return message('Проверете имотите чрез бутона за нормализация.');
 if(parcels&&(parcels.invalid.length||parcels.uncertain.length))return message('Има невалидни или нееднозначни кадастрални идентификатори. Коригирайте ги или изчистете полето.');
 state.subjectConfirmed={text:s,parcels:parcels?.ids||[],file:state.fileName,expertConfirmed:true};resetFrom(3);go(3);
}
function requireLaw(){
 const authority=$('kt80Authority').value,note=$('kt80LegalNotes').value.trim();
 if(!authority||authority==='other'||!note||!$('kt80LawConfirmed').checked)return message('Изисква се проверен компетентен орган, конкретна правна обосновка и експертно потвърждение. При друг орган запишете подробностите, но изборът не може да бъде потвърден без проверка.');
 state.lawConfirmed={authority,note,expertConfirmed:true};resetFrom(4);go(4);
}
function proposal(){
 const r=route(),host=$('kt80ProposalInfo');
 if(!r){host.textContent='Няма избран кандидат-маршрут.';return}
 host.textContent='№'+r.id+' · '+r.title+'\nРаботни правни ориентири: '+r.legal+'\nНеобходими проверки: '+r.validation+'\nТова е кандидат от каталога, а не потвърдена правна приложимост.';
 resetFrom(4);
}
function review(){
 if(!state.subjectConfirmed)return message('Не е потвърден предметът.');
 if(!state.lawConfirmed)return message('Не е потвърдена компетентността и правната квалификация.');
 const r=route();if(!r)return message('Изберете кандидат-маршрут.');
 $('kt80ReviewSummary').textContent='Предмет: '+state.subjectConfirmed.text+'\nИмотни идентификатори (непотвърдени в кадастъра): '+(state.subjectConfirmed.parcels.join(', ')||'не са посочени')+'\nОрган: '+(state.lawConfirmed.authority==='riosv'?'РИОСВ – Пловдив':'МОСВ')+'\nПредварително основание: '+state.lawConfirmed.note+'\nПредложен маршрут: №'+r.id+' · '+r.title;
 $('kt80RouteConfirmation').checked=false;$('kt80RoutePanels').hidden=true;state.routeConfirmed=null;state.activeRoute=null;go(5);
}
function activate(){
 const r=route();if(!$('kt80RouteConfirmation').checked||!r)return message('Потвърдете избрания маршрут като експерт.');
 state.routeConfirmed={routeId:r.id,routeLabel:r.title,expertConfirmed:true,finalAdministrativeAct:false};
 state.activeRoute=r;$('kt80RoutePanels').hidden=false;
 message('Маршрут №'+r.id+' е активиран за експертна работа. Това НЕ означава доказана нормативна готовност и не разрешава издаване на акт.');
}
function init(){
 fillRouteCatalog();$('kt80ProcessFile').addEventListener('click',process);$('kt80ToSubject').addEventListener('click',()=>go(2));
 $('kt80ToLaw').addEventListener('click',requireSubject);$('kt80ToProposal').addEventListener('click',requireLaw);
 $('kt80ProcedureSelect').addEventListener('change',proposal);$('kt80ToConfirm').addEventListener('click',review);
 $('kt80ActivateRoute').addEventListener('click',activate);
 $('kt80OpenConditions').addEventListener('click',()=>{if(!state.routeConfirmed)return; if(typeof root.KT80OpenRoute==='function')root.KT80OpenRoute(state.activeRoute)});
 document.querySelectorAll('.kt80-step').forEach(btn=>btn.addEventListener('click',()=>{const target=Number(btn.dataset.step);if(target<=state.step)go(target);else message('За преминаване напред използвайте бутона за потвърждение в текущия етап.')})); 
 $('kt80SubjectText').addEventListener('input',()=>{if(state.subjectConfirmed)resetFrom(2)});
 $('kt80ParcelInput').addEventListener('input',()=>{if(state.subjectConfirmed)resetFrom(2)});
 $('kt80LegalNotes').addEventListener('input',()=>{if(state.lawConfirmed)resetFrom(3)});
 $('kt80Authority').addEventListener('change',()=>{if(state.lawConfirmed)resetFrom(3)});
 $('kt80InputFile').addEventListener('change',()=>{$('kt80InputStatus').textContent='Избран файл: '+($('kt80InputFile').files?.[0]?.name||'няма')+'. За да извлечете данни, натиснете „Обработи преписката“.';state.fileName=null;state.intake=null;resetFrom(2)});
 go(1);
 root.KT80WorkflowState=state;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
