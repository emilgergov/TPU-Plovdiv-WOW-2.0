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
  // Preserve original source quotations; do not pass truncated excerpts as verified quotations.
  const parts=body.split(/[\\r\\n]+|(?<=[.!?])\\s+/).map(x=>x.trim()).filter(x=>x.length>=20&&x.length<=1000);
  const priority=/инвестицион|предложени|предвижда|изграждан|строител|склад|офис|имот|идентификатор|местност|землище|адрес|обект|производствен|водоснабд|електрозахран|отпадъчн|възложител/i;
  const ranked=parts.map((value,i)=>({value,i,score:(priority.test(value)?3:0)+( /\\b\\d{5}\\.\\d+\\.\\d+\\b/.test(value)?3:0)})).sort((a,b)=>b.score-a.score||a.i-b.i).slice(0,16).sort((a,b)=>a.i-b.i);
  return {file:f.path||f.file,text:body,error:f.error,facts:ranked.map(({value})=>({kind:'other',value,quote:value}))};
 });
 return root.V27CaseEvidence.create({documents:docs});
}
async function suggest({token,preview,parcelIds,epochAtStart}){
 const evidence=buildEvidence(preview);
 const matched=evidence.facts.filter(f=>f.status==='source_matched');
 if(!matched.length)throw Error('Няма четими документални откъси за AI редакция.');
 // The subject editor is an assisted draft, not a claim of exhaustive dossier analysis.
 // Send only source-matched quotations; unreadable documents remain explicitly disclosed.
 const input=root.V27EarlySubject.requestFromCase({evidence,parcelIds,existingTitle:get('v26SubjectTitle')?.value||'',existingSubject:get('v26WordHeading')?.value||''});
 const limited=[];let chars=0;
 for(const f of input.facts){const cost=JSON.stringify(f).length;if(limited.length>=35||chars+cost>17000)break;limited.push(f);chars+=cost;}
 if(!limited.length)throw Error('Не са намерени подходящи документални откъси.');
 input.facts=limited;
 const limitedIds=new Set(limited.map(f=>f.id));
 input.conflicts=(input.conflicts||[]).filter(c=>(c.values||[]).some(v=>v.some(id=>limitedIds.has(id))));
 const excluded=matched.length-limited.length;
 const missing=evidence.documents.filter(d=>!d.readable).map(d=>d.file);
 input.unreadable=[...new Set([...(input.unreadable||[]),...missing])];
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
  if(status){status.style.display='block';status.textContent='AI предложи предмет и заглавие по '+limited.length+' проверени откъса. '+(missing.length?'Непрочетени документи: '+missing.join(', ')+'. ':'')+(excluded?'Необхванати откъси: '+excluded+'. ':'')+'Проверете спрямо цялата преписка преди потвърждение.';}
  get('v26SubjectEditor').open=true;
  return true;
 }finally{clearTimeout(timer);if(activeController===controller)activeController=null}
}
async function run(){
 if(active)return;
 const preview=root.V26ArchiveTextPreview,ids=parcels();
 const status=get('v26SubjectStatus');
 if(!preview?.files?.length||!ids.length){if(status){status.style.display='block';status.textContent='За AI корекция е необходима прочетена ZIP преписка с извлечени имоти.';}return;}
 if(!get('v26SubjectEditor')||get('v26SubjectEditor').style.display==='none'||root.V26SubjectContext?.confirmed){return;}
 if(!root.V27CaseEvidence||!root.V27DossierBatches||!root.V27EarlySubject){if(status){status.style.display='block';status.textContent='AI помощникът не е зареден. Можете да редактирате предмета ръчно.';}return;}
 if(!root.confirm('Да се изпратят извлечени откъси от преписката към AI за корекция на предмета и заглавието? Използвайте само разрешени за обработване данни.'))return;
 const token=root.prompt('Временен токен за AI достъп (не се запазва):');
 if(!token?.trim())return;
 active=true;const current=epoch,button=get('v27SubjectAiCorrect');
 if(button)button.disabled=true;
 if(status){status.style.display='block';status.textContent='AI подготвя предложение за предмет и заглавие…';}
 try{await suggest({token:token.trim(),preview,parcelIds:ids,epochAtStart:current})}
 catch(e){if(status){status.style.display='block';status.textContent='AI корекцията не е приложена: '+e.message+' Можете да редактирате текста ръчно и да го потвърдите.';}}
 finally{active=false;if(button)button.disabled=false;}
}
document.addEventListener('v26:archive-changed',invalidate);
document.addEventListener('v26:full-reset',invalidate);
get('ids')?.addEventListener('input',invalidate);
for(const id of ['v26WordHeading','v26SubjectTitle'])get(id)?.addEventListener('input',invalidate);
get('v27SubjectAiCorrect')?.addEventListener('click',run);
root.V27EarlySubjectBridge=Object.freeze({run});
})(typeof window!=='undefined'?window:globalThis);
