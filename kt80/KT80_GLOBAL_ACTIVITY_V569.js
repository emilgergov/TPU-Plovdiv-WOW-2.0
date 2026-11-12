/* KT80 V56.9 — universal administrative busy indicator across the workflow. */
(function(root){'use strict';
const pending=new Map();let serial=0;let current=null;
const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
let veil,caption,detail,bar;
function ensure(){if(veil)return;
 veil=document.createElement('section');veil.id='kt80GlobalBusy';veil.hidden=true;
 veil.setAttribute('role','status');veil.setAttribute('aria-live','polite');veil.setAttribute('aria-atomic','true');
 const panel=document.createElement('div');panel.className='kt80-global-busy-panel';
 const emblem=document.createElement('div');emblem.className='kt80-global-busy-emblem';emblem.setAttribute('aria-hidden','true');
 const ring=document.createElement('span');ring.className='kt80-global-busy-ring';
 emblem.append(ring);
 const body=document.createElement('div');body.className='kt80-global-busy-text';
 const heading=document.createElement('strong');heading.textContent='WOW · Обработка';
 caption=document.createElement('p');caption.textContent='Извършва се проверка…';
 detail=document.createElement('small');detail.textContent='Работните данни се запазват.';
 body.append(heading,caption,detail);panel.append(emblem,body);veil.append(panel);
 document.body.append(veil);
}
function sync(){ensure();const tasks=[...pending.values()];const last=tasks[tasks.length-1];veil.hidden=!last;
 if(last){caption.textContent=last.label;detail.textContent=tasks.length>1?'Изпълняват се '+tasks.length+' операции.':'Моля, не стартирайте същата операция повторно.';}
 document.documentElement.classList.toggle('kt80-busy-active',Boolean(last));
}
function start(label){ensure();const id=++serial;pending.set(id,{label:String(label||'Обработване на данните…')});sync();return id;}
function finish(id){if(id!==undefined)pending.delete(id);sync();}
function clear(){pending.clear();sync();}
function run(label,job){const id=start(label);let value;try{value=job();}catch(error){finish(id);throw error}return Promise.resolve(value).finally(()=>finish(id));}
const api=Object.freeze({start,finish,clear,run,get active(){return pending.size>0},get count(){return pending.size}});
root.KT80Busy=api;
ready(ensure);
document.addEventListener('kt80:case-reset',clear);
document.addEventListener('kt80:case-change',clear);
// All EG requests, regardless of the current stage, share the same indicator.
// Request headers and credentials are never inspected, logged or retained.
const nativeFetch=root.fetch;
if(typeof nativeFetch==='function'){
 root.fetch=function(input,init){
  const url=typeof input==='string'?input:input?.url||'';
  const eg=/^https:\/\/tpu-plovdiv-ai-author-v27\.emilgergov\.workers\.dev\/(?:subject-improve|scope-improve)(?:\?|$)/i.test(String(url));
  if(!eg)return nativeFetch.apply(this,arguments);
  const isScope=String(url).includes('/scope-improve');
  const id=start(isScope?'EG автор · Подготвя редакция на обхвата…':'EG автор · Подготвя редакция на предмета…');
  let response;
  try{response=nativeFetch.apply(this,arguments)}catch(e){finish(id);throw e}
  return Promise.resolve(response).finally(()=>finish(id));
 };
}
// Secondary AI failures should be visible as an administrative note, not hidden in a thin status line.
function showError(area,message){
 const target=document.getElementById(area==='scope'?'kt80ScopeProposalStatus':'kt80SubjectProposalStatus');
 if(!target)return;
 target.textContent=String(message||'');
 target.dataset.kt80Error='true';target.setAttribute('role','alert');
 target.scrollIntoView({block:'nearest',behavior:'smooth'});
}
function clearError(area){
 const target=document.getElementById(area==='scope'?'kt80ScopeProposalStatus':'kt80SubjectProposalStatus');
 if(target){delete target.dataset.kt80Error;target.setAttribute('role','status')}
}
root.KT80AdministrativeNotice=Object.freeze({showError,clearError});
})(window);