import {editorialParagraphProposals,applyEditorialProposal} from '../../../ai-author-v27/src/kt131-editor-proposals.mjs';
export function editorWordChanges(before,after){
 const tokenize=s=>s.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu)||[];
 const a=tokenize(before),b=tokenize(after),out=[];
 const put=(kind,text)=>{if(!text)return;const last=out.at(-1);if(last?.kind===kind)last.text+=text;else out.push({kind,text});};
 let left=0;while(left<a.length&&left<b.length&&a[left]===b[left])put('same',a[left++]);
 let endA=a.length,endB=b.length;while(endA>left&&endB>left&&a[endA-1]===b[endB-1]){endA--;endB--;}
 const n=endA-left,m=endB-left;
 // Bound allocation for long documents; unchanged prefix/suffix still stay visible.
 if(n*m>250000){put('removed',a.slice(left,endA).join(''));put('added',b.slice(left,endB).join(''));}
 else{
  const rows=Array.from({length:n+1},()=>new Uint16Array(m+1));
  for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)rows[i][j]=a[left+i]===b[left+j]?rows[i+1][j+1]+1:Math.max(rows[i+1][j],rows[i][j+1]);
  let i=0,j=0;while(i<n||j<m){if(i<n&&j<m&&a[left+i]===b[left+j]){put('same',a[left+i]);i++;j++;}else if(j<m&&(i===n||rows[i][j+1]>=rows[i+1][j]))put('added',b[left+j++]);else put('removed',a[left+i++]);}
 }
 put('same',a.slice(endA).join(''));return out;
}
export function installPreparedTextEditor(api,wordChanges=editorWordChanges,paragraphProposals=editorialParagraphProposals,applyProposal=applyEditorialProposal){
 const {make,reviewActions,preview,textarea,edit,confirm,generate,sourceCheck,word,note,endpoint}=api;
 const smart=make('button','Интелигентен редактор');smart.type='button';smart.id='kt130IntelligentEditor';smart.hidden=true;
 edit.textContent='Експертна редакция';reviewActions.prepend(smart);
 const css=make('style');css.textContent='#kt117Stage5 .kt117-actions.kt130-editor-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}#kt117Stage5 .kt130-editor-actions button{width:100%;box-sizing:border-box;min-height:52px}#kt130EditorHistory pre,#kt131ExpertProposals pre{white-space:pre-wrap;font:inherit;overflow-wrap:anywhere}#kt130EditorHistory li{margin:8px 0;overflow-wrap:anywhere}#kt117Stage5 .kt117-paper mark{background:#e8cf8c;color:#123b2b;border-radius:2px;padding:1px 0}#kt131ExpertProposals{border:1px solid #d9b771;border-radius:8px;padding:12px;margin:14px 0}#kt131ExpertProposals article{padding:14px 0;border-top:1px solid #68896e}#kt131ExpertProposals pre{background:#284d3c;padding:12px;max-height:230px;overflow:auto}#kt131ExpertProposals h4{color:#f5d588}#kt131ExpertProposals .kt131-before-label{color:#ffb5a7}#kt131ExpertProposals .kt131-after-label{color:#b4e3bf}#kt131ExpertProposals .kt131-before-text{border-left:4px solid #ffb5a7}#kt131ExpertProposals .kt131-after-text{border-left:4px solid #b4e3bf}#kt130EditorHistory mark{background:#e8cf8c;color:#123b2b}#kt130EditorHistory del{color:#ffb5a7}@media(max-width:740px){#kt117Stage5 .kt117-actions.kt130-editor-actions{grid-template-columns:1fr}}';document.head.append(css);reviewActions.classList.add('kt130-editor-actions');
 const history=make('details');history.id='kt130EditorHistory';history.hidden=true;history.append(make('summary','Промени и бележки · връщане на предишния вариант'));
 const notes=make('div'),changes=make('ul'),restore=make('button','Върни предишния вариант');restore.type='button';history.append(notes,make('h4','Какво е променено'),changes,restore);reviewActions.after(history);
 const proposals=make('details');proposals.id='kt131ExpertProposals';proposals.hidden=true;proposals.open=true;const proposalHeading=make('summary'),proposalCards=make('div');proposals.append(proposalHeading,make('p','Тези предложения не се прилагат автоматично. Всяко приемане създава нова непотвърдена версия; окончателното решение остава на експерта.'),proposalCards);reviewActions.after(proposals);
 const status=make('p');status.id='kt130EditorStatus';status.hidden=true;status.setAttribute?.('role','status');status.setAttribute?.('aria-live','polite');reviewActions.after(status);
 function report(message){note.textContent=message;status.textContent=message;status.hidden=false;}
 let previous=null,edited=null,contextKey='',proposalVersion=null,proposalSource=null;
 const hash=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('');
 function differences(a,b){
  preview.replaceChildren();changes.replaceChildren();let removed='',added='',marks=[],count=0;
  const brief=text=>text.replace(/\s+/gu,' ').trim().slice(0,180);
  const flush=()=>{
   if(!removed.trim()&&!added.trim()){removed='';added='';marks=[];return;}
   const old=brief(removed),next=brief(added);
   for(const mark of marks)mark.title=old?'Преди: '+old:'Добавен текст';
   if(count++<30)changes.append(make('li',old&&next?'„'+old+'“ → „'+next+'“':old?'Премахнато: „'+old+'“':'Добавено: „'+next+'“'));
   removed='';added='';marks=[];
  };
  for(const part of wordChanges(a,b)){
   if(part.kind==='same'){
    if((removed||added)&&!part.text.trim()){removed+=part.text;added+=part.text;}else flush();
    preview.append(document.createTextNode(part.text));
   }else if(part.kind==='removed')removed+=part.text;
   else{added+=part.text;const mark=make('mark',part.text);marks.push(mark);preview.append(mark);}
  }
  flush();
  if(count>30)changes.append(make('li','Още '+(count-30)+' промени са маркирани в текущия текст.'));
  if(!count)changes.append(make('li','Няма промени в думите или пунктуацията.'));
 }
 function renderProposals(s,v){
  if(!s.source||!v){proposals.hidden=true;proposalVersion=null;proposalSource=null;proposalCards.replaceChildren();return;}
  if(proposalVersion!==v||proposalSource!==s.source){
   proposalVersion=v;proposalSource=s.source;proposalCards.replaceChildren();
   const approvalText=s.source.text,items=paragraphProposals(v.text,approvalText);
   proposals.hidden=!items.length;proposalHeading.textContent='Предложения за експертно приемане · '+items.length;
   for(const choice of items){
    const card=make('article');card.setAttribute?.('data-proposal-kind',choice.kind);
    const accept=make('button','Приеми предложението');accept.type='button';
    const beforeLabel=make('strong','Преди'),afterLabel=make('strong','След'),beforeText=make('pre',choice.before),afterText=make('pre',choice.after||'Служебният абзац се отделя в бележките и няма да присъства в документа към адресата.');
    beforeLabel.className='kt131-before-label';afterLabel.className='kt131-after-label';beforeText.className='kt131-before-text';afterText.className='kt131-after-text';
    card.append(make('h4',choice.title),make('p',choice.reason),beforeLabel,beforeText,afterLabel,afterText,accept);
    accept.onclick=()=>{
     const current=api.state(),live=api.live();
     if(current.busy||current.confirmed||!textarea.hidden||current.source!==s.source||current.versions.at(-1)!==v||!live||live.caseId!==s.source.caseId||live.version!==s.source.version||live.text!==approvalText){report('Предложението е за предишна или потвърдена версия. Прегледайте текущия текст, преди приемане.');return;}
     const result=applyProposal(v.text,choice,approvalText);if(!result){report('Предложението не съответства на текущия текст и не е приложено.');return;}
     const keptNotes=(v.editorialNotes||[]).filter(n=>typeof n==='string'&&!(choice.kind==='direct_notification'&&n.includes('Остава формулировка за бъдещо разглеждане'))&&!(choice.kind==='service_note'&&n.includes('В текста остава служебна формулировка')));
     const auditNote=choice.kind==='service_note'?'Експертът прие отделянето на служебния абзац за последващо потвърждение извън документа към адресата.':'Експертът прие прякото уведомяване със съществуващите основания и извод.';
     previous=v.text;edited=result.text;
     api.apply(result.text,'прието редакционно предложение',{editorialNotes:[...keptNotes,auditNote],acceptedEditorialProposal:choice.id});
     differences(previous,edited);notes.replaceChildren(...[...keptNotes,auditNote].map(n=>make('p',n)));history.hidden=false;history.open=true;
     report('Предложението е прието като нова непотвърдена версия. Прегледайте текста и го потвърдете отделно.');refresh();
     document.dispatchEvent(new CustomEvent('kt123:stage5-draft',{detail:{caseId:live.caseId,stage4Version:live.version}}));
    };
    proposalCards.append(card);
   }
  }
  for(const button of proposalCards.querySelectorAll?.('button')||[])button.disabled=s.busy||!!s.confirmed||!textarea.hidden;
 }
 function refresh(){
  const s=api.state(),v=s.versions.at(-1),key=s.source?String(s.source.caseId)+'|'+s.source.version:'';
  if(key!==contextKey){contextKey=key;previous=null;edited=null;history.hidden=true;changes.replaceChildren();notes.replaceChildren();}
  if(['предложение на Интелигентния редактор','прието редакционно предложение'].includes(v?.kind)&&!previous&&s.versions.length>1){previous=s.versions.at(-2).text;edited=v.text;differences(previous,edited);notes.replaceChildren(...(v.editorialNotes||[]).filter(x=>typeof x==='string').map(x=>make('p',x)));history.hidden=false;}
  smart.hidden=!v;smart.disabled=s.busy||!!s.confirmed||!textarea.hidden;
  edit.disabled=s.busy;confirm.disabled=s.busy;generate.disabled=s.busy;sourceCheck.disabled=s.busy;restore.disabled=s.busy||!previous||v?.text!==edited;
  word.disabled=s.busy||!(s.confirmed&&window.KT119TemplateReady?.());
  if(v&&textarea.hidden){if(previous&&v.text===edited)differences(previous,edited);else preview.textContent=v.text;}
  renderProposals(s,v);
 }
 restore.onclick=()=>{const s=api.state();if(s.busy||!previous||s.versions.at(-1)?.text!==edited)return;api.apply(previous,'възстановен предишен вариант');previous=null;edited=null;history.hidden=true;report('Предишният вариант е възстановен. Необходимо е експертно потвърждение.');refresh();};
 smart.onclick=async()=>{
  api.sync();const s=api.state(),v=s.versions.at(-1),approval=s.source;
  if(s.busy||s.confirmed||!approval||!v||!textarea.hidden)return;
  if(!window.KT80EGSession?.hasAccess?.()){report('Няма активен достъп до ЕГ редактора.');return;}
  const original=v.text,baseVersion=v.version,stage4Text=approval.text,p=window.KT80WorkflowState?.subjectConfirmed||{};
  const line=stage4Text.match(/ИЗБРАН\s+ПАНЕЛ\s*:\s*0?\d{1,2}\b[^\n]*/iu)?.[0];if(!line){report('Не е открито потвърденото административно направление. Редакцията не е стартирана.');return;}
  const requestId=crypto.randomUUID();api.busy(true);refresh();report('ЕГ редакторът преглежда само подготвения текст — стил, повторения и глас на органа.');
  const ticket=window.KT80Busy?.start?.('Интелигентен редактор · Стилова редакция на подготвения текст…');
  try{
   const baseTextHash=await hash(original),ev=api.evidence();
   const payload={task:'draft_stage5_document',editorialOnly:true,projectOnly:true,expertConfirmed:true,caseId:approval.caseId,evidenceRevision:approval.evidenceRevision,stage4Version:approval.version,requestId,
    confirmedStage4Text:stage4Text,selectedPanelLine:line,subject:String(p.text||'').trim(),scope:String(p.scope||'').trim(),parcelIds:[...ev.parcelIds],documentTitle:api.label(line),incomingReference:api.reference(),
    qualificationRecord:approval.qualificationRecord||null,qualificationProof:approval.qualificationProof||null,qualificationGate:approval.qualificationGate||null,expertDecision:approval.expertDecision||null,expertDecisionProof:approval.expertDecisionProof||null,
    currentText:original,documentVersion:baseVersion,baseTextHash};
   const response=await window.KT80EGSession.request(endpoint,JSON.stringify(payload)),data=await response.json().catch(()=>({}));
   const now=api.state(),live=api.live();
   if(!live||live.caseId!==approval.caseId||live.version!==approval.version||live.text!==stage4Text||now.source!==approval||now.versions.at(-1)!==v){report('Редакцията не е приложена: текущата преписка или версия е променена. Предишният текст е запазен.');return;}
   if(!response.ok){report(data.transportFailure===true&&typeof data.message==='string'?data.message:data.error==='EDITOR_PROTECTED_CONTENT'?'Редакцията не е приложена: засегнато е защитено съдържание. Предишният текст е запазен. '+(data.findings||[]).join(' '):'Интелигентната редакция не е получена (код '+response.status+'). Предишният текст е запазен.');return;}
   if(data.caseId!==approval.caseId||data.requestId!==requestId||data.evidenceRevision!==approval.evidenceRevision||data.stage4Version!==approval.version||data.documentVersion!==baseVersion||data.baseTextHash!==baseTextHash||data.editorialOnly!==true||data.expertReviewRequired!==true||typeof data.text!=='string'||data.text.length<120){report('Редакцията не съответства на текущата версия. Не е приложена.');return;}
   if(data.text.replace(/\s+/gu,' ').trim()===original.replace(/\s+/gu,' ').trim()){
    notes.replaceChildren(...(data.notes||[]).filter(x=>typeof x==='string').map(x=>make('p',x)));differences(original,original);history.hidden=false;
    report('Редакторът не предлага промени в думите или пунктуацията. Не е създадена нова версия. Прегледайте бележките.');return;
   }
   previous=original;edited=data.text;api.apply(data.text,'предложение на Интелигентния редактор',{editorialNotes:(data.notes||[]).filter(x=>typeof x==='string').slice(0,8)});
   differences(original,data.text);notes.replaceChildren(...(data.notes||[]).filter(x=>typeof x==='string').map(x=>make('p',x)));history.hidden=false;
   report(data.editStatus==='partial'?'Приложена е частична редакция като непотвърдена версия. Част от предложенията са отхвърлени; прегледайте бележките.':'Интелигентната редакция е приложена като нова непотвърдена версия. Прегледайте промените и бележките; можете да редактирате експертно или да върнете предишния вариант.');
   document.dispatchEvent(new CustomEvent('kt123:stage5-draft',{detail:{caseId:approval.caseId,stage4Version:approval.version}}));
  }catch{report('Интелигентната редакция не е завършена. Предишният текст е запазен.');}
  finally{if(ticket!==undefined)window.KT80Busy?.finish?.(ticket);api.busy(false);refresh();}
 };
 for(const name of ['kt80:case-reset','kt80:case-change','kt82:evidence-invalidated','kt116:stage4-confirmed'])document.addEventListener(name,()=>queueMicrotask(refresh));
 return {refresh};
}
export function overlayPreparedTextEditor(rel,source){
 if(!rel.endsWith('/kt117-stage5-document-author.mjs'))return source;
 const once=(a,b)=>{if(source.split(a).length!==2)throw Error('KT130 editor UI contract mismatch');source=source.replace(a,b);};
 once('function initialize(){','const editorialParagraphProposals='+editorialParagraphProposals.toString()+';\nconst applyEditorialProposal='+applyEditorialProposal.toString()+';\nconst editorWordChanges='+editorWordChanges.toString()+';\nconst installPreparedTextEditor='+installPreparedTextEditor.toString()+';\nfunction initialize(){');
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
