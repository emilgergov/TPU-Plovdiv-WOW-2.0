// WOW KT134 — isolated automatic Author → Reviewer → preliminary document → single expert approval.
// Explicit opt-in only. Never auto-approves a legal decision or releases a document.
const make=(tag,value)=>{const el=document.createElement(tag);if(value!==undefined)el.textContent=value;return el};
const str=x=>String(x??'').trim();
const endpoint='https://tpu-plovdiv-ai-author-v27.emilgergov.workers.dev/stage5-document';
let ticket=0,active=false,candidate=null,busy=false,phase='idle';
const current=()=>window.KT80WorkflowState||{};
function caseStamp(){
 const w=current(),i=w.intake||{},p=w.subjectConfirmed||{};
 return JSON.stringify([i.archive_name||'',p.text||'',p.scope||'',w.generation??'',w.caseId??'']);
}
let stamp='';
function init(){
 const stage=document.querySelector('.kt80-stage-panel[data-panel="4"]');
 if(!stage||document.getElementById('kt134AutoPipeline'))return;
 const box=make('section');box.id='kt134AutoPipeline';
 box.style.cssText='background:#153c2d;border:2px solid #d9b874;border-radius:10px;padding:16px;margin:12px 0;color:#f8edd3;font:14px/1.55 Verdana,Arial';
 const title=make('h3','КТ134 · Автоматичен експертен маршрут');
 title.style.cssText='color:#f6d48e;margin:0 0 8px;font:bold 17px Verdana';
 const description=make('p','ЕГ Автор и независимият рецензент подготвят обосновано предложение и проект на документ. Междинни потвърждения не се изискват. Само окончателното решение принадлежи на експерта.');
 const begin=make('button','Избери автоматичен маршрут');begin.type='button';
 const status=make('p','Изчаква избор на маршрут.');status.setAttribute('role','status');
 status.style.cssText='font:13px/1.5 Verdana;color:#f2d396;white-space:pre-wrap';
 const preview=make('section');preview.hidden=true;
 const e4=make('details'),e4Text=make('pre');e4Text.style.cssText='white-space:pre-wrap;max-height:280px;overflow:auto;font:13px/1.5 Verdana';
 e4.append(make('summary','Пълно предложение от Етап 4 и рецензия'),e4Text);
 const e5=make('details'),e5Text=make('pre');e5.open=true;
 e5Text.style.cssText='white-space:pre-wrap;max-height:460px;overflow:auto;font:13px/1.5 Verdana';
 e5.append(make('summary','Проект на документа за окончателно одобрение'),e5Text);
 const nameLabel=make('label','Експерт — служебно име при окончателното одобрение');
 const expert=make('input');expert.type='text';expert.maxLength=120;
 expert.style.cssText='display:block;width:min(440px,100%);padding:9px;margin:8px 0;color:#133726;background:#fffdf6';
 nameLabel.append(expert);
 const final=make('button','Окончателно одобрявам процедурата и документа');final.type='button';final.disabled=true;
 const style='font:700 13px Verdana;background:#d9b874;color:#123828;border:0;border-radius:7px;padding:12px 16px;cursor:pointer;margin:8px 8px 8px 0';
 begin.style.cssText=style;final.style.cssText=style;
 preview.append(e4,e5,nameLabel,final);
 box.append(title,description,begin,status,preview);
 stage.prepend(box);
 const setStatus=(value)=>status.textContent=value;
 const reset=()=>{ticket++;active=false;candidate=null;busy=false;phase='idle';stamp='';preview.hidden=true;final.disabled=true;begin.disabled=false;setStatus('Изчаква избор на маршрут.');};
 function still(t){return active&&ticket===t&&stamp===caseStamp()}
 begin.onclick=()=>{
  if(busy||active)return;
  if(!current().subjectConfirmed?.expertConfirmed||!current().subjectConfirmed?.scopeConfirmed){
   setStatus('Нужни са потвърдени предмет и обхват от Етап 2.');return;
  }
  if(!window.KT80EGSession?.hasAccess?.()){
   setStatus('Защитената сесия не е активна. Входът на регистрирания експерт е необходим преди автоматичния маршрут.');return;
  }
  if(typeof window.KT96EGStage4?.refresh!=='function'){
   setStatus('ЕГ Авторът в Етап 4 още не е готов.');return;
  }
  active=true;busy=true;stamp=caseStamp();phase='author';candidate=null;
  const t=++ticket;begin.disabled=true;
  setStatus('Етап 4: започва пълен анализ на преписката от ЕГ Автор и независим рецензент.');
  try{window.KT96EGStage4.refresh()}catch{if(still(t)){busy=false;setStatus('Автоматичното стартиране на Етап 4 не успя.');}}
 };
 document.addEventListener('kt115:stage4-draft',async event=>{
  const t=ticket,d=event.detail||{};
  if(!still(t)||phase!=='author'||!d.sourceDraft)return;
  if(d.qualityPassed!==true){
   phase='review-failed';busy=false;
   setStatus('Етап 4 изготви предложение, но остават неприети нормативни мотиви. Експертната проверка е видима; не се създава неподкрепен Word.');
   preview.hidden=false;e4Text.textContent=d.sourceDraft;return;
  }
  const selected=d.sourceDraft.match(/ИЗБРАН\s+ПАНЕЛ\s*:\s*0?(\d{1,2})\b[^\n]*/iu);
  if(!selected||Number(selected[1])===15||!d.qualificationRecord||!d.qualificationProof||d.qualificationGate?.sourceAnchorsMatched!==true){
   busy=false;phase='evidence-gap';preview.hidden=false;e4Text.textContent=d.sourceDraft;
   setStatus('Липсва удостоверен източник за нормативната квалификация. Предложението се запазва за окончателна експертна преценка без измислен документ.');return;
  }
  phase='stage5';e4Text.textContent=d.sourceDraft;preview.hidden=false;
  setStatus('Етап 5: автоматично изготвяне на проект по рецензираното направление. Все още няма експертно одобрение.');
  const w=current(),ledger=window.KT134EvidenceLedger||null,intake=w.intake||{};
  const sourceRecords=Array.isArray(intake.document_texts)?intake.document_texts:[];
  const sourceTexts=sourceRecords.slice(0,8).map(x=>({source:str(x.source).slice(0,180),
    text:str(x.text).slice(0,1000),totalChars:String(x.text||'').length,
    truncated:String(x.text||'').length>1000}));
  const evidenceLedger=ledger&&ledger.caseId===d.caseId&&
    String(ledger.evidenceRevision)===String(d.evidenceRevision)?{
     allSpansExamined:ledger.coverageComplete===true,expectedChunks:ledger.expectedChunks,
     examinedChunks:ledger.examinedChunks,claimsTotal:ledger.sourceAnchoredClaims.length,
     claimsIncluded:0,anchoredEvidence:[]}:null;
  if(evidenceLedger){
   const encoder=new TextEncoder();
   for(const x of ledger.sourceAnchoredClaims){
    const fact={source:str(x.source).slice(0,140),documentIndex:x.documentIndex,
     start:x.start,end:x.end,quote:str(x.quote).slice(0,330),summary:str(x.summary).slice(0,320)};
    if(encoder.encode(JSON.stringify([...evidenceLedger.anchoredEvidence,fact])).length>11000)break;
    evidenceLedger.anchoredEvidence.push(fact);
   }
   evidenceLedger.claimsIncluded=evidenceLedger.anchoredEvidence.length;
  }
  const selectedPanelLine=selected[0];
  const documentTitle=str(selectedPanelLine.replace(/^ИЗБРАН\s+ПАНЕЛ\s*:\s*0?\d{1,2}\s*[—–-]?\s*/iu,''));
  const requestId=crypto.randomUUID();
  const payload={task:'draft_stage5_candidate',projectOnly:true,expertConfirmed:false,
   caseId:d.caseId,evidenceRevision:d.evidenceRevision,stage4Version:1,
   requestId,confirmedStage4Text:d.sourceDraft,selectedPanelLine,documentTitle,
   incomingReference:'ОВОС-ХХХХ/ХХ.ХХ.ХХХХ г.',
   subject:str(w.subjectConfirmed?.text),scope:str(w.subjectConfirmed?.scope),
   parcelIds:[],qualificationRecord:d.qualificationRecord,
   qualificationProof:d.qualificationProof,qualificationGate:d.qualificationGate,
   stage5Evidence:{caseId:d.caseId,evidenceRevision:d.evidenceRevision,
    documents:(Array.isArray(intake.files)?intake.files:[]).slice(0,20).map(x=>({name:str(x?.filename||x?.name).slice(0,160)})),
    sourceTexts,evidenceLedger,observations:[],
    gis:{pdf1Available:window.KT83NormativeBridge?.getEvidence?.()?.pdfOK===true,
      spatialClass:'UNKNOWN'}}};
  const byteCount=()=>new TextEncoder().encode(JSON.stringify(payload)).length;
  while(byteCount()>39000&&payload.stage5Evidence.sourceTexts.length)payload.stage5Evidence.sourceTexts.pop();
  while(byteCount()>39000&&payload.stage5Evidence.evidenceLedger?.anchoredEvidence?.length){
   payload.stage5Evidence.evidenceLedger.anchoredEvidence.pop();
   payload.stage5Evidence.evidenceLedger.claimsIncluded--;
  }
  if(byteCount()>41000){busy=false;phase='too-large';setStatus('Текстът е твърде голям за сървърната заявка. Не е съкратен експертният анализ.');return;}
  try{
   const response=await window.KT80EGSession.request(endpoint,JSON.stringify(payload));
   const data=await response.json().catch(()=>({}));
   if(!still(t)||phase!=='stage5')return;
   if(!response.ok||data.kt134PreFinal!==true||data.expertConfirmed!==false||
      data.caseId!==d.caseId||String(data.evidenceRevision)!==String(d.evidenceRevision)||
      data.requestId!==requestId||str(data.draft).length<120){
    busy=false;phase='draft-unavailable';setStatus('Не е получен валиден предварителен документ. '+str(data.error||response.status));return;
   }
   candidate={caseId:d.caseId,evidenceRevision:d.evidenceRevision,stage4Draft:d.sourceDraft,
    panelId:Number(selected[1]),draft:data.draft,
    warnings:[...(data.editorialFlags||[]),...(data.kt134Content?.findings||[]).map(x=>x.reason).filter(Boolean)]};
   e5Text.textContent=data.draft;
   final.disabled=false;phase='await-final';busy=false;
   setStatus('Готово за ЕДИНСТВЕНОТО окончателно експертно решение. '+(candidate.warnings.length?
    'Има '+candidate.warnings.length+' бележки за преценка; прегледайте ги преди одобрение.':''));
  }catch(err){if(still(t)){busy=false;phase='draft-error';setStatus('Неуспешно изготвяне на предварителния документ: '+str(err?.message))}}
 });
 final.onclick=async()=>{
  if(!active||phase!=='await-final'||!candidate||busy)return;
  const t=ticket,candidateNow=candidate;
  const name=str(expert.value);
  if(name.length<2){setStatus('Посочете служебното си име за ОКОНЧАТЕЛНОТО одобрение.');expert.focus();return}
  if(!window.KT116ExpertHandoff?.approveAutomatedFinal||
     !window.KT117Document?.acceptAutomatedDocument){
   setStatus('Не е налична интеграцията за окончателно одобрение.');return
  }
  busy=true;final.disabled=true;
  setStatus('Регистриране на единственото окончателно решение на експерта…');
  const result=await window.KT116ExpertHandoff.approveAutomatedFinal({
   caseId:candidateNow.caseId,evidenceRevision:candidateNow.evidenceRevision,
   stage4Draft:candidateNow.stage4Draft,expert:name});
  if(!still(t)){return}
  if(!result?.ok){busy=false;final.disabled=false;setStatus(result?.reason||'Окончателното решение не е регистрирано.');return}
  const adopted=window.KT117Document.acceptAutomatedDocument({
   caseId:candidateNow.caseId,selectedPanelId:candidateNow.panelId,
   draft:candidateNow.draft});
  if(!adopted?.ok){
   busy=false;phase='approved-document-not-ready';
   setStatus('Експертното направление е регистрирано, но Word проектът не е приет: '+(adopted?.reason||''));return
  }
  phase='approved';busy=false;
  setStatus('Окончателното решение е регистрирано. Изготвяне на Word по одобрената бланка…');
  try{
   const downloaded=await window.KT119Download?.();
   if(!still(t))return;
   setStatus(downloaded===true?'Одобрението е регистрирано и Word е генериран.':
     'Одобрението е регистрирано. Word не е изтеглен автоматично; наличен е в Етап 5.');
  }catch{if(still(t))setStatus('Одобрението е регистрирано. За Word използвайте Етап 5.')}
 };
 for(const type of ['kt80:case-reset','kt80:case-change','kt82:evidence-invalidated'])
  document.addEventListener(type,reset);
 window.KT134AutoMode=Object.freeze({active:()=>active,phase:()=>phase,
  snapshot:()=>candidate?{caseId:candidate.caseId,evidenceRevision:candidate.evidenceRevision,
   panelId:candidate.panelId,phase}:null});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,3400),{once:true});
else setTimeout(init,3400);
