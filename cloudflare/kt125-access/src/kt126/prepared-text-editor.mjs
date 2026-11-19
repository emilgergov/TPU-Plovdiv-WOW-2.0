export function installPreparedTextEditor(api){
 const {make,reviewActions,preview,textarea,edit,confirm,generate,sourceCheck,word,note,endpoint}=api;
 const smart=make('button','Интелигентен редактор');smart.type='button';smart.id='kt130IntelligentEditor';smart.hidden=true;
 edit.textContent='Експертна редакция';reviewActions.prepend(smart);
 const css=make('style');css.textContent='#kt117Stage5 .kt117-actions.kt130-editor-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}#kt117Stage5 .kt130-editor-actions button{width:100%;box-sizing:border-box;min-height:52px}#kt130EditorHistory pre{white-space:pre-wrap;font:inherit}#kt130EditorHistory mark{background:#e8cf8c;color:#123b2b}#kt130EditorHistory del{color:#ffb5a7}@media(max-width:740px){#kt117Stage5 .kt117-actions.kt130-editor-actions{grid-template-columns:1fr}}';document.head.append(css);reviewActions.classList.add('kt130-editor-actions');
 const history=make('details');history.id='kt130EditorHistory';history.hidden=true;history.append(make('summary','Интелигентна редакция · предишен вариант и промени'));
 const notes=make('div'),before=make('pre'),changes=make('pre'),restore=make('button','Върни предишния вариант');restore.type='button';history.append(notes,make('h4','Предишен вариант'),before,make('h4','Промени в текста'),changes,restore);reviewActions.after(history);
 let previous=null,edited=null,contextKey='';
 const hash=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('');
 function differences(a,b){
  changes.replaceChildren();
  const old=a.split(/\n\s*\n/u),next=b.split(/\n\s*\n/u);
  for(let i=0;i<Math.max(old.length,next.length);i++){
   if(old[i]===next[i]){if(next[i])changes.append(document.createTextNode(next[i]+'\n\n'));continue;}
   if(old[i])changes.append(make('del',old[i]+'\n'));
   if(next[i])changes.append(make('mark',next[i]+'\n\n'));
  }
 }
 function refresh(){
  const s=api.state(),v=s.versions.at(-1),key=s.source?String(s.source.caseId)+'|'+s.source.version:'';
  if(key!==contextKey){contextKey=key;previous=null;edited=null;history.hidden=true;before.textContent='';changes.replaceChildren();notes.replaceChildren();}
  if(v?.kind==='предложение на Интелигентния редактор'&&!previous&&s.versions.length>1){previous=s.versions.at(-2).text;edited=v.text;before.textContent=previous;differences(previous,edited);notes.replaceChildren(...(v.editorialNotes||[]).filter(x=>typeof x==='string').map(x=>make('p',x)));history.hidden=false;}
  smart.hidden=!v;smart.disabled=s.busy||!!s.confirmed||!textarea.hidden;
  edit.disabled=s.busy;confirm.disabled=s.busy;generate.disabled=s.busy;sourceCheck.disabled=s.busy;restore.disabled=s.busy||!previous||v?.text!==edited;
  word.disabled=s.busy||!(s.confirmed&&window.KT119TemplateReady?.());
 }
 restore.onclick=()=>{const s=api.state();if(s.busy||!previous||s.versions.at(-1)?.text!==edited)return;api.apply(previous,'възстановен предишен вариант');previous=null;edited=null;history.hidden=true;note.textContent='Предишният вариант е възстановен. Необходимо е експертно потвърждение.';refresh();};
 smart.onclick=async()=>{
  api.sync();const s=api.state(),v=s.versions.at(-1),approval=s.source;
  if(s.busy||s.confirmed||!approval||!v||!textarea.hidden)return;
  if(!window.KT80EGSession?.hasAccess?.()){note.textContent='Няма активен достъп до ЕГ редактора.';return;}
  const original=v.text,baseVersion=v.version,stage4Text=approval.text,p=window.KT80WorkflowState?.subjectConfirmed||{};
  const line=stage4Text.match(/ИЗБРАН\s+ПАНЕЛ\s*:\s*0?\d{1,2}\b[^\n]*/iu)?.[0];if(!line)return;
  const requestId=crypto.randomUUID();api.busy(true);refresh();note.textContent='ЕГ редакторът преглежда само подготвения текст — стил, повторения и глас на органа.';
  const ticket=window.KT80Busy?.start?.('Интелигентен редактор · Стилова редакция на подготвения текст…');
  try{
   const baseTextHash=await hash(original),ev=api.evidence();
   const payload={task:'draft_stage5_document',editorialOnly:true,projectOnly:true,expertConfirmed:true,caseId:approval.caseId,evidenceRevision:approval.evidenceRevision,stage4Version:approval.version,requestId,
    confirmedStage4Text:stage4Text,selectedPanelLine:line,subject:String(p.text||'').trim(),scope:String(p.scope||'').trim(),parcelIds:[...ev.parcelIds],documentTitle:api.label(line),incomingReference:api.reference(),
    qualificationRecord:approval.qualificationRecord||null,qualificationProof:approval.qualificationProof||null,qualificationGate:approval.qualificationGate||null,expertDecision:approval.expertDecision||null,expertDecisionProof:approval.expertDecisionProof||null,
    currentText:original,documentVersion:baseVersion,baseTextHash};
   const response=await window.KT80EGSession.request(endpoint,JSON.stringify(payload)),data=await response.json().catch(()=>({}));
   const now=api.state(),live=api.live();
   if(!live||live.caseId!==approval.caseId||live.version!==approval.version||live.text!==stage4Text||now.source!==approval||now.versions.at(-1)!==v)return;
   if(!response.ok){note.textContent=data.error==='EDITOR_PROTECTED_CONTENT'?'Редакцията не е приложена: засегнато е защитено съдържание. Предишният текст е запазен. '+(data.findings||[]).join(' '):'Интелигентната редакция не е получена (код '+response.status+'). Предишният текст е запазен.';return;}
   if(data.caseId!==approval.caseId||data.requestId!==requestId||data.evidenceRevision!==approval.evidenceRevision||data.stage4Version!==approval.version||data.documentVersion!==baseVersion||data.baseTextHash!==baseTextHash||data.editorialOnly!==true||data.expertReviewRequired!==true||typeof data.text!=='string'||data.text.length<120){note.textContent='Редакцията не съответства на текущата версия. Не е приложена.';return;}
   previous=original;edited=data.text;api.apply(data.text,'предложение на Интелигентния редактор',{editorialNotes:(data.notes||[]).filter(x=>typeof x==='string').slice(0,8)});
   before.textContent=original;differences(original,data.text);notes.replaceChildren(...(data.notes||[]).filter(x=>typeof x==='string').map(x=>make('p',x)));history.hidden=false;
   note.textContent=data.text===original?'ЕГ редакторът не предлага стилови промени. Прегледайте бележките и потвърдете текста.':'Интелигентната редакция е приложена като нова непотвърдена версия. Прегледайте промените и бележките; можете да редактирате експертно или да върнете предишния вариант.';
   document.dispatchEvent(new CustomEvent('kt123:stage5-draft',{detail:{caseId:approval.caseId,stage4Version:approval.version}}));
  }catch{note.textContent='Интелигентната редакция не е завършена. Предишният текст е запазен.';}
  finally{if(ticket!==undefined)window.KT80Busy?.finish?.(ticket);api.busy(false);refresh();}
 };
 for(const name of ['kt80:case-reset','kt80:case-change','kt82:evidence-invalidated','kt116:stage4-confirmed'])document.addEventListener(name,()=>queueMicrotask(refresh));
 return {refresh};
}
export function overlayPreparedTextEditor(rel,source){
 if(!rel.endsWith('/kt117-stage5-document-author.mjs'))return source;
 const once=(a,b)=>{if(source.split(a).length!==2)throw Error('KT130 editor UI contract mismatch');source=source.replace(a,b);};
 once('function initialize(){','const installPreparedTextEditor='+installPreparedTextEditor.toString()+';\nfunction initialize(){');
 once("word.disabled=!(confirmed&&window.KT119TemplateReady?.());\n };","word.disabled=!(confirmed&&window.KT119TemplateReady?.());\n  styleEditor.refresh();\n };");
 once("  const activityTicket=window.KT80Busy?.start?.(","  styleEditor.refresh();\n  const activityTicket=window.KT80Busy?.start?.(");
 once("  edit.hidden=true;confirm.hidden=true;save.hidden=false;cancel.hidden=false;confirmed=null;footer.hidden=true;","  edit.hidden=true;confirm.hidden=true;save.hidden=false;cancel.hidden=false;confirmed=null;footer.hidden=true;styleEditor.refresh();");
 once("busy=false;generate.disabled=false;sourceCheck.disabled=false}","busy=false;generate.disabled=false;sourceCheck.disabled=false;styleEditor.refresh()}");
 once(" window.KT117Document=Object.freeze({",` const styleEditor=installPreparedTextEditor({make,reviewActions,preview,textarea,edit,confirm,generate,sourceCheck,word,note,endpoint,
  state:()=>({source,versions,confirmed,busy}),sync,live,evidence:()=>collectStageEvidence(window),label:documentLabel,reference:incomingReference,
  busy:value=>{busy=value},apply:(text,kind,metadata={})=>{versions.push({version:versions.length+1,text,kind,...metadata});confirmed=null;decisionStatus.hidden=true;render();}});
 window.KT117Document=Object.freeze({`);
 once(' sync();\n}', ' sync();styleEditor.refresh();\n}');
 source=source.replaceAll('Изберете „Редактирай текста“','Изберете „Експертна редакция“');
 return source;
}
