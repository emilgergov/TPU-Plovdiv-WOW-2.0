/* V27.1 P4 — opt-in early AI integration, no changes to existing GIS or document generators.
   Activated only when ZIP preview and parcel IDs are ready. The existing confirmation remains mandatory. */
(function(root){'use strict';
const ENDPOINT='https://tpu-plovdiv-ai-author-v27.emilgergov.workers.dev/subject';
const get=id=>document.getElementById(id);
let epoch=0,active=false,completedKey='',activeController=null;
const invalidate=()=>{epoch++;completedKey='';if(activeController)activeController.abort();};
function parcels(){return [...new Set((get('ids')?.value||'').match(/\b\d{5}\.\d+\.\d+\b/g)||[])];}
function buildEvidence(preview){
 const docs=(preview?.files||[]).map(f=>{
  const body=typeof f.text==='string'?f.text:'';
  const parts=body.split(/[\r\n]+|(?<=[.!?])\s+/).map(x=>x.trim()).filter(x=>x.length>=20).slice(0,20);
  return {file:f.path||f.file,text:body,error:f.error,facts:parts.map(value=>({kind:'other',value:value.slice(0,1000),quote:value}))};
 });
 return root.V27CaseEvidence.create({documents:docs});
}
async function suggest({token,preview,parcelIds,epochAtStart}){
 const evidence=buildEvidence(preview);
 const input=root.V27EarlySubject.requestFromCase({evidence,parcelIds,existingTitle:get('v26SubjectTitle')?.value||'',existingSubject:get('v26WordHeading')?.value||''});
 if(!input.facts.length)throw Error('Няма достатъчно четим документален текст за ранния AI анализ.');
 const controller=new AbortController();activeController=controller;const timer=setTimeout(()=>controller.abort(),35000);
 try{
  const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(input),signal:controller.signal,cache:'no-store'});
  const data=await response.json();
  if(!response.ok)throw Error('AI анализът не е достъпен ('+response.status+').');
  const check=root.V27EarlySubject.validateSuggestion(data,{parcelIds,evidence});
  if(!check.accepted)throw Error('AI предложението не премина проверката: '+check.issues.join(', '));
  if(epoch!==epochAtStart||root.V26ArchiveTextPreview!==preview||parcels().join(',')!==parcelIds.join(','))return false;
  const heading=get('v26WordHeading'),title=get('v26SubjectTitle'),status=get('v26SubjectStatus');
  if(!heading||!title||!get('v26SubjectEditor')||get('v26SubjectEditor').style.display==='none')return false;
  if(root.V26SubjectContext?.confirmed||get('v26SubjectConfirm')?.disabled)return false;
  if((get('v26WordHeading')?.value||'')!==input.existingSubject||(get('v26SubjectTitle')?.value||'')!==input.existingTitle)return false;
  heading.value=check.subject;heading.dispatchEvent(new Event('input',{bubbles:true}));
  title.value=check.title;title.dispatchEvent(new Event('input',{bubbles:true}));
  if(status){status.style.display='block';status.textContent='AI предложи предмет и заглавие въз основа на документални откъси. Проверете и потвърдете. AI не взема административно решение.';}
  get('v26SubjectEditor').open=true;
  return true;
 }finally{clearTimeout(timer);if(activeController===controller)activeController=null}
}
async function run(){
 if(active)return;
 const preview=root.V26ArchiveTextPreview,ids=parcels();
 if(!preview?.files?.length||!ids.length||!get('v26SubjectEditor')||get('v26SubjectEditor').style.display==='none')return;
 const key=(preview.archive||'')+'|'+ids.join(',');
 if(key===completedKey)return;
 completedKey=key;
 if(!root.confirm('V27.1: Да се използва ли AI за ранно предложение за предмет и заглавие? Извлечени откъси от преписката ще бъдат изпратени към външната AI услуга. Само за разрешени за обработване данни. Отказът запазва досегашния маршрут.'))return;
 const token=root.prompt('Временен токен за AI достъп (не се запазва):');
 if(!token?.trim())return;
 active=true;const current=epoch;
 try{await suggest({token:token.trim(),preview,parcelIds:ids,epochAtStart:current})}
 catch(e){const status=get('v26SubjectStatus');if(status){status.style.display='block';status.textContent='Ранният AI анализ не е приложен: '+e.message+' Досегашният маршрут остава активен.';}}
 finally{active=false}
}
document.addEventListener('v26:archive-text-preview',()=>{invalidate();setTimeout(run,300)});
document.addEventListener('v26:archive-changed',invalidate);
for(const id of ['v26WordHeading','v26SubjectTitle'])get(id)?.addEventListener('input',invalidate);
document.addEventListener('v26:full-reset',invalidate);
get('ids')?.addEventListener('input',invalidate);
const editor=get('v26SubjectEditor');
if(editor&&typeof MutationObserver!=='undefined'){new MutationObserver(()=>{if(editor.style.display!=='none')setTimeout(run,200)}).observe(editor,{attributes:true,attributeFilter:['style']});}
root.V27EarlySubjectBridge=Object.freeze({run});
})(typeof window!=='undefined'?window:globalThis);
