/* КТ80 V57.0 — общи административни състояния, без автоматично експертно одобрение. */
(function(root){'use strict';
const $=id=>document.getElementById(id);
const tracked={subject:{text:'',source:'',accepted:false},scope:{text:'',source:'',accepted:false}};
function init(){
 const configs=[
  {kind:'subject',field:'kt80SubjectText',approval:'kt80SubjectConfirmation',caption:'Предмет'},
  {kind:'scope',field:'kt80ScopeText',approval:'kt80ScopeConfirmation',caption:'Обхват'}
 ];
 function update(c){
  const field=$(c.field),check=$(c.approval);if(!field||!check)return;
  const host=field.closest('.kt80-v56-field');if(!host)return;
  let summary=$('kt80ApprovalState'+c.kind);
  if(!summary){summary=document.createElement('div');summary.id='kt80ApprovalState'+c.kind;
   summary.className='kt80-admin-current-state';summary.setAttribute('role','status');
   summary.setAttribute('aria-live','polite');
   field.insertAdjacentElement('beforebegin',summary);
  }
  const accepted=tracked[c.kind].accepted&&field.value.trim()===tracked[c.kind].text;
  const confirmed=Boolean(check.checked&&field.value.trim());
  if(c.kind==='scope'){
    // Confirmed scope must be immutable until the expert explicitly unchecks it.
    field.readOnly=confirmed;
    for(const id of ['kt80ImproveScope','kt80EditScope','kt80ReconstructScope']){
      const button=$(id);if(button)button.disabled=confirmed;
    }
    const candidate=$('kt80RelevanceProposals');
    if(candidate)candidate.querySelectorAll('.kt81-result-actions button').forEach(btn=>{btn.disabled=confirmed;});
    const aiReview=$('kt80EGScopeReview');
    if(aiReview)aiReview.querySelectorAll('button').forEach(btn=>{btn.disabled=confirmed;});
  }
  const state=confirmed?'confirmed':accepted?'accepted':'draft';
  host.dataset.kt80EditorialState=state;
  summary.dataset.state=state;
  const names={confirmed:'ЕКСПЕРТНО ПОТВЪРДЕНО',accepted:'ПРИЕТА РЕДАКЦИЯ',draft:'ПРОЕКТ ЗА ПРОВЕРКА'};
  const desc=confirmed?'Текстът е фиксиран за следващия етап.':accepted?'Предложението е включено в проекта. Необходимо е окончателно потвърждение.':'Текстът подлежи на експертна проверка.';
  summary.replaceChildren();
  const tag=document.createElement('strong');tag.textContent=names[state];
  const note=document.createElement('span');note.textContent=desc;
  summary.append(tag,note);
  let below=$('kt80ApprovalFoot'+c.kind);
  if(!below){below=document.createElement('p');below.id='kt80ApprovalFoot'+c.kind;below.className='kt80-admin-confirmed-foot';check.closest('label')?.insertAdjacentElement('afterend',below)}
  below.textContent=confirmed?'Потвърден окончателен '+(c.kind==='subject'?'предмет':'обхват')+'. За промяна отменете потвърждението.':accepted?'Приетата редакция очаква експертно потвърждение.':'';
  below.hidden=!confirmed&&!accepted;
  const approvalLabel=check.closest('label');
  if(approvalLabel){approvalLabel.classList.toggle('kt80-admin-awaiting',state!=='confirmed');approvalLabel.classList.toggle('kt80-admin-confirmed',state==='confirmed')}
 }
 configs.forEach(c=>{$(c.field)?.addEventListener('input',()=>{
   // Programmatic updates also invalidate a previously confirmed scope.
   if(c.kind==='scope'&&$(c.approval)?.checked){$(c.approval).checked=false;$(c.approval).dispatchEvent(new Event('change',{bubbles:true}))}
   if(tracked[c.kind].text!==$(c.field).value.trim())tracked[c.kind].accepted=false;update(c)});
 $(c.approval)?.addEventListener('change',()=>update(c));update(c)});
 document.addEventListener('kt80:editorial-accepted',e=>{
  const kind=e.detail?.kind,txt=String(e.detail?.text||'').trim();
  if(!tracked[kind]||!txt)return;
  tracked[kind]={text:txt,source:String(e.detail?.source||''),accepted:true};
  const config=configs.find(c=>c.kind===kind);if(config)update(config);
 });
 function reset(){for(const x of Object.values(tracked)){x.accepted=false;x.text='';x.source=''}configs.forEach(update)}
 document.addEventListener('kt80:case-reset',reset);
 document.addEventListener('kt80:case-change',reset);
 root.KT80AdministrativeStandards=Object.freeze({refresh:()=>configs.forEach(update),getState:kind=>{
  const c=configs.find(c=>c.kind===kind);if(!c)return null;
  const field=$(c.field),confirmed=Boolean($(c.approval)?.checked);
  return Object.freeze({state:confirmed?'confirmed':tracked[kind].accepted&&tracked[kind].text===field?.value.trim()?'accepted':'draft',source:tracked[kind].source});
 }});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);