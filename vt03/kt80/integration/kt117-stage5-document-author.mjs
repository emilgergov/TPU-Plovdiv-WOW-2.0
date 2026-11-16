import {collectStageEvidence} from './kt95-stage-evidence-handoff.mjs';
const make=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x};
const clean=x=>String(x??'').trim();
function initialize(){
 const panel=document.getElementById('kt116Stage5');
 if(!panel)return;
 let source=null,versions=[],confirmed=null,busy=false;
 const endpoint='https://tpu-plovdiv-ai-author-v27.emilgergov.workers.dev/stage5-document';
 const stylesheet=make('style');
 stylesheet.textContent='#kt117Stage5{color:#f7f0df;font:14px/1.6 Verdana,Arial}#kt117Stage5 .kt117-context{padding:14px;background:#264e3b;border:1px solid #8a9b79;border-radius:8px;margin:12px 0}#kt117Stage5 .kt117-heading{font-weight:700;color:#f6d18a;margin:0 0 9px}#kt117Stage5 .kt117-main{font-size:18px;font-weight:700;color:#ffdfa2;margin:8px 0}#kt117Stage5 .kt117-paper{padding:16px;background:#284d3c;border-left:4px solid #d9bb7a;white-space:pre-wrap;line-height:1.7;margin:12px 0}#kt117Stage5 .kt117-actions{display:flex;gap:9px;flex-wrap:wrap;margin:16px 0}#kt117Stage5 .kt117-actions button{font:700 13px Verdana,Arial;background:#dab972;color:#163a29;border:none;border-radius:6px;padding:11px 14px;cursor:pointer}#kt117Stage5 .kt117-actions button[disabled]{opacity:.5;cursor:default}#kt117Stage5 [hidden]{display:none!important}#kt117Stage5 textarea[hidden]{display:none!important}#kt117Stage5 .kt117-actions button[hidden]{display:none!important}#kt117Stage5 textarea{width:100%;min-height:360px;box-sizing:border-box;font:13px/1.6 Verdana,Arial;background:#fffdf5;color:#142e22;padding:12px;border-radius:6px}#kt117Stage5 .kt117-note{font-size:12px;color:#f2d398;white-space:pre-wrap}#kt117Stage5 details{padding:10px;border:1px solid #68896e;border-radius:7px;margin:10px 0}#kt117Stage5 summary{color:#f5d18b;cursor:pointer}';
 document.head.append(stylesheet);
 const ui=make('section');ui.id='kt117Stage5';
 const heading=make('h3','5. Изготвяне на административния документ');
 const context=make('div');context.className='kt117-context';
 const contextTitle=make('div','Потвърдено предложение от Етап 4');contextTitle.className='kt117-heading';
 const direction=make('div');direction.className='kt117-main';
 const details=make('div'), warnings=make('details'),warningText=make('div');
 warnings.append(make('summary','Бележки от нормативния преглед'),warningText);
 context.append(contextTitle,direction,details,warnings);
 const action=make('div');action.className='kt117-actions';
 const generate=make('button','Изготви текст с EG Автора');
 const edit=make('button','Редактирай текста'),save=make('button','Запази редакцията'),cancel=make('button','Откажи редакцията'),confirm=make('button','Потвърди текста');
 edit.hidden=true;save.hidden=true;cancel.hidden=true;confirm.hidden=true;
 action.append(generate); const reviewActions=make('div'); reviewActions.className='kt117-actions'; reviewActions.append(edit,save,cancel,confirm);
 const note=make('p');note.className='kt117-note';
 const preview=make('div');preview.className='kt117-paper';preview.hidden=true;
 const textarea=make('textarea');textarea.hidden=true;textarea.style.display='none';textarea.setAttribute('aria-label','Редакция на административния документ');
 const confirmedText=make('div');confirmedText.className='kt117-note';
 const word=make('button','Създай Word по бланката');word.disabled=true;
 const wordInfo=make('p','Word генераторът ще се активира след свързване и проверка на утвърдената бланка на РИОСВ – Пловдив. Няма да се създава документ по приблизителен образец.');
 wordInfo.className='kt117-note';
 const original=make('details');original.append(make('summary','Пълен експертно потвърден анализ от Етап 4'),make('pre'));
 const footer=make('div');footer.className='kt117-actions';footer.append(word);
 ui.append(heading,context,action,note,preview,textarea,reviewActions,confirmedText,footer,wordInfo,original);
 panel.replaceChildren(ui);
 const live=()=>window.KT116ExpertHandoff?.snapshot?.()||null;
 function sync(){
  const a=live();
  if(!a){source=null;versions=[];confirmed=null;context.hidden=true;action.hidden=true;preview.hidden=true;textarea.hidden=true;textarea.style.display='none';reviewActions.hidden=true;footer.hidden=true;original.hidden=true;note.textContent='Няма потвърдено предложение по текущата преписка.';return;}
  if(source&&source.caseId===a.caseId&&source.version===a.version&&source.text===a.text)return;
  source=a;versions=[];confirmed=null;context.hidden=false;action.hidden=false;reviewActions.hidden=false;footer.hidden=true;
  original.hidden=false;original.querySelector('pre').textContent=a.text;
  let panelLine=a.text.match(/ИЗБРАН\s+ПАНЕЛ\s*:\s*0?\d{1,2}\b[^\n]*/iu)?.[0]||'Административно направление, потвърдено от експерта';
  direction.textContent=panelLine.replace(/^ИЗБРАН\s+ПАНЕЛ\s*:\s*/iu,'');
  const p=window.KT80WorkflowState?.subjectConfirmed||{};
  const parcels=collectStageEvidence(window).parcelIds;
  details.textContent='Предмет: '+clean(p.text)+'\nИмот(и): '+parcels.join(', ')+'\nЕксперт: '+a.expert+' · Версия: '+a.version;
  warnings.hidden=!a.warnings?.length;warningText.textContent=(a.warnings||[]).join('\n');
  note.textContent='Изготвянето на документа използва точно това потвърдено направление. Не извършва нова процедурна квалификация.';
  preview.hidden=true;textarea.hidden=true;textarea.style.display='none';edit.hidden=true;save.hidden=true;cancel.hidden=true;confirm.hidden=true;generate.hidden=false;
 }
 const render=()=>{
  const v=versions.at(-1);if(!v)return;
  preview.textContent=v.text;preview.hidden=false;textarea.hidden=true;textarea.style.display='none';edit.hidden=false;save.hidden=true;cancel.hidden=true;
  confirm.hidden=!!confirmed;confirmedText.textContent=confirmed?'Потвърден текст · версия '+confirmed.version+'. Експертните редакции остават окончателни за документа.':'';
  footer.hidden=!confirmed;word.disabled=true;
 };
 generate.onclick=async()=>{
  sync();if(!source||busy)return;
  if(!window.KT80EGSession?.hasAccess?.()){note.textContent='Първо установете достъп до EG Автора в Етап 4 в същата работна сесия.';return;}
  const p=window.KT80WorkflowState?.subjectConfirmed||{},ev=collectStageEvidence(window);
  const line=source.text.match(/ИЗБРАН\s+ПАНЕЛ\s*:\s*0?\d{1,2}\b[^\n]*/iu)?.[0];
  if(!line){note.textContent='Потвърденото предложение няма еднозначно административно направление. Върнете се в Етап 4 за редакция.';return;}
  const requestId=crypto.randomUUID();const payload={task:'draft_stage5_document',projectOnly:true,expertConfirmed:true,
   caseId:source.caseId,evidenceRevision:source.evidenceRevision,stage4Version:source.version,requestId,
   confirmedStage4Text:source.text,selectedPanelLine:line,subject:clean(p.text),scope:clean(p.scope),
   parcelIds:[...ev.parcelIds],warnings:source.warnings||[]};
  busy=true;generate.disabled=true;note.textContent='EG Авторът изготвя проект на административния текст.';
  try{
   const res=await window.KT80EGSession.request(endpoint,JSON.stringify(payload));
   const data=await res.json().catch(()=>({}));
   if(!live()||live()?.text!==source.text||live()?.version!==source.version){note.textContent='Данните на преписката са променени. Отговорът не е използван.';return;}
   if(!res.ok){note.textContent='Текстът не е получен. Проверете достъпа и услугата (код '+res.status+').';return;}
   if(data.caseId!==source.caseId||data.requestId!==requestId||data.evidenceRevision!==source.evidenceRevision||
     data.stage4Version!==source.version||data.selectedPanelLine!==line||data.projectOnly!==true||
     data.expertReviewRequired!==true||clean(data.draft).length<120){
     note.textContent='Отговорът не съответства на потвърдената преписка.';return;
   }
   versions.push({version:versions.length+1,text:data.draft,kind:'предложение на EG Автора'});
   confirmed=null;render();note.textContent='Проектът е готов за експертна редакция или потвърждение.';
  }catch{note.textContent='Възникна грешка при изготвянето на текста.';}
  finally{busy=false;generate.disabled=false}
 };
 edit.onclick=()=>{
  if(!versions.length)return;textarea.value=versions.at(-1).text;textarea.hidden=false;textarea.style.display='block';preview.hidden=true;
  edit.hidden=true;confirm.hidden=true;save.hidden=false;cancel.hidden=false;confirmed=null;footer.hidden=true;
 };
 save.onclick=()=>{
  if(clean(textarea.value).length<120){note.textContent='Текстът е непълен.';return;}
  versions.push({version:versions.length+1,text:textarea.value,kind:'експертна редакция'});
  confirmed=null;render();note.textContent='Редакцията е запазена. След потвърждение няма да бъде променяна от EG Автора.';
 };
 cancel.onclick=render;
 confirm.onclick=()=>{
  if(!source||!live()||live()?.version!==source.version||!versions.length)return;
  const v=versions.at(-1);
  confirmed=Object.freeze({...v,caseId:source.caseId,stage4Version:source.version,
    expert:source.expert,confirmedAt:new Date().toISOString()});
  render();note.textContent='Текстът е потвърден от експерта. Остава свързването с утвърдената Word бланка.';
 };
 document.addEventListener('kt116:stage4-confirmed',()=>{source=null;sync()});
 document.addEventListener('kt116:stage5-open',()=>sync());
 ['kt80:case-reset','kt80:case-change','kt82:evidence-invalidated'].forEach(x=>document.addEventListener(x,()=>{source=null;sync()}));
 window.KT117Document=Object.freeze({
  snapshot:()=>confirmed&&live()?.version===confirmed.stage4Version?confirmed:null,
  refresh:sync
 });
 sync();
}
setTimeout(initialize,3000);
