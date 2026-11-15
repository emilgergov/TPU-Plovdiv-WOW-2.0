/* KT80 V57 — opt-in AI proposal only, no automatic changes to expert-confirmed subject.
 * Token remains solely in the password input for this request and is cleared immediately.
 */
(function(root){'use strict';
const $=id=>document.getElementById(id);
const ENDPOINT='https://tpu-plovdiv-ai-author-v27.emilgergov.workers.dev/subject-improve';
let pending=null,serial=0;
function conciseVerifiedFacts(){
 const approved=root.KT80ParameterQA?.allowed?.()||[];
 return approved.filter(x=>x.role!=='ambiguous'&&!x.compoundDesignation&&x.original&&x.type)
   .slice(0,3).map(x=>(String(x.type)+' — '+String(x.original)+' ('+(x.role==='existing'?'съществуващо':x.role==='project'?'предвидено':'ремонт/подмяна')+')').slice(0,140));
}
function status(s){const node=$('kt80SubjectProposalStatus');if(node)node.textContent=s}
function reset(){serial++;pending=null;const box=$('kt80AISubjectReview');if(box){box.hidden=true;box.replaceChildren()}}
function highlightEdits(node,before,after){
 const split=t=>String(t).trim().split(/\s+/u);
 const oldWords=split(before),newWords=split(after);
 const n=oldWords.length,m=newWords.length;
 if(n*m>20000){node.textContent=after;return}
 const normalize=t=>t.toLocaleLowerCase('bg').replace(/[.,;:!?„“"()]/gu,'');
 const d=Array.from({length:n+1},()=>new Uint16Array(m+1));
 for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)
  d[i][j]=normalize(oldWords[i])===normalize(newWords[j])?1+d[i+1][j+1]:Math.max(d[i+1][j],d[i][j+1]);
 const equal=new Set();let i=0,j=0;
 while(i<n&&j<m){if(normalize(oldWords[i])===normalize(newWords[j])){equal.add(j);i++;j++}else if(d[i+1][j]>=d[i][j+1])i++;else j++}
 node.replaceChildren();
 newWords.forEach((w,k)=>{if(k)node.append(document.createTextNode(' '));if(equal.has(k))node.append(document.createTextNode(w));else{const mark=document.createElement('strong');mark.className='kt80-eg-changed';mark.textContent=w;node.append(mark)}});
}
function render(proposal,baseline){
 const box=$('kt80AISubjectReview');if(!box)return;
 box.replaceChildren();box.hidden=false;
 const heading=document.createElement('strong');heading.textContent='EG автор · Предложена редакция';
 const preview=document.createElement('p');highlightEdits(preview,baseline,proposal);
 const accept=document.createElement('button');accept.type='button';accept.textContent='Приеми предложението';
 const dismiss=document.createElement('button');dismiss.type='button';dismiss.textContent='Отхвърли предложението';
 accept.addEventListener('click',()=>{
  const subject=$('kt80SubjectText');
  if($('kt80SubjectConfirmation')?.checked){status('Предметът е фиксиран. Отменете потвърждението преди редакция.');return}
  if(!pending||pending.proposal!==proposal||!subject||subject.value!==baseline){status('Предметът е променен. Предложението не е приложено.');reset();return;}
  subject.value=proposal;subject.dispatchEvent(new Event('input',{bubbles:true}));
  const confirm=$('kt80SubjectConfirmation');if(confirm)confirm.checked=false;
  status('Редакцията е приложена. За продължаване потвърдете предмета.');
  reset();
 });
 dismiss.addEventListener('click',()=>{reset();status('Предложението е отхвърлено. Предметът е запазен.')});
 box.append(heading,preview,accept,dismiss);
}
function init(){
 const action=$('kt80ImproveSubject');if(!action)return;
 action.disabled=false;action.removeAttribute('aria-disabled');
 action.title='EG авторът предлага подобрена формулировка. Предметът се променя само след експертно приемане.';
 const host=$('kt80SubjectProposalStatus');
 const review=document.createElement('div');review.id='kt80AISubjectReview';review.className='kt80-ai-subject-review';review.hidden=true;
 host?.insertAdjacentElement('afterend',review);
 const dialog=document.createElement('dialog');dialog.id='kt80AISubjectDialog';
 const form=document.createElement('form');form.method='dialog';
 const label=document.createElement('label');label.textContent='Парола за EG автора';
 const password=document.createElement('input');password.type='password';password.autocomplete='off';password.required=true;password.placeholder='Временен защитен достъп';
 label.append(password);
 const note=document.createElement('p');note.textContent='Изпращат се предметът и до три експертно потвърдени технически сведения, когато има такива. Преписката и пълният обхват остават в модула. Паролата се пази само в оперативната памет за текущата преписка и се изчиства при приключване или смяна на преписката.';
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Отказ';
 const submit=document.createElement('button');submit.type='submit';submit.textContent='Предложи подобрение';
 cancel.addEventListener('click',()=>{password.value='';dialog.close()});
 form.append(label,note,cancel,submit);dialog.append(form);document.body.append(dialog);
 async function runImprovement(token){
  if($('kt80SubjectConfirmation')?.checked){status('Предметът е фиксиран. Отменете потвърждението преди EG редакция.');return}
  const subject=$('kt80SubjectText')?.value.trim()||'';
  if(!subject){status('Няма предмет за интелигентно подобряване.');return}
  if(subject.length>1500){status('Предметът е твърде дълъг за EG редакция.');return}
  if(!token&&!root.KT80EGSession?.hasAccess()){status('Липсва парола за EG автора.');return}
  const facts=conciseVerifiedFacts();
  const payload=JSON.stringify({subject,facts});
  if(new TextEncoder().encode(payload).length>6000){status('Текстът на предмета надвишава допустимия размер. EG авторът не е извикан.');return}
  reset();const currentId=++serial;
  action.disabled=true;status('EG автор · Изготвяне на редакция…');
  try{
   const response=await root.KT80EGSession.request(ENDPOINT,payload,token);
   const data=await response.json();
   if(currentId!==serial)return;
   if(!response.ok){if(data.issue==='LOT_DESIGNATION_NOT_OBJECT_PURPOSE'){status('Предложението не е приложено: отреждането на УПИ не доказва предназначението на трафопоста.');return;}throw Error('EG услугата върна код '+response.status+(data.providerStatus?' ('+data.providerStatus+')':''));}
   if(data.reviewRequired!==true||data.expertAcceptanceRequired!==true||typeof data.proposal!=='string'||!data.proposal.trim())throw Error('Невалидно предложение от EG автора.');
   if($('kt80SubjectConfirmation')?.checked){status('Предметът е фиксиран по време на заявката. Предложението не се прилага.');return}
   if(($('kt80SubjectText')?.value||'').trim()!==subject){status('Предметът е редактиран. Предложението не е приложено.');return}
   const cleaned=t=>t.toLocaleLowerCase('bg').replace(/[.,;:!\s–—-]+/gu,' ').trim();
   if(cleaned(data.proposal.trim())===cleaned(subject)){status('Предметът не се нуждае от редакция.');return}
   pending={proposal:data.proposal.trim()};
   render(pending.proposal,$('kt80SubjectText').value);
   status('Изготвена е редакция на предмета. Прегледайте предложението.');
  }catch(e){if(currentId===serial)status('Интелигентното подобряване не успя: '+String(e.message||e)+'. Предметът е запазен.')}
  finally{action.disabled=false}
}
 form.addEventListener('submit',event=>{event.preventDefault();const token=password.value;password.value='';dialog.close();runImprovement(token);});
 action.addEventListener('click',()=>{
  if(!$('kt80SubjectText')?.value.trim()){status('Първо конструирайте или въведете предмет.');return}
  if(root.KT80WorkflowState?.subjectConfirmed){status('Вече има експертно потвърден предмет. За редакция започнете нов етап с изрично повторно потвърждение.');return}
  if(root.KT80WorkflowState?.routeConfirmed){status('Процедурата е потвърдена. Достъпът до EG автора за тази преписка е приключен.');return}
  if(root.KT80EGSession?.hasAccess()){runImprovement(null);return}
  dialog.showModal();
 });
 document.addEventListener('kt80:case-reset',reset);
 $('kt80SubjectText')?.addEventListener('input',()=>{if(pending)reset()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
