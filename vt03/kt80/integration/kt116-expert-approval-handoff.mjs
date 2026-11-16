import {collectStageEvidence} from './kt95-stage-evidence-handoff.mjs';
const mk=(tag,value)=>{const e=document.createElement(tag);if(value!==undefined)e.textContent=value;return e};
const val=v=>String(v??'').trim();
function installKT116(){
const host=document.getElementById('kt96EGAuthor'),five=document.querySelector('.kt80-stage-panel[data-panel="5"]');
if(host&&five){
 let proposal=null,history=[],approved=null;
 const style=mk('style');
 style.textContent='#kt116Editor{font:14px/1.55 Verdana,Arial;color:#f9f3e1;margin:16px 0}#kt116Editor h3{font:bold 19px Verdana;color:#efd18f}#kt116Editor h4{font:bold 15px Verdana;color:#f3d08c;margin:22px 0 8px;border-bottom:1px solid #739078;padding:0 0 8px}#kt116Editor p{white-space:pre-wrap;margin:8px 0 15px}#kt116Editor .paper{background:#244a38;padding:17px;border-radius:7px}#kt116Editor .actions{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0}#kt116Editor button,#kt116Stage5 button{background:#d9b874;color:#143b29;border:0;border-radius:7px;padding:11px 15px;font:bold 13px Verdana;cursor:pointer}#kt116Editor button[hidden],#kt116Editor [hidden]{display:none!important}#kt116Editor textarea{width:100%;box-sizing:border-box;min-height:350px;font:13px/1.6 Verdana;padding:12px;color:#132e24;background:#fffdf6}#kt116Editor input{padding:10px;color:#173929;background:#fffdf8}#kt116Editor .note{color:#f0d296;font-size:12px}#kt116Stage5{padding:16px;color:#f7f0dc;background:#193a2b;font:14px/1.6 Verdana}#kt116Stage5 h3,#kt116Stage5 h4{color:#f3ce82}#kt116Stage5 pre{white-space:pre-wrap;font:13px/1.6 Verdana;background:#284938;padding:14px;max-height:550px;overflow:auto}.kt80-stage-panel[data-panel="5"]>:not(#kt116Stage5){display:none!important}';
 document.head.append(style);
 const ui=mk('section');ui.id='kt116Editor';ui.hidden=true;
 const header=mk('h3','Предложение за експертен преглед'),alerts=mk('details'),alertContent=mk('div');
 alerts.append(mk('summary','Бележки от нормативната проверка'),alertContent);
 const paper=mk('div');paper.className='paper';
 const textarea=mk('textarea');textarea.hidden=true;textarea.setAttribute('aria-label','Редактиране на предложението');
 const actorLabel=mk('label','Експерт — име или служебен идентификатор');const actor=mk('input');actor.maxLength=120;actorLabel.append(actor);
 const actions=mk('div');actions.className='actions';
 const change=mk('button','Редактирай'),confirm=mk('button','Потвърди без промяна'),storeEdit=mk('button','Запази редакцията'),cancel=mk('button','Откажи редакцията');
 storeEdit.hidden=true;cancel.hidden=true;actions.append(change,confirm,storeEdit,cancel);
 const note=mk('p');note.className='note';
 const next=mk('button','Продължи към Етап 5');next.hidden=true;
 const save=mk('button','Запази защитено копие');save.hidden=true;
 const password=mk('input');password.type='password';password.placeholder='Парола за копието (12+ знака)';password.autocomplete='new-password';password.hidden=true;
 const archiveMenu=mk('details');archiveMenu.style.cssText='margin:14px 0;border:1px solid #749170;border-radius:7px;padding:10px';
 archiveMenu.append(mk('summary','Запазване на защитено копие'),password,save);
 ui.append(header,alerts,paper,textarea,actorLabel,actions,note,next,archiveMenu);
 archiveMenu.hidden=true;
 host.append(ui);
 const restoreBar=mk('details');restoreBar.id='kt116Restore';restoreBar.style.cssText='padding:12px;margin:8px 0;color:#efd4a0;font:13px Verdana;background:#173b2b;border:1px solid #7b8e6f;border-radius:7px';
 const restoreLabel=mk('label','Повторно отваряне на защитено копие');
 const restoreFile=mk('input');restoreFile.type='file';restoreFile.accept='.json,application/json';
 const restoreKey=mk('input');restoreKey.type='password';restoreKey.placeholder='Парола за копието';restoreKey.autocomplete='off';
 const restoreBtn=mk('button','Отвори копието');restoreBtn.type='button';restoreBtn.style.cssText='background:#d9b874;color:#153a27;padding:9px 13px;border:0;border-radius:6px;font-weight:bold';
 const restoreStatus=mk('p','Копието се зарежда само след проверка на предмета, обхвата и имотите; след възстановяване е необходимо ново потвърждение.');
 restoreBar.append(mk('summary','Отвори запазено предложение'),restoreLabel,restoreFile,restoreKey,restoreBtn,restoreStatus);host.append(restoreBar);
 const stage5=mk('section');stage5.id='kt116Stage5';five.prepend(stage5);
 const confirmDialog=mk('dialog');confirmDialog.id='kt117ConfirmDialog';
 confirmDialog.style.cssText='background:#153b2d;color:#f4e9ce;border:2px solid #d0b06c;border-radius:10px;padding:20px;max-width:420px;font:14px/1.6 Verdana';
 const dlgMessage=mk('p'),dlgActions=mk('div');dlgActions.style.cssText='display:flex;gap:12px;justify-content:flex-end;margin-top:18px';
 const dlgYes=mk('button','Потвърди'),dlgNo=mk('button','Отказ');
 [dlgYes,dlgNo].forEach(b=>{b.style.cssText='border:0;border-radius:6px;background:#d7b673;color:#153a29;font:bold 13px Verdana;padding:10px 15px;cursor:pointer'});
 dlgActions.append(dlgNo,dlgYes);confirmDialog.append(dlgMessage,dlgActions);document.body.append(confirmDialog);
 function confirmStyled(message){
  dlgMessage.textContent=message;
  return new Promise(resolve=>{
   let finished=false;
   const close=ok=>{if(finished)return;finished=true;confirmDialog.close();resolve(ok)};
   dlgYes.onclick=()=>close(true);dlgNo.onclick=()=>close(false);
   confirmDialog.oncancel=e=>{e.preventDefault();close(false)};
   confirmDialog.showModal();
  });
 }

 const evidence=()=>collectStageEvidence(window);
 const current=()=>proposal&&proposal.localId===evidence().caseId&&proposal.revision===evidence().evidenceRevision&&proposal.generation===evidence().generation&&proposal.key===evidence().key;
 const titlePattern=/^(ПРИЛОЖЕНИЕ № [12] КЪМ ЗООС|ЧЛ\. 2, АЛ\. [12] НАРЕДБА ЗА ОС|ВОДЕЩО ПРЕДЛОЖЕНИЕ|ИЗБРАН ПАНЕЛ|ЗАЩО ТОЗИ ПАНЕЛ|ЗАЩО НЕ АЛТЕРНАТИВИТЕ|Фактическа основа|Нормативни предпоставки и граници на проверката|Мотивирано предложение|Данни за експертна проверка)\s*[:：]/iu;
 function render(container,content){
  container.replaceChildren();
  const normalized=content.replace(/\n(?=(?:ПРИЛОЖЕНИЕ № [12]|ЧЛ\. 2, АЛ\. [12]|ВОДЕЩО ПРЕДЛОЖЕНИЕ|ИЗБРАН ПАНЕЛ|ЗАЩО ТОЗИ ПАНЕЛ|ЗАЩО НЕ АЛТЕРНАТИВИТЕ|Фактическа основа|Нормативни предпоставки и граници|Мотивирано предложение|Данни за експертна проверка))/giu,'\n\n');
  for(const chunk of normalized.split(/\n\s*\n/)){
   const t=val(chunk);if(!t)continue;const m=t.match(titlePattern);
   if(m){container.append(mk('h4',m[1]));const rest=val(t.slice(m[0].length));if(rest)container.append(mk('p',rest));}
   else container.append(mk('p',t));
  }
 }
 function display(){
  if(!current())return;
  ui.hidden=false;paper.hidden=false;textarea.hidden=true;change.hidden=false;confirm.hidden=false;storeEdit.hidden=true;cancel.hidden=true;
  render(paper,history.at(-1).text);alertContent.replaceChildren();
  proposal.warnings.forEach(w=>alertContent.append(mk('p',w)));alerts.hidden=!proposal.warnings.length;
  next.hidden=!approved;archiveMenu.hidden=!approved;save.hidden=!approved;password.hidden=!approved;
 }
 function render5(){
  if(window.KT117Document)return;
  stage5.replaceChildren(mk('h3','5. Определяне на процедурата по ИП'));
  if(!approved||!current()){stage5.append(mk('p','Няма потвърдено предложение за текущата преписка.'));return;}
  stage5.append(mk('h4','Потвърдена версия '+approved.version));
  stage5.append(mk('p','Преписка: '+approved.caseId+' · Експерт: '+approved.expert+' · Потвърдено на: '+approved.approvedAt));
  const selected=approved.text.match(/ИЗБРАН\s+ПАНЕЛ\s*:\s*0?\d{1,2}\b[^\n]*/iu);
  stage5.append(mk('p',selected?'Предложено направление: '+selected[0]:'Предложеното направление се определя от експерта.'));
  if(approved.warnings.length)stage5.append(mk('p','Бележки за експертна проверка: '+approved.warnings.join('; ')));
  stage5.append(mk('h4','Потвърдено предложение'));stage5.append(mk('pre',approved.text));
  stage5.append(mk('p','Това е тест на предаването към Етап 5. Изготвянето на Word документ по утвърдената бланка все още не е активно.'));
 }
 document.addEventListener('kt115:stage4-draft',e=>{
  const d=e.detail||{},h=evidence();if(!d.sourceDraft||d.evidenceRevision!==h.evidenceRevision||d.caseId!==h.caseId&&d.caseIdType!=='shared-verified')return;
  proposal={caseId:d.caseId,localId:h.caseId,revision:h.evidenceRevision,generation:h.generation,key:h.key,requestId:d.requestId,original:d.sourceDraft,warnings:d.warnings||[]};
  history=[{version:1,text:d.sourceDraft,kind:'автор',createdAt:new Date().toISOString()}];approved=null;
  document.getElementById('kt104EGLead').style.display='none';document.getElementById('kt104EGDetails').style.display='none';
  note.textContent='Работен проект. Експертът може да го редактира или потвърди.';display();render5();
 });
 change.onclick=()=>{
  if(!current())return;textarea.value=history.at(-1).text;textarea.hidden=false;paper.hidden=true;
  change.hidden=true;confirm.hidden=true;storeEdit.hidden=false;cancel.hidden=false;
 };
 storeEdit.onclick=()=>{
  if(!current()||val(textarea.value).length<120){note.textContent='Проверете съдържанието и данните на преписката.';return;}
  history.push({version:history.length+1,text:val(textarea.value),kind:'експертна редакция',createdAt:new Date().toISOString()});
  approved=null;note.textContent='Редакцията е запазена за тази работна сесия.';display();render5();
 };
 cancel.onclick=display;
 confirm.onclick=async()=>{
  if(!current()){note.textContent='Данните по преписката са променени.';return;}
  const expert=val(actor.value);if(expert.length<2){note.textContent='Посочете експерта.';actor.focus();return;}
  const v=history.at(-1);
  if(!await confirmStyled('Потвърждавате версия '+v.version+' за предаване към Етап 5?'))return;
  approved=Object.freeze({caseId:proposal.caseId,requestId:proposal.requestId,evidenceRevision:proposal.revision,
   version:v.version,text:v.text,original:proposal.original,warnings:[...proposal.warnings],
   expert,approvedAt:new Date().toLocaleString('bg-BG'),expertApproved:true});
  note.textContent='Потвърдено. Предложението е готово за Етап 5.';display();render5();
  document.dispatchEvent(new CustomEvent('kt116:stage4-confirmed',{detail:{
   caseId:approved.caseId,evidenceRevision:approved.evidenceRevision,version:approved.version
  }}));
 };
 // KT116-R2: the legacy stage navigation opens a read-only gate dialog.
 // This case-bound confirmation instead opens ONLY the new Stage 5 preview.
 // No procedure activation, external document, or normative approval occurs.
 next.onclick=()=>{
  if(!approved||!current())return;
  render5();
  // Refresh the Stage 5 case-bound input before switching the visible stage.
  window.KT117Document?.refresh?.();
  document.dispatchEvent(new CustomEvent('kt116:stage5-open',{detail:{
   caseId:approved.caseId,evidenceRevision:approved.evidenceRevision,version:approved.version
  }}));
  document.querySelectorAll('.kt80-stage-panel').forEach(panel=>{
   panel.hidden=panel!==five;
  });
  document.querySelectorAll('.kt80-step').forEach(nav=>{
   if(nav.dataset.step==='5')nav.setAttribute('aria-current','step');
   else nav.removeAttribute('aria-current');
  });
  five.hidden=false;
  five.scrollIntoView({behavior:'smooth',block:'start'});
 };
 save.onclick=async()=>{
  if(!approved||!current())return;
  if(password.value.length<12){note.textContent='Въведете парола от поне 12 знака.';return;}
  try{
   const enc=new TextEncoder(),salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
   const key0=await crypto.subtle.importKey('raw',enc.encode(password.value),'PBKDF2',false,['deriveKey']);
   const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:210000,hash:'SHA-256'},key0,{name:'AES-GCM',length:256},false,['encrypt']);
   const w=window.KT80WorkflowState||{},h=evidence();
   const payload={approved,history,caseBinding:{caseId:proposal.caseId,evidenceRevision:proposal.revision,
    subject:val(w.subjectConfirmed?.text),scope:val(w.subjectConfirmed?.scope),parcelIds:[...h.parcelIds]}};
   const bytes=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(JSON.stringify(payload))));
   const b64=a=>btoa(Array.from(a,x=>String.fromCharCode(x)).join(''));
   const obj={format:'WOW-KT116-ENCRYPTED-V1',salt:b64(salt),iv:b64(iv),ciphertext:b64(bytes)};
   const url=URL.createObjectURL(new Blob([JSON.stringify(obj)],{type:'application/json'}));const link=mk('a');link.href=url;
   link.download='WOW_Е4_защитено_копие.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   password.value='';note.textContent='Шифрованото копие е изтеглено. Няма централен архив; пазете файла и паролата отделно.';
  }catch{note.textContent='Неуспешен защитен запис.';}
 };
 async function decrypt(data,secret){
  if(data?.format!=='WOW-KT116-ENCRYPTED-V1')throw Error('Неподдържан формат');
  const bytes=x=>Uint8Array.from(atob(x),v=>v.charCodeAt(0));
  const enc=new TextEncoder(),raw=await crypto.subtle.importKey('raw',enc.encode(secret),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:bytes(data.salt),iterations:210000,hash:'SHA-256'},raw,{name:'AES-GCM',length:256},false,['decrypt']);
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(data.iv)},key,bytes(data.ciphertext));
  return JSON.parse(new TextDecoder().decode(plain));
 }
 restoreBtn.onclick=async()=>{
  const file=restoreFile.files?.[0],h=evidence(),w=window.KT80WorkflowState||{};
  if(!file||!restoreKey.value){restoreStatus.textContent='Изберете защитения файл и въведете паролата.';return;}
  if(!w.subjectConfirmed?.expertConfirmed||!w.subjectConfirmed?.scopeConfirmed){restoreStatus.textContent='Първо потвърдете предмета и обхвата в Етап 2.';return;}
  try{
   const data=await decrypt(JSON.parse(await file.text()),restoreKey.value);
   const binding=data?.caseBinding||{},sameSubject=val(binding.subject)===val(w.subjectConfirmed.text),
    sameScope=val(binding.scope)===val(w.subjectConfirmed.scope),
    sameParcels=JSON.stringify(binding.parcelIds||[])===JSON.stringify([...h.parcelIds]);
   if(!sameSubject||!sameScope||!sameParcels||!Array.isArray(data.history)||!data.history.length||
      !val(data.approved?.original)||!val(data.approved?.text)){
    restoreStatus.textContent='Копието не съответства на потвърдените предмет, обхват и имоти. Няма възстановени данни.';return;
   }
   proposal={caseId:h.caseId,localId:h.caseId,revision:h.evidenceRevision,generation:h.generation,
    key:h.key,requestId:'restored-expert-copy',original:data.approved.original,
    warnings:Array.isArray(data.approved.warnings)?data.approved.warnings:[]};
   history=data.history.filter(x=>x&&typeof x.text==='string').map((x,i)=>({version:i+1,text:x.text,
    kind:x.kind,createdAt:x.createdAt})).slice(0,30);
   if(!history.length)throw Error('Няма съдържание');
   approved=null;restoreKey.value='';restoreFile.value='';
   ui.hidden=false;document.getElementById('kt104EGLead').style.display='none';
   document.getElementById('kt104EGDetails').style.display='none';
   note.textContent='Възстановен работен текст. Изисква се ново експертно потвърждение за текущата преписка.';
   restoreStatus.textContent='Копието е отворено за редакция и ново потвърждение.';
   display();render5();
  }catch{restoreStatus.textContent='Неуспешно отваряне. Проверете паролата и файла.';}
 };

 function clear(){proposal=null;history=[];approved=null;ui.hidden=true;render5();}
 ['kt80:case-reset','kt80:case-change','kt82:evidence-invalidated'].forEach(n=>document.addEventListener(n,clear));
 window.KT116ExpertHandoff=Object.freeze({snapshot:()=>approved&&current()?approved:null,history:()=>current()?history.map(x=>({version:x.version,kind:x.kind,createdAt:x.createdAt})):[]});
 render5();
}
}
setTimeout(installKT116,2400);
