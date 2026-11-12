/* КТ53.1 — same editorial workflow for Обхват as the approved Предмет module.
 * Scope only: no silent subject overwrites, no automatic approval.
 */
(function(root){'use strict';
const $=id=>document.getElementById(id);
const ENDPOINT='https://tpu-plovdiv-ai-author-v27.emilgergov.workers.dev/scope-improve';
let pending=null,serial=0;
function say(message){const node=$('kt80ScopeProposalStatus');if(node)node.textContent=message}
function clearProposal(){serial++;pending=null;const box=$('kt80EGScopeReview');if(box){box.hidden=true;box.replaceChildren()}}
function highlight(node,oldText,newText){
 const a=String(oldText).trim().split(/\s+/u),b=String(newText).trim().split(/\s+/u),n=a.length,m=b.length;
 if(n*m>25000){node.textContent=newText;return}
 const norm=t=>t.toLocaleLowerCase('bg').replace(/[.,;:!?„“"()]/gu,'');
 const dp=Array.from({length:n+1},()=>new Uint16Array(m+1));
 for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)dp[i][j]=norm(a[i])===norm(b[j])?1+dp[i+1][j+1]:Math.max(dp[i+1][j],dp[i][j+1]);
 const kept=new Set();let i=0,j=0;
 while(i<n&&j<m){if(norm(a[i])===norm(b[j])){kept.add(j);i++;j++}else if(dp[i+1][j]>=dp[i][j+1])i++;else j++}
 node.replaceChildren();
 let index=0;for(const part of String(newText).match(/\s+|\S+/gu)||[]){if(/^\s+$/u.test(part)){node.append(document.createTextNode(part));continue}if(kept.has(index))node.append(document.createTextNode(part));else{const strong=document.createElement('strong');strong.className='kt80-eg-changed';strong.textContent=part;node.append(strong)}index++}
}
function applyDraft(text,old,subjectBaseline){
 if(!$('kt80SubjectConfirmation')?.checked||($('kt80SubjectText')?.value||'').trim()!==subjectBaseline){say('Предметът не е фиксиран или е променен. Предложението не може да се приложи.');clearProposal();return}
 const scope=$('kt80ScopeText');
 if(!scope||scope.value!==old){say('Обхватът е променен. Предложението не е приложено.');clearProposal();return}
 scope.value=text;scope.dispatchEvent(new Event('input',{bubbles:true}));
 const check=$('kt80ScopeConfirmation');if(check)check.checked=false;
 clearProposal();say('Редакцията е приложена. За продължаване потвърдете обхвата.');
}
function render(proposal,baseline,subjectBaseline){
 const host=$('kt80EGScopeReview');if(!host)return;host.replaceChildren();host.hidden=false;
 const title=document.createElement('strong');title.textContent='EG автор · Предложена редакция на обхвата';
 const text=document.createElement('p');highlight(text,baseline,proposal);
 const accept=document.createElement('button');accept.type='button';accept.textContent='Приеми предложението';
 const reject=document.createElement('button');reject.type='button';reject.textContent='Отхвърли предложението';
 accept.addEventListener('click',()=>{if(!pending||pending.proposal!==proposal){clearProposal();return}applyDraft(proposal,baseline,subjectBaseline)});
 reject.addEventListener('click',()=>{clearProposal();say('Предложението е отхвърлено. Обхватът е запазен.')});
 host.append(title,text,accept,reject);
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
 edit.addEventListener('click',()=>{if(!$('kt80SubjectConfirmation')?.checked){say('Първо потвърдете предмета, за да отключите обхвата.');return}field.readOnly=false;field.focus();say('Ръчна редакция на обхвата — проверете източниците и потвърдете текста.')});
 rebuild.addEventListener('click',()=>{
  if(!$('kt80SubjectConfirmation')?.checked){say('Първо потвърдете предмета, за да реконструирате обхвата.');return}
  const draft=root.KT80KT52Draft;
  if(!draft){say('Няма прочетена преписка за реконструкция на обхвата.');return}
  const currentSubject=$('kt80SubjectText')?.value.trim()||draft.subjectCandidate||'';
  const revised=root.KT80KT53?.proposition?.({...draft,subjectCandidate:currentSubject})?.scope||'';
  if(!revised){say('Няма достатъчно надежден кандидат за обхват.');return}
  if(field.value||$('kt80ScopeConfirmation')?.checked){
   if(!root.confirm('Реконструкцията ще замени само обхвата и неговото потвърждение. Предметът остава непроменен. Продължавате ли?'))return;
  }
  clearProposal();field.value=revised;field.dispatchEvent(new Event('input',{bubbles:true}));
  const check=$('kt80ScopeConfirmation');if(check)check.checked=false;
  say('Обхватът е реконструиран от преписката. Необходима е експертна проверка и потвърждение.');
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
   if(!response.ok)throw Error('EG услугата върна код '+response.status);
   if(data.reviewRequired!==true||data.expertAcceptanceRequired!==true||typeof data.proposal!=='string'||!data.proposal.trim())throw Error('Невалидно предложение от EG автора.');
   if(!$('kt80SubjectConfirmation')?.checked||field.value.trim()!==scope||($('kt80SubjectText')?.value||'').trim()!==subject){
    say('Данните са променени по време на заявката. Предложението не се прилага.');return;
   }
   const normalized=t=>t.toLocaleLowerCase('bg').replace(/[.,;:!?\s–—-]+/gu,' ').trim();
   if(normalized(data.proposal)===normalized(scope)){say('Обхватът не се нуждае от редакция.');return}
   pending={proposal:data.proposal.trim()};
   render(pending.proposal,field.value,subject);
   say('Изготвена е редакция на обхвата. Прегледайте предложението.');
  }catch(e){if(requestId===serial)say('Интелигентното подобряване не успя: '+String(e.message||e)+'. Обхватът е запазен.')}
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
