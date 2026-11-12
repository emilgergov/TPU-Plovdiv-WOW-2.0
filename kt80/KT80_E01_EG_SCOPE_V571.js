/* КТ53.1 — same editorial workflow for Обхват as the approved Предмет module.
 * Scope only: no silent subject overwrites, no automatic approval.
 */
(function(root){'use strict';
const $=id=>document.getElementById(id);
const ENDPOINT='https://tpu-plovdiv-ai-author-v27.emilgergov.workers.dev/scope-improve';
let pending=null,serial=0;
function say(message){root.KT80AdministrativeNotice?.clearError('scope');const node=$('kt80ScopeProposalStatus');if(node)node.textContent=message}
function clearProposal(){serial++;pending=null;const box=$('kt80EGScopeReview');if(box){box.hidden=true;box.replaceChildren()}}
/* V56.3: emphasize meaningful clauses, not isolated tokens. */
function highlight(node,oldText,newText){
 const original=String(oldText||'').replace(/\s+/gu,' ').trim();
 const revised=String(newText||'').replace(/\s+/gu,' ').trim();
 node.replaceChildren();
 const oldClauses=original.split(/(?<=[.!?;])\s+/u).map(x=>x.trim()).filter(Boolean);
 const clauses=revised.split(/(?<=[.!?;])\s+/u).map(x=>x.trim()).filter(Boolean);
 const norm=t=>t.toLocaleLowerCase('bg').replace(/[.,;:!?„“"()\s]+/gu,' ').trim();
 const oldSet=new Set(oldClauses.map(norm));
 clauses.forEach((clause,i)=>{
  if(i)node.append(document.createTextNode(' '));
  if(oldSet.has(norm(clause)))node.append(document.createTextNode(clause));
  else{const marker=document.createElement('span');marker.className='kt80-v563-clause-change';marker.textContent=clause;node.append(marker)}
 });
}
/* Never assert a novel technical detail from the AI-only rewrite.
 * Current worker receives subject and scope but no original documents.
 * Without evidence, the AI is restricted to language editing. */
function safeScopeProposal(raw,baseline){
 const source=String(baseline||'').trim(),candidate=String(raw||'').trim();
 if(!source)return {text:'',note:'Няма първоначален проект.'};
 const reject=/(околната среда|въздействи|мерки за|процедур|овос|екологичн|компетентен орган|не са предоставени|няма данни|сведения за проверка|необходимостта от)/iu;
 const parts=candidate.split(/\n+|(?<=[.!?])\s+/u).map(x=>x.trim()).filter(Boolean);
 const clean=parts.filter(x=>!reject.test(x));
 const signature=t=>String(t).toLocaleLowerCase('bg').match(/[\p{L}\p{N}]+/gu)||[];
 const baseSet=new Set(signature(source).filter(w=>w.length>3));
 const newTechnical=/(трансформатор|напрежени|мощност|капацитет|киловолт|квт|кв|кабел|съоръжен|подмяна|монтаж|демонтаж|заустване|присъединяване|трасето)/iu;
 const morphology=w=>w.slice(0,Math.min(5,w.length));
 const existingStems=new Set([...baseSet].map(morphology));
 const serviceWords=new Set(['предвиден','предвидено','предвижда','дейност','обектът','обекта','основна','основен','настоящ','проектът','съществуващия','извършва','извършване','осъществява','включва']);
 const allowed=clean.filter(sentence=>{
  const terms=signature(sentence).filter(w=>w.length>4);
  const novel=terms.filter(w=>!baseSet.has(w)&&!existingStems.has(morphology(w))&&!serviceWords.has(w));
  // AI-only edit has no access to the dossier: any new cluster of substantive
  // claims is rejected, not only familiar technical nouns.
  return !novel.some(w=>newTechnical.test(w)) && novel.length<=1;
 });
 const result=allowed.join(' ').replace(/\s+/gu,' ').trim();
 const baseNorm=source.toLocaleLowerCase('bg').replace(/[.,;:!?\s–—-]+/gu,' ').trim();
 const resultNorm=result.toLocaleLowerCase('bg').replace(/[.,;:!?\s–—-]+/gu,' ').trim();
 if(!result||resultNorm===baseNorm){
  return {text:source,note:'Предложение: запазване на доказуемия проект. Новите технически твърдения и оценките за въздействие не са включени, тъй като не са подкрепени с първични документи.'};
 }
 return {text:result,note:allowed.length!==parts.length?'Редакцията е ограничена до фактическия обхват; непотвърдени нови твърдения са изключени.':'Езикова редакция на наличния проект, без автоматично потвърждение на нови факти.'};
}
function applyDraft(text,old,subjectBaseline){
 if(!$('kt80SubjectConfirmation')?.checked||($('kt80SubjectText')?.value||'').trim()!==subjectBaseline){say('Предметът не е фиксиран или е променен. Предложението не може да се приложи.');clearProposal();return}
 const scope=$('kt80ScopeText');
 if(!scope||scope.value!==old){say('Обхватът е променен. Предложението не е приложено.');clearProposal();return}
 scope.value=text;scope.dispatchEvent(new Event('input',{bubbles:true}));document.dispatchEvent(new CustomEvent('kt80:editorial-accepted',{detail:{kind:'scope',text,source:'EG автор'}}));
 const check=$('kt80ScopeConfirmation');if(check)check.checked=false;
 clearProposal();say('Редакцията е приложена. За продължаване потвърдете обхвата.');
}
function render(proposal,baseline,subjectBaseline,note){
 const host=$('kt80EGScopeReview');if(!host)return;host.replaceChildren();host.hidden=false;
 const title=document.createElement('strong');title.textContent='EG автор · Предложена редакция на обхвата';
 const text=document.createElement('p');highlight(text,baseline,proposal);
 const caution=document.createElement('p');caution.className='kt80-v563-editor-note';caution.textContent=note||'Предложението подлежи на проверка в оригиналните документи.';
 const accept=document.createElement('button');accept.type='button';accept.textContent='Приеми предложението';
 const reject=document.createElement('button');reject.type='button';reject.textContent='Отхвърли предложението';
 accept.addEventListener('click',()=>{if(!pending||pending.proposal!==proposal){clearProposal();return}applyDraft(proposal,baseline,subjectBaseline)});
 reject.addEventListener('click',()=>{clearProposal();say('Предложението е отхвърлено. Обхватът е запазен.')});
 host.append(title,text,caution,accept,reject);
}
function init(){
 const improve=$('kt80ImproveScope'),edit=$('kt80EditScope'),rebuild=$('kt80ReconstructScope'),field=$('kt80ScopeText'),status=$('kt80ScopeProposalStatus');
 if(!improve||!edit||!rebuild||!field||!status)return;
 const review=document.createElement('div');review.id='kt80EGScopeReview';review.className='kt80-ai-subject-review';review.hidden=true;status.insertAdjacentElement('afterend',review);
 const dialog=document.createElement('dialog');dialog.id='kt80EGScopeDialog';
 const form=document.createElement('form');form.method='dialog';
 const label=document.createElement('label');label.textContent='Парола за EG автора';
 const password=document.createElement('input');password.type='password';password.autocomplete='off';password.required=true;password.placeholder='Временен защитен достъп';label.append(password);
 const note=document.createElement('p');note.textContent='Изпращат се единствено проектът на обхват и текущият предмет. Пълната преписка и доказателствата остават в модула. Паролата се пази само в оперативната памет за текущата преписка и се изчиства при приключване или смяна на преписката.';
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Отказ';
 const send=document.createElement('button');send.type='submit';send.textContent='Предложи подобрение';
 cancel.addEventListener('click',()=>{password.value='';dialog.close()});
 form.append(label,note,cancel,send);dialog.append(form);document.body.append(dialog);
 // Administrative reconstruction approval: never use native browser confirm().
 const reconDialog=document.createElement('dialog');reconDialog.id='kt80ScopeReconstructDialog';reconDialog.className='kt80-reconstruction-dialog';
 const reconTitle=document.createElement('h2');reconTitle.id='kt80ScopeReconstructTitle';reconTitle.textContent='Реконструкция на обхвата';
 const reconInfo=document.createElement('p');reconInfo.textContent='Предлага се нов проект на обхвата въз основа на прочетената преписка. Предметът остава непроменен.';
 const reconBefore=document.createElement('div');reconBefore.className='kt80-recon-comparison';
 const reconOld=document.createElement('section'),reconNew=document.createElement('section');
 const headingOld=document.createElement('strong');headingOld.textContent='Текущ обхват';
 const headingNew=document.createElement('strong');headingNew.textContent='Предложен обхват';
 const currentPreview=document.createElement('p'),proposedPreview=document.createElement('p');
 reconOld.append(headingOld,currentPreview);reconNew.append(headingNew,proposedPreview);reconBefore.append(reconOld,reconNew);
 const reconNotice=document.createElement('p');reconNotice.className='kt80-recon-note';
 reconNotice.textContent='При приемане се заменя само обхватът и се отменя неговото потвърждение. Мотивите остават достъпни за проверка.';
 const reconActions=document.createElement('div');reconActions.className='kt80-recon-actions';
 const reconCancel=document.createElement('button');reconCancel.type='button';reconCancel.textContent='Запази текущия обхват';
 const reconAccept=document.createElement('button');reconAccept.type='button';reconAccept.textContent='Приеми новия обхват';
 reconActions.append(reconCancel,reconAccept);
 reconDialog.setAttribute('aria-labelledby','kt80ScopeReconstructTitle');
 reconDialog.append(reconTitle,reconInfo,reconBefore,reconNotice,reconActions);document.body.append(reconDialog);
 let reconPending=null;
 function clearRecon(){reconPending=null;if(reconDialog.open)reconDialog.close()}
 function applyReconstruction(candidate,base,subjectBase){
  if(field.value!==base||$('kt80SubjectText')?.value.trim()!==subjectBase||!$('kt80SubjectConfirmation')?.checked){
   say('Текстът е променен. Реконструкцията не е приложена.');clearRecon();return;
  }
  clearProposal();field.value=candidate;field.dispatchEvent(new Event('input',{bubbles:true}));document.dispatchEvent(new CustomEvent('kt80:editorial-accepted',{detail:{kind:'scope',text:candidate,source:'Реконструкция от преписката'}}));
  const check=$('kt80ScopeConfirmation');if(check?.checked){check.checked=false;check.dispatchEvent(new Event('change',{bubbles:true}))}
  say('Новият обхват е приложен. Прегледайте текста и го потвърдете след проверка.');
  clearRecon();
 }
 reconCancel.addEventListener('click',()=>{clearRecon();say('Текущият обхват е запазен без промени.')});
 reconDialog.addEventListener('close',()=>{reconPending=null});
 reconAccept.addEventListener('click',()=>{if(!reconPending)return;const p=reconPending;applyReconstruction(p.revised,p.current,p.subject)});
 document.addEventListener('kt80:case-reset',clearRecon);
 document.addEventListener('kt80:case-change',clearRecon);
 edit.addEventListener('click',()=>{if(!$('kt80SubjectConfirmation')?.checked){say('Първо потвърдете предмета, за да отключите обхвата.');return}field.readOnly=false;field.focus();say('Ръчна редакция на обхвата — проверете източниците и потвърдете текста.')});
 rebuild.addEventListener('click',()=>{
  if(!$('kt80SubjectConfirmation')?.checked){say('Първо потвърдете предмета, за да реконструирате обхвата.');return}
  const draft=root.KT80KT52Draft;
  if(!draft){say('Няма прочетена преписка за реконструкция на обхвата.');return}
  const currentSubject=$('kt80SubjectText')?.value.trim()||draft.subjectCandidate||'';
  const revised=root.KT80KT53?.proposition?.({...draft,subjectCandidate:currentSubject})?.scope||'';
  if(!revised){say('Няма достатъчно надежден кандидат за обхват.');return}
  const current=field.value,subjectBase=$('kt80SubjectText')?.value.trim()||'';
  if(current===revised){say('Реконструкцията не откри промяна. Запазваме текущия обхват.');return}
  reconPending={current,revised,subject:subjectBase};
  currentPreview.textContent=current||'Няма текущ проект на обхвата.';
  proposedPreview.textContent=revised;
  reconDialog.showModal();
 });
 improve.addEventListener('click',()=>{
  if(!$('kt80SubjectConfirmation')?.checked){say('Първо потвърдете предмета, за да използвате EG автора за обхвата.');return}
  if(!field.value.trim()){say('Първо конструирайте или въведете обхват.');return}
  if($('kt80ScopeConfirmation')?.checked||root.KT80WorkflowState?.scopeConfirmed){say('Обхватът вече е потвърден. За нова редакция първо отменете потвърждението.');return}
  if(root.KT80WorkflowState?.routeConfirmed){say('Процедурата е потвърдена. Достъпът до EG автора за тази преписка е приключен.');return}
  if(root.KT80EGSession?.hasAccess()){runImprovement(null);return}
  dialog.showModal();
 });
 async function runImprovement(token){
  if(!$('kt80SubjectConfirmation')?.checked){say('Първо потвърдете предмета.');return}
  const scope=field.value.trim(),subject=$('kt80SubjectText')?.value.trim()||'';
  if(!scope||scope.length>2400){say('Обхватът липсва или надвишава допустимата дължина за редакция.');return}
  if(!subject){say('Необходим е предмет, за да се провери съответствието на обхвата.');return}
  if(!token&&!root.KT80EGSession?.hasAccess()){say('Липсва парола за EG автора.');return}
  const payload=JSON.stringify({scope,subject:subject.slice(0,450)});
  if(new TextEncoder().encode(payload).length>6500){say('Заявката е твърде голяма. Обхватът е запазен.');return}
  clearProposal();const requestId=++serial;improve.disabled=true;say('EG автор · Изготвяне на редакция на обхвата…');
  try{
   const response=await root.KT80EGSession.request(ENDPOINT,payload,token);
   const data=await response.json();if(requestId!==serial)return;
   if(!response.ok){if(response.status===401||response.status===403){root.KT80AdministrativeNotice?.showError('scope','EG авторът отказа достъп (код '+response.status+'). Въведете отново правилната парола чрез „Интелигентно подобряване“. Обхватът е запазен.');return;}throw Error('EG услугата върна код '+response.status);}
   if(data.reviewRequired!==true||data.expertAcceptanceRequired!==true||typeof data.proposal!=='string'||!data.proposal.trim())throw Error('Невалидно предложение от EG автора.');
   if(!$('kt80SubjectConfirmation')?.checked||field.value.trim()!==scope||($('kt80SubjectText')?.value||'').trim()!==subject){
    say('Данните са променени по време на заявката. Предложението не се прилага.');return;
   }
   const filtered=safeScopeProposal(data.proposal,scope);
   const normalize=t=>String(t||'').toLocaleLowerCase('bg').replace(/\s+/gu,' ').replace(/[.,;:!?–—-]+/gu,' ').trim();
   if(!filtered.text||normalize(filtered.text)===normalize(scope)){
     clearProposal();
     say('EG авторът извърши проверката, но не установи обоснована промяна. Текущият обхват се запазва. Можете да редактирате ръчно или да реконструирате от преписката.');
     return;
   }
   pending={proposal:filtered.text};
   render(pending.proposal,field.value,subject,filtered.note);
   say('Изготвено е ново предложение за експертна преценка. Непотвърдени технически твърдения не се добавят.');
  }catch(e){if(requestId===serial){const m='Интелигентното подобряване не успя: '+String(e.message||e)+'. Обхватът е запазен.';root.KT80AdministrativeNotice?.showError('scope',m);if(!root.KT80AdministrativeNotice)say(m)}}
  finally{improve.disabled=false}
}
 form.addEventListener('submit',event=>{event.preventDefault();const token=password.value;password.value='';dialog.close();runImprovement(token);});
 field.addEventListener('input',()=>{if(pending)clearProposal()});
 $('kt80SubjectText')?.addEventListener('input',clearProposal);
 $('kt80SubjectConfirmation')?.addEventListener('change',()=>{if(!$('kt80SubjectConfirmation')?.checked)clearProposal()});
 document.addEventListener('kt80:case-change',clearProposal);
 document.addEventListener('kt80:case-reset',()=>{clearProposal();say('Проектът на обхват подлежи на експертна проверка.')});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
