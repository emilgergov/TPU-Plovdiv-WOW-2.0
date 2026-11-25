/* KT96 EG AUTHOR — case-bound AI draft at entry to Stage 4.
 * Draft only. Does not issue administrative acts or assert independently verified law.
 * Uses the SAME one-cycle RAM credential as Stage 2.
 * Required server contract: POST /stage4-proposal -> echoed caseId,
 * evidenceRevision, requestId and draft. No response identity -> no accepted draft.
 * Distinct experts' credentials never travel inside the case evidence payload. */
import {collectStageEvidence,verifyStageEvidence} from './kt95-stage-evidence-handoff.mjs';
import {buildEvidenceChunks,verifyEvidenceDigest,evidenceCoverage} from './kt134-evidence-chunks.mjs';
import {VERIFIED_ARTICLES,LOCKED_ARCHIVE,LOCKED_ARCHIVE_SHA256} from './v11-trusted-source-registry.mjs';

const ENDPOINT='https://tpu-plovdiv-ai-author-v27.emilgergov.workers.dev/stage4-proposal';
const $=id=>document.getElementById(id);
const make=(tag,txt)=>{const n=document.createElement(tag);if(txt!==undefined)n.textContent=txt;return n;};
const str=x=>String(x??'').trim();
function boot(){
 const host=document.querySelector('.kt80-stage-panel[data-panel="4"]');if(!host||$('kt96EGAuthor'))return false;
 const ui=make('section');ui.id='kt96EGAuthor';ui.style.cssText='padding:14px;margin:12px 0;border:2px solid #c9aa6b;border-radius:9px;background:#143c2b;color:#f7f0db';
 ui.append(make('h3','EG Автор · проект за Етап 4'));
 const evidenceBox=make('section');evidenceBox.id='kt105EvidenceOverview';evidenceBox.style.cssText='margin:12px 0;padding:12px;background:#244b36;border-radius:8px;line-height:1.5';
 const style=make('style');
 style.textContent='#kt105EvidenceOverview{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;background:#102e23!important;border:1px solid #c1a665;padding:13px!important}#kt105EvidenceOverview h4{grid-column:1/-1;color:#f3d28c;font:bold 17px Verdana;margin:0 0 3px}#kt105EvidenceOverview .kt117-evidence-item{background:#294b38;border-left:3px solid #cbae72;border-radius:5px;padding:10px;min-width:0;font:13px/1.45 Verdana;color:#f5efe2}#kt105EvidenceOverview .kt117-evidence-item strong{display:block;color:#f1d28c;font:700 13px Verdana;margin:0 0 5px}#kt105EvidenceOverview .kt117-evidence-item>div{overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}#kt105EvidenceOverview .kt117-evidence-item:hover>div{-webkit-line-clamp:unset}#kt96EGAuthor{font-family:Verdana,Arial,sans-serif!important}#kt96EGAuthor h3{font:700 19px Verdana;color:#f5d18b}@media(max-width:760px){#kt105EvidenceOverview{grid-template-columns:1fr}}';
 ui.append(style,evidenceBox);
 const line=(name,value)=>{const block=make('div');block.className='kt117-evidence-item';block.title=value||'Няма данни';const heading=make('strong',name);block.append(heading,make('div',value||'НЯМА ДАННИ'));return block;};
 function showEstablishedEvidence(){
  const w=window.KT80WorkflowState||{},p=w.subjectConfirmed||{},h=collectStageEvidence(window),intake=w.intake||{};
  evidenceBox.replaceChildren(make('h4','Установени данни'));
  const docs=Array.isArray(intake.document_texts)?intake.document_texts:[];
  const files=Array.isArray(intake.files)?intake.files:[];
  const names=files.map(x=>str(x?.name||x?.file||x?.source)).filter(Boolean);
  evidenceBox.append(line('Етап 1 · Преписка',[
    intake.archive_name?'Архив: '+str(intake.archive_name):'',
    'Документи с извлечен текст: '+docs.length,
    names.length?'Файлове: '+names.slice(0,12).join('; '):''
  ].filter(Boolean).join(' · ')));
  evidenceBox.append(line('Етап 2 · Потвърден предмет',p.expertConfirmed===true?str(p.text):'НЯМА ПОТВЪРДЕН ПРЕДМЕТ'));
  evidenceBox.append(line('Етап 2 · Потвърден обхват',p.scopeConfirmed===true?str(p.scope):'НЯМА ПОТВЪРДЕН ОБХВАТ'));
  // Present only human-readable Stage 3 GIS and parcel facts; boolean transport
  // markers from the case-hand-off are not administrative findings.
  const spatial=window.KT83NormativeBridge?.getEvidence?.()||{};
  const parcels=h.parcelIds?.length?'Имот(и): '+h.parcelIds.join(', '):'Имот(и): НЯМА ДАННИ';
  const spatialClass=str(spatial.spatialClass).toUpperCase();
  const pdfReady=spatial.pdfOK===true;
  const geographicResult=spatialClass==='OUTSIDE'&&pdfReady?
    'ГИС: няма установено геометрично пресичане със защитена зона по предадения пространствен анализ.':
    spatialClass==='INSIDE'&&pdfReady?
    'ГИС: установено е геометрично пресичане по предадения пространствен анализ.':
    'ГИС: пространствената квалификация не е удостоверена в предадените данни.';
  const checked='PDF1: '+(pdfReady?'наличен по данните от Етап 3':'няма потвърдена наличност');
  evidenceBox.append(line('Етап 3 · Имоти и пространствени данни',
    [parcels,geographicResult,checked].join(' · ')));
 }

 const button=make('button','Изготви проект с EG Автора');button.type='button';button.id='kt96EGGenerate';
 button.style.cssText='background:#d9b874;color:#173a28;padding:10px 14px;font-weight:800;border:0;border-radius:7px;cursor:pointer';
 const status=make('p','');status.style.display='none';status.id='kt96EGStatus';status.setAttribute('role','status');
 const output=make('div');output.id='kt96EGDraft';output.style.cssText='white-space:pre-wrap;line-height:1.6;border-left:4px solid #d4ba80;padding:12px;background:#244a37;color:#fff;display:none';
 const lead=make('div');lead.id='kt104EGLead';lead.style.cssText='display:none;margin:12px 0;padding:14px;border-left:6px solid #e1be72;border-radius:7px;background:#244b36;font-size:17px;font-weight:700;line-height:1.55;white-space:pre-wrap';
 const expanded=make('details');expanded.id='kt104EGDetails';expanded.style.cssText='display:none;margin:12px 0;border:1px solid #9d9e72;border-radius:7px;padding:10px';
 expanded.append(make('summary','Подробна фактическа и нормативна аргументация'),output);
 ui.append(button,status,lead,expanded);
 // KT105: keep the older normative engine running for independent checks,
 // but do not show its automatic proposals before or after the expert calls EG.
 const legacyVisibility=make('style');
 legacyVisibility.textContent='.kt80-stage-panel[data-panel="4"] > :not(#kt96EGAuthor){display:none !important}'+
  '.kt80-stage-panel[data-panel="4"]{max-width:none !important}'+
  '#kt96EGAuthor{width:100%;max-width:1100px;margin:10px auto !important}';
 ui.prepend(legacyVisibility);
 const dialog=make('dialog');dialog.id='kt96EGPassword';dialog.style.cssText='background:#193b2d;color:#fff3db;border:1px solid #d9b874;border-radius:10px;padding:20px;max-width:460px';
 const form=make('form');form.method='dialog';
 const label=make('label','Парола за EG Автора — един път в работния цикъл');
 const password=make('input');password.type='password';password.required=true;password.autocomplete='off';password.style.cssText='display:block;width:100%;margin:10px 0;padding:10px';
 label.append(password);
 const send=make('button','Изготви проект');send.type='submit';
 const cancel=make('button','Отказ');cancel.type='button';cancel.addEventListener('click',()=>{password.value='';dialog.close()});
 form.append(label,send,cancel);dialog.append(form);document.body.append(dialog);
 host.prepend(ui);
 // CaseCycleId is unique to this local workflow, NOT a guaranteed multi-user persistent case identifier.
 // If the private case service provides a persistent ID, use only an explicit verified binding.
 const caseIdentity=()=>{
  const w=window.KT80WorkflowState||{},h=collectStageEvidence(window);
  let bound=null;
  try{bound=window.KT84ProtectedWorkflow?.getVerifiedCase?.()||null}catch(_){}
  const permanent=bound?.verified===true&&str(bound?.caseId)?str(bound.caseId):null;
  return {w,h,caseId:permanent||h.caseId,caseIdType:permanent?'shared-verified':'local-cycle',
   signature:[permanent||h.caseId,h.generation,h.evidenceRevision,h.key].join('::')};
 };
 // Only the locked, audited references are shipped; text anchors are NOT full articles.
 // The server must attach exact V11 text before asserting a grounded normative draft.
 const refs=()=>Object.values(VERIFIED_ARTICLES)
  .map(r=>({id:r.id,act:r.act,article:r.article,archivePath:r.archivePath,textAnchor:r.anchor,
   citationVerified:true,applicabilityVerified:false}));

 // KT99: transport extracted case material, not a mere document count.
 // Source text is untrusted dossier evidence; NEVER promote it to an approved finding.
 // Payload is bounded for the protected Worker; preserve source identity and mark truncation.
 const compact=(x,max=1300)=>str(x).slice(0,max);
 const serializable=(x,max=5000)=>{try{return JSON.stringify(x).slice(0,max)}catch(_){return ''}};
 function stageEvidenceDetail(w,h){
  const intake=w.intake||{},documents=Array.isArray(intake.document_texts)?intake.document_texts:[];
  const dossier=Array.isArray(intake.dossier_documents)?intake.dossier_documents:[];
  const pages=Array.isArray(intake.page_text_index)?intake.page_text_index:[];
  const files=Array.isArray(intake.files)?intake.files:[];
  const budgets={documents:49000,pageText:15000};
  let remaining=budgets.documents;
  const sourceTexts=documents.slice(0,60).map(d=>{
   const source=compact(d?.source,200);
   const raw=str(d?.text),length=Math.min(remaining,16000,raw.length);
   const excerpt=raw.slice(0,length);
   remaining-=length;
   return {source,text:excerpt,totalChars:raw.length,truncated:length<raw.length,
    status:'SOURCE_TEXT_NOT_EXPERT_VERIFIED'};
  }).filter(d=>d.source&&d.text);
  return {
   archiveName:compact(intake.archive_name,180),
   documents:files.slice(0,80).map(d=>({file:compact(d?.name||d?.file||d?.source,180),
    status:compact(d?.status||d?.state||d?.readStatus,150)})),
   documentRecords:dossier.slice(0,35).map(d=>({file:compact(d.file,180),
    type:compact(d.type,50),readable:d.readable===true,
    facts:Array.isArray(d.facts)?d.facts.slice(0,12).map(f=>({
     key:compact(f.key,80),value:compact(f.value,500),source:compact(f.source,180),
     verified:false})):[],
    references:Array.isArray(d.references)?d.references.slice(0,12):[]})),
   sourceTexts,
   pageTexts:pages.slice(0,50).map(p=>({file:compact(p.file,180),page:p.page,
    text:compact(p.text,300),verified:false})),
   sourceTextCount:documents.length,
   sourceTextTruncated:sourceTexts.some(d=>d.truncated)||documents.length>sourceTexts.length,
   dossierEvidence:Array.isArray(intake.evidence)?intake.evidence.slice(0,50):[],
   subjectCandidates:Array.isArray(intake.subject_candidates)?intake.subject_candidates.slice(0,12).map(s=>({
    source:compact(s.source,180),title:compact(s.title,500),
    sections:Array.isArray(s.sections)?s.sections.slice(0,15).map(t=>({
     key:compact(t.key,50),text:compact(t.text,1200),source:compact(t.source,180),
     reviewRequired:true})):[]})):[],
   semanticReview:intake.semantic_review||null,
   gis:{
    parcelIds:[...h.parcelIds],
    sourceSummary:h.observations.filter(x=>/parcel|spatial|pdf/i.test(x.factId)),
    piMaster:serializable(window.KT80PIMaster?.getResult?.(),4500),
    spatial:serializable(window.KT83NormativeBridge?.getEvidence?.(),5500),
    stage3:serializable(window.KT80Stage3?.getResult?.(),4500),
    areaContext:serializable(window.KT81ContextScreen?.getResult?.(),2600)
   }
  };
 }

 // KT102: measure UTF-8 bytes rather than JS characters. Cyrillic is multi-byte.
 // Keep all legal/factual identities and the source list; reduce redundant excerpts first.
 const stageBytes=x=>new TextEncoder().encode(JSON.stringify(x)).length;
 function fitStage4Request(req){
  const d=req.completeCaseEvidence;
  const cap=85000;
  let bytes=stageBytes(req),passes=0;
  if(bytes<=cap)return {payload:JSON.stringify(req),bytes,reduced:false};
  while(bytes>cap&&passes++<24){
   let changed=false;
   if(d.pageTexts?.length){d.pageTexts=d.pageTexts.slice(0,Math.floor(d.pageTexts.length/2));changed=true;}
   else if(d.sourceTexts?.some(x=>x.text.length>500)){
    const items=[...d.sourceTexts].sort((a,b)=>b.text.length-a.text.length);
    const largest=items[0];const take=Math.max(500,Math.floor(largest.text.length/2));
    largest.text=largest.text.slice(0,take);largest.truncated=true;
    d.sourceTextTruncated=true;changed=true;
   }else if(d.subjectCandidates?.length>3){
    d.subjectCandidates=d.subjectCandidates.slice(0,Math.ceil(d.subjectCandidates.length/2));changed=true;
   }else if(d.dossierEvidence?.length>5){
    d.dossierEvidence=d.dossierEvidence.slice(0,Math.ceil(d.dossierEvidence.length/2));changed=true;
   }else if(d.documentRecords?.some(x=>x.facts?.length>2)){
    for(const rec of d.documentRecords)if(rec.facts?.length>2)rec.facts=rec.facts.slice(0,Math.ceil(rec.facts.length/2));
    changed=true;
   }else if(d.semanticReview){
    d.semanticReview=null;changed=true;
   }else if(d.gis?.piMaster?.length>300){
    d.gis.piMaster=d.gis.piMaster.slice(0,Math.floor(d.gis.piMaster.length/2));changed=true;
   }else if(d.gis?.spatial?.length>300){
    d.gis.spatial=d.gis.spatial.slice(0,Math.floor(d.gis.spatial.length/2));changed=true;
   }else if(d.gis?.stage3?.length>300){
    d.gis.stage3=d.gis.stage3.slice(0,Math.floor(d.gis.stage3.length/2));changed=true;
   }
   if(!changed)break;
   bytes=stageBytes(req);
  }
  return {payload:bytes<=cap?JSON.stringify(req):null,bytes,reduced:true};
 }
 let serial=0,pendingSignature='',finishedSignature='',lastResult=null;
 const clear=()=>{
  serial++;pendingSignature='';finishedSignature='';lastResult=null;password.value='';
  window.KT134EvidenceLedger=null;
  if(dialog.open)dialog.close();button.disabled=false;output.textContent='';output.style.display='none';
  status.textContent='';status.style.display='none';lead.textContent='';lead.style.display='none';expanded.style.display='none';expanded.open=false;showEstablishedEvidence();
 };
 async function generate(firstPassword=null){
  status.style.display='block';
  const identity=caseIdentity(),{w,h}=identity,p=w.subjectConfirmed||{};
  if(!(p.expertConfirmed===true&&p.scopeConfirmed===true)){
   status.textContent='Необходимо е потвърждение на предмета и обхвата в Етап 2.';return;
  }
  if(!verifyStageEvidence(h,window)){status.textContent='Доказателственият пакет е променен. Върнете се към потвърдените данни.';return;}
  if(!window.KT80EGSession?.request){status.textContent='Липсва защитената сесия с EG Автора.';return;}
  if(!firstPassword&&!window.KT80EGSession.hasAccess()){dialog.showModal();return;}
  const requestId=window.crypto?.randomUUID?.();
  if(!requestId){status.textContent='Не може да се създаде уникален ИД за заявката.';return;}
  const ticket=++serial;
  pendingSignature=identity.signature;finishedSignature='';lastResult=null;
  button.disabled=true;output.style.display='none';output.textContent='';
  status.textContent='EG Авторът подготвя проект за текущата преписка. Това не е окончателна правна преценка.';
  const request={
   task:'draft_normative_proposal',documentType:'PROJECT_NOT_ACT',
   caseId:identity.caseId,caseIdType:identity.caseIdType,
   localCycleId:h.caseId,generation:h.generation,evidenceRevision:h.evidenceRevision,requestId,
   subject:str(p.text),scope:str(p.scope),
   evidence:h.observations.map(x=>({factId:x.factId,value:x.value,status:x.status,
    sourceId:x.sourceId,sourceLocation:x.sourceLocation,description:x.description})),
   parcelIds:h.parcelIds,
   completeCaseEvidence:stageEvidenceDetail(w,h),
   archive:{name:LOCKED_ARCHIVE,sha256:LOCKED_ARCHIVE_SHA256,verifiedReferences:refs(),
    archivedTextIncluded:false},
   // KT114: author requirements are not prefilled legal conclusions.
   normativeReviewRequirements:{
    compareBeforePanelSelection:true,
    comparisonCount:4,
    fourHypotheses:'Apply four hypotheses as defined in verified server-side law; never invent legal classifications.',
    perHypothesis:['verified legal prerequisites','case evidence and sources','decisive missing facts','reasoned conclusion'],
    noNegativeConclusionFromMissingCategoryDocument:true,
    noConclusionFromSpatialNonIntersectionAlone:true,
    selectedPanelMustMatchAuthoritative22PanelCatalog:true,
    panel02MustHaveExactlyApprovedLabel:true,
    doNotShiftLegalClassificationToApplicant:true,
    noInventedLegalBasis:true,
    draftRequiresIndependentReview:true
   },
   constraints:{noInventedFacts:true,noInventedCitations:true,expertApprovalRequired:true,
    legalAppplicabilityMustBeVerified:true,legalApplicabilityMustBeVerified:true,neverIssueAct:true}
  };
  const activityTicket=window.KT80Busy?.start?.('ЕГ Автор → независим рецензент · Изготвяне и проверка на предложението…');
  try{
   // KT134: examine every readable source span before drafting. Failure is visible.
   const intakeNow=w.intake||{};
   const readableDocs=Array.isArray(intakeNow.document_texts)?intakeNow.document_texts:[];
   const documentFormat=/\.(txt|csv|json|md|pdf|docx?|jpe?g|png|webp|bmp|tiff?)$/i;
   const registeredSources=[
    ...(Array.isArray(intakeNow.files)?intakeNow.files:[]).map(x=>str(x?.filename||x?.name||x?.file||x?.source)),
    ...(Array.isArray(intakeNow.dossier_documents)?intakeNow.dossier_documents:[]).map(x=>str(x?.file||x?.source))
   ].filter(name=>documentFormat.test(name));
   const declaredCount=Math.max(readableDocs.length,new Set(registeredSources).size);
   const batch=buildEvidenceChunks(readableDocs,5000);
   const receipts=[];
   let allResponses=true;
   for(let i=0;i<batch.chunks.length;i++){
    if(ticket!==serial||pendingSignature!==caseIdentity().signature){allResponses=false;break}
    const chunk=batch.chunks[i];
    status.textContent='Прочит на преписката: '+(i+1)+' от '+batch.chunks.length+' части · '+chunk.source;
    let result=null;
    try{
     const resp=await window.KT80EGSession.request(
      ENDPOINT.replace('/stage4-proposal','/kt134-evidence-span'),
      JSON.stringify({task:'read_case_evidence_span',caseId:request.caseId,
       evidenceRevision:request.evidenceRevision,requestId:crypto.randomUUID(),chunk}),
      firstPassword);
     if(resp.ok)result=await resp.json();
    }catch{}
    if(!result||result.caseId!==request.caseId||
       String(result.evidenceRevision)!==String(request.evidenceRevision)||
       result.chunk?.source!==chunk.source||result.chunk?.start!==chunk.start||
       result.chunk?.end!==chunk.end){allResponses=false;continue}
    receipts.push(verifyEvidenceDigest(chunk,result));
   }
   const coverage=evidenceCoverage(batch,receipts);
   const claims=coverage.claims.map(x=>({source:x.source,documentIndex:x.documentIndex,
     start:x.start,end:x.end,quote:x.quote,summary:x.summary,expertConfirmed:false}));
   const ledgerFits=new TextEncoder().encode(JSON.stringify(claims)).length<=26000;
   request.completeCaseEvidence.kt134DossierCoverage={
    complete:coverage.complete&&allResponses&&ledgerFits&&batch.totalDocuments>0&&batch.totalDocuments>=declaredCount,
    declaredDocuments:declaredCount,readableDocuments:batch.totalDocuments,
    expectedChunks:coverage.expectedChunks,examinedChunks:coverage.examinedChunks,
    unreadableDocuments:coverage.unreadableDocuments,unexamined:coverage.unexamined,
    sourceAnchoredClaims:ledgerFits?claims:[],allClaimEvidenceIncluded:ledgerFits,
    digestOverflow:!ledgerFits,generatedOnlyForCurrentCase:true};
   if(!coverage.complete||!allResponses||!ledgerFits||batch.totalDocuments===0||batch.totalDocuments<declaredCount){
    status.textContent='Не всички документи са прочетени. EG Авторът и рецензентът ще предложат мотивирано следващо действие с ясно посочени доказателствени ограничения.';
    request.completeCaseEvidence.kt134DossierCoverage.complete=false;
    request.completeCaseEvidence.kt134DossierCoverage.coverageWarning='НЕПЪЛЕН ПРОЧИТ — НЕ УДОСТОВЕРЯВАЙ ПЪЛНОТА И НЕ ИЗМИСЛЯЙ ФАКТИ; ВИНАГИ ПРЕДЛОЖИ ДЕЙСТВИЕ.';
   }
   const prepared=fitStage4Request(request);
   if(!prepared.payload){
    status.textContent='Доказателственият пакет е твърде голям и не може да бъде изпратен безопасно. Размер: '+prepared.bytes+' байта.';
    return;
   }
   const response=await window.KT80EGSession.request(ENDPOINT,prepared.payload,firstPassword);
   const data=await response.json().catch(()=>({}));
   if(ticket!==serial||pendingSignature!==caseIdentity().signature)return;
   if(response.status===401||response.status===403){status.textContent='Достъпът до EG Автора е отказан. Паролата за тази сесия е изчистена.';return;}
   if(!response.ok){
    const findings=Array.isArray(data.reviewFindings)?data.reviewFindings.slice(0,5).map(x=>str(x)).filter(Boolean):[];
    const labels={
      MISSING_OR_UNORDERED_SECTIONS:'Непълни или разместени задължителни раздели',
      INCORRECT_COMPATIBILITY_TERMINOLOGY:'Неточна терминология за оценката за съвместимост',
      CONFUSED_ZOOS_AND_EIA_ANNEX_2:'Смесени приложения към ЗООС и Наредбата за ОВОС',
      UNJUSTIFIED_BROAD_DOCUMENT_REQUEST:'Необосновано искане за допълнителни документи',
      MISCHARACTERIZED_OS_ART_2_2_AS_SCREENING:'Неточна правна характеристика на чл. 2, ал. 2 от Наредбата за ОС',
      INDEPENDENT_REJECTION:'Независимият преглед не приема правните мотиви',
      REVIEW_REVISION_INVALID:'Поправеният проект не премина нормативния контрол',
      EIA_DECISION_WITHOUT_ESTABLISHED_SCREENING_JURISDICTION:'Необосновано решение по ОВОС без установена приложимост',
      EIA_SCREENING_PROPOSED_BEFORE_LEGAL_CLASSIFICATION:'Предложена е преценка по ОВОС преди установяване на приложима категория',
      LEGAL_CLASSIFICATION_SHIFTED_TO_APPLICANT:'Правната квалификация е прехвърлена към възложителя',
      EIA_TERMINATION_MISATTRIBUTED_TO_ART_93_6:'Неправилно позоваване на чл. 93, ал. 6 ЗООС',
      EIA_NO_IMPACT_DATA_USED_AS_SCREENING_DECISION:'Недоказано отсъствие на въздействие е използвано като основание за решение',
      UNKNOWN_ADMINISTRATIVE_PANEL:'Избран е номер извън утвърдените 22 административни панела',
      ADMIN_PANEL_02_LABEL_MISMATCH:'Несъответствие между номера и наименованието на панела',
      PANEL_02_MISSING_EVIDENCED_FACT_GAP:'Не е обоснована конкретна липсваща фактическа информация за панел 02',
      PANEL_02_SHIFTS_LEGAL_CLASSIFICATION:'Панел 02 неправомерно възлага правната квалификация на възложителя',
      INTERNAL_GIS_TRANSPORT_TOKEN_IN_DRAFT:'Останало е вътрешно техническо обозначение от ГИС',
      MISSING_LEGAL_CATEGORY_DOCUMENT_TREATED_AS_FACT:'Липсата на документ за правна категория е третирана като липсващ факт',
      MISSING_REASONED_LEGAL_COMPARISON:'Липсва пълната обоснована съпоставка на четирите нормативни хипотези',
      LEGAL_COMPARISON_AFTER_PANEL_SELECTION:'Нормативната съпоставка е поставена след избора на панел',
      PANEL_01_NOT_SUPPORTED_BY_NEGATIVE_CLASSIFICATION:'Панел 01 не е обоснован с доказано отрицателни хипотези и приложимост на чл. 2, ал. 2',
      UNDETERMINED_WITHOUT_DECISIVE_FACT:'Неопределен резултат без посочен конкретен липсващ решаващ факт',

       UNDETERMINED_BASED_ON_LEGAL_CLASSIFICATION_GAP:'Правна квалификация е представена неправилно като липсващ физически факт',
       UNSPECIFIED_AREA_TYPE_IN_EVIDENCE_GAP:'Не е разграничена площта на имота от площта на сградата или застрояването',
       DRAFT_SELF_CERTIFICATION_NOT_EVIDENCE:'Заключението съдържа самооценка вместо доказателствени мотиви',
       INTERNAL_TEST_REFERENCES_IN_EXPERT_DRAFT:'В нормативния проект са останали вътрешни технически препратки',
       UNSUPPORTED_AUTHOR_SELF_ASSESSMENT:'Авторска самооценка не доказва законосъобразност',
       SELF_CERTIFICATION_CONTRADICTS_UNDETERMINED_MATRIX:'Самооценка противоречи на неопределен нормативен резултат',
      NEGATIVE_CONCLUSION_FROM_MISSING_CLASSIFICATION:'Отрицателният извод е изведен единствено от липса на правна категория',
      EMPTY_OR_EXCESSIVE_DRAFT:'Проектът е празен или надхвърля допустимия обем',
      MISSING_OR_UNORDERED_SECTIONS:'Липсващ или разместен задължителен раздел',
      REVIEW_UNAVAILABLE:'Независимият нормативен преглед не е достъпен',
      REVIEW_UNREADABLE:'Независимият преглед не върна валиден резултат',
      INVALID_REVIEW:'Невалиден резултат от независимия преглед',
      QUALIFICATION_REQUIRES_FOUR_TESTS:'Липсва пълната структурирана нормативна съпоставка',
      QUALIFICATION_TEST_KEY_DUPLICATE_OR_UNKNOWN:'Повторена или непозната нормативна предпоставка',
      QUALIFICATION_STATUS_INVALID:'Невалиден нормативен резултат',
      UNVERIFIED_LEGAL_QUOTE:'Посоченият правен цитат не е намерен в нормативния MASTER',
      UNVERIFIED_CASE_QUOTE:'Посоченото фактическо твърдение не е намерено във входния документ',
      MISSING_LEGAL_CRITERION:'Липсва конкретен законов критерий',
      INSUFFICIENT_REASON:'Недостатъчно индивидуализирани нормативни мотиви',
      NEGATIVE_ANNEX_WITHOUT_CATEGORY_REVIEW:'Отрицателният извод не съдържа съпоставка с конкретни категории',
      WRONG_ANNEX_REFERENCE:'Неточно нормативно основание за приложението към ЗООС',
      WRONG_OS_ARTICLE:'Неточно основание по Наредбата за ОС',
      MISSING_QUALIFICATION_TEST:'Липсва една от задължителните нормативни проверки',
      MISSING_ROUTE_REASON:'Липсват мотиви за предложеното административно действие',
      PANEL_01_CONTRADICTS_LEGAL_FACTS:'Предложението за панел №01 противоречи на нормативните предпоставки',
      PANEL_02_REQUIRES_EVIDENCED_PHYSICAL_GAP:'Панел №02 изисква доказана конкретна фактическа липса',
      OS_ART2_MUTUALLY_EXCLUSIVE:'Несъвместима едновременна приложимост на чл. 2, ал. 1 и 2',
      OS_ART2_PREMATURE_EXCLUSION:'Ал. 2 е посочена като приложима преди изясняване на ал. 1',
      UNKNOWN_QUALIFICATION_ROUTE:'Избраният панел липсва в утвърдения каталог',
      ARCHIVE_FULL_TEXT_UNAVAILABLE:'Пълните нормативни текстове не са налични'
    };
    // KT124-R3: translate technical validator diagnostics into one plain
    // Bulgarian explanation per substantive issue. Codes remain in server
    // records; never show them or duplicate synonymous errors to experts.
    const explainIssue=value=>{
      const code=str(value).split(':')[0];
      if(['PANEL_01_NOT_SUPPORTED_BY_NEGATIVE_CLASSIFICATION','PANEL_01_CONTRADICTS_LEGAL_FACTS'].includes(code))
        return 'Предложеното писмо по чл. 2, ал. 2 от Наредбата за ОС още не е достатъчно обосновано. Трябва да се установи защо предложението не попада в относимите категории по ЗООС и защо е приложима именно тази разпоредба.';
      if(['REVIEW_UNAVAILABLE','REVIEW_UNREADABLE','INVALID_REVIEW'].includes(code))
        return 'Независимият рецензент не е завършил проверката. Предложението остава работен проект.';
      if(code==='INDEPENDENT_REJECTION')
        return 'Рецензентът е установил съществени несъответствия в предложението, които не са отстранени.';
      if(code==='REVIEW_REVISION_INVALID')
        return 'Коригираната версия все още съдържа неизяснени правни или фактически основания.';
      if(code==='MISSING_OR_UNORDERED_SECTIONS')
        return 'В предложението липсва задължителна част от анализа или разделите не са подредени правилно.';
      if(code==='UNDETERMINED_WITHOUT_DECISIVE_FACT'||code==='ALL_APPLICABILITY_TESTS_UNDETERMINED')
        return 'Не е изяснена приложимостта на нормативните основания. Не е посочен конкретен липсващ факт, който да възпрепятства тази преценка.';
      if(code==='UNVERIFIED_LEGAL_QUOTE'||code==='WRONG_ANNEX_REFERENCE'||code==='WRONG_OS_ARTICLE')
        return 'Посоченото правно основание или цитат се нуждае от сверяване с точния текст на нормативния акт.';
      if(code==='UNVERIFIED_CASE_QUOTE')
        return 'Част от фактическите твърдения не са потвърдени от документите в преписката.';
      if(code==='QUALIFICATION_REQUIRES_FOUR_TESTS'||code==='MISSING_QUALIFICATION_TEST')
        return 'Нормативната съпоставка е непълна: необходимо е да се разгледат двете приложения към ЗООС и двете хипотези на чл. 2 от Наредбата за ОС.';
      return labels[code]||'Има неизяснено основание, което изисква допълнителна проверка преди експертното потвърждение.';
    };
    const issues=[...new Set((Array.isArray(data.qualityIssues)?data.qualityIssues:[]).map(explainIssue))].slice(0,6);
    const checkPhase=data.qualityStage==='source_qualification'?' (проверка на доказателствените основания преди изготвяне на текста)':data.qualityStage==='author_repair'?' (след автоматичната преработка)':data.qualityStage==='independent_review'?' (независим нормативен преглед)':'';
    // KT115: show an unverified AI draft ONLY as expert-readable material.
    // The case-bound response is not cached, approved or exposed to Stage 5.
    if(response.status===422 && data.expertPreviewOnly===true &&
       data.qualityPassed===false && data.handoffAllowed===false &&
       data.projectOnly===true && data.expertReviewRequired===true &&
       data.caseId===identity.caseId && data.requestId===requestId &&
       data.evidenceRevision===h.evidenceRevision &&
       str(data.unverifiedDraft).length>=120){
      finishedSignature='';lastResult=null;
      const warnings=issues.length?issues.join('; '):'Нормативната проверка не е премината.';
      lead.textContent='ПРОЕКТ ЗА ЕКСПЕРТЕН ПРЕГЛЕД — НЕПРОВЕРЕН\nНе представлява административно решение. Няма автоматично предаване към Етап 5.';
      lead.style.display='block';
      expanded.style.display='block';expanded.open=true;
      output.textContent='КОНСТАТИРАНИ ПРОБЛЕМИ:\n'+warnings+
       (findings.length?'\nСтановище на рецензента: '+findings.join('; '):'')+
       '\n\nРЕЦЕНЗИРАНО ПРЕДЛОЖЕНИЕ / РАБОТЕН ПРОЕКТ (ЗА ЕКСПЕРТЕН ПРЕГЛЕД):\n\n'+str(data.unverifiedDraft);
      output.style.display='block';
      status.textContent=(data.reviewed?'AI рецензентът представи коригирано предложение. ':'EG Авторът представи работен проект. ')+'Нормативните проблеми остават видими; проектът не е допуснат автоматично до Етап 5.';
      document.dispatchEvent(new CustomEvent('kt115:stage4-draft',{detail:{
       caseId:identity.caseId,evidenceRevision:h.evidenceRevision,requestId,
       sourceDraft:str(data.unverifiedDraft),warnings:issues,qualityPassed:false,reviewed:data.reviewed===true,
        reviewerVerdict:data.reviewVerdict||(data.qualityStage==="independent_review"?"reject":"not_completed"),
        reviewerFindings:Array.isArray(data.reviewFindings)?data.reviewFindings:[],
       originalCaseSignature:identity.signature,caseIdType:identity.caseIdType
      }}));
      button.textContent='Преработи проект с EG Автора';
      return;
    }

    if(response.status===422 && data.caseId===identity.caseId&&data.evidenceRevision===h.evidenceRevision&&data.requestId===requestId){
     document.dispatchEvent(new CustomEvent('kt124:stage4-attempt',{detail:{
      caseId:identity.caseId,evidenceRevision:h.evidenceRevision,requestId,
      sourceDraft:str(data.unverifiedDraft),warnings:issues,
      reviewerVerdict:data.reviewVerdict||(data.qualityStage==="independent_review"?"reject":"not_completed"),
      reviewerFindings:Array.isArray(data.reviewFindings)?data.reviewFindings:[],
      qualityStage:data.qualityStage,caseIdType:identity.caseIdType
     }}));
    }
    // A server-side legal rejection cannot be solved by a visual refresh.
    const needsWorkerRepair=Array.isArray(data.qualityIssues)&&data.qualityIssues.some(x=>
     x==='MISSING_REASONED_LEGAL_COMPARISON'||x==='ADMIN_PANEL_02_LABEL_MISMATCH');
    const repairNote=data.qualityStage==='source_qualification'?
      ' Проверка на нормативния и фактическия източник преди изготвяне на текста; не е проблем с публикуването на сървъра.':
      needsWorkerRepair?' За този отказ няма достъпен работен проект; необходима е корекция на защитения EG Worker.':'';
    status.textContent=response.status===413?
      'Преписката надхвърля допустимия технически обем на заявката.':
      response.status===422?
      'Проектът не премина нормативната проверка'+checkPhase+(issues.length?': '+issues.join('; '):'.')+
      (findings.length?' Констатации: '+findings.join('; '):'')+
      '. Не се показва непроверен текст.'+repairNote:
      'EG Авторът не изготви проект (код '+response.status+'). Проверете връзката или възложете повторно.';
    return;
   }
   if(data.caseId!==identity.caseId||data.evidenceRevision!==h.evidenceRevision||data.requestId!==requestId){
    status.textContent='Отхвърлен е AI отговор без потвърдена идентичност на преписката, заявката и редакцията.';return;
   }
   if(data.projectOnly!==true||data.expertReviewRequired!==true||!str(data.draft)){
    status.textContent='Отхвърлен е AI отговор без обозначение „проект за експертен преглед“ или без съдържание.';return;
   }
   finishedSignature=identity.signature;lastResult=Object.freeze({
    caseId:identity.caseId,localCycleId:h.caseId,evidenceRevision:h.evidenceRevision,
    requestId,draft:data.draft,projectOnly:true,expertApproved:false,
    providerArchiveEvidenceVerified:data.archiveEvidenceVerified===true
   });
   window.KT134EvidenceLedger=Object.freeze({
    caseId:identity.caseId,evidenceRevision:h.evidenceRevision,
    coverageComplete:data.evidenceReceipt?.dossierAllSourceSpansExamined===true,
    expectedChunks:Number(data.evidenceReceipt?.sourceSpansExpected)||0,
    examinedChunks:Number(data.evidenceReceipt?.sourceSpansExamined)||0,
    sourceAnchoredClaims:Object.freeze([...request.completeCaseEvidence.kt134DossierCoverage.sourceAnchoredClaims])
   });
   const receipt=data.evidenceReceipt||{};
   const dossierCount=Number(receipt.documentTextsReceived)||0;
   const coverageText='Прочит на документи: '+(receipt.dossierAllSourceSpansExamined===true?'пълно покритие':'непълно покритие')+' ('+(Number(receipt.sourceSpansExamined)||0)+' / '+(Number(receipt.sourceSpansExpected)||0)+' части). ';
   const availableCount=Number(receipt.documentTextsAvailable)||0;
   const sourceInfo=coverageText+'Входни данни: '+dossierCount+' от '+availableCount+
     ' документа с извлечен текст; '+(Number(receipt.caseFactsReceived)||0)+
     ' доказателствени позиции; ГИС: '+(receipt.gisContextReceived?'предаден':'липсва')+
     '; нормативни препратки: '+(Number(receipt.archiveIndexRecordsReceived)||0)+
     '; проверени извлечения V11: '+(Number(receipt.archiveVerifiedExcerptsReceived)||0)+
     '; пълни текстове на разпоредби: '+(Number(receipt.archiveArticleTextsReceived)||0)+'.'+
     (receipt.documentTextTruncated?' Част от документалния текст е съкратена по технически лимит.':'');
   const body=str(data.draft);
   // KT110: remove only presentation artifacts; preserve substantive legal text.
   const legalDisplay=body.replace(/\bspatial_intersection\s*=\s*(?:false|true)\b/giu,
      m=>/false/iu.test(m)?'няма доказано геометрично пресичане':'данни за геометрично пресичане')
    .replace(/^\s*---+\s*$/gmu,'').replace(/\n{3,}/g,'\n\n').trim();
   const heading=/ВОДЕЩО\s+ПРЕДЛОЖЕНИЕ\s*[:：-]?/iu.exec(legalDisplay);
   const comparisonText=heading?legalDisplay.slice(0,heading.index).trim():'';
   const afterLead=heading?legalDisplay.slice(heading.index+heading[0].length):'';
   const nextSection=afterLead.search(/Фактическа\s+основа/iu);
   const leadingDraft=nextSection>=0?afterLead.slice(0,nextSection).trim():afterLead.slice(0,1100).trim();
   const detailedText=nextSection>=0?afterLead.slice(nextSection).trim():legalDisplay;
   lead.textContent=leadingDraft?
    'ВОДЕЩО ПРЕДЛОЖЕНИЕ — ПРОЕКТ ЗА ЕКСПЕРТНА ПРОВЕРКА'+String.fromCharCode(10)+leadingDraft:
    'Не е отделено самостоятелно водещо предложение. Вижте пълния текст по-долу.';
   lead.style.display='block';
   expanded.open=!leadingDraft;expanded.style.display='block';
   output.textContent=sourceInfo+String.fromCharCode(10,10)+
    (comparisonText?'НОРМАТИВНА СЪПОСТАВКА ПРЕДИ ИЗБОРА НА ПАНЕЛ'+String.fromCharCode(10)+comparisonText+String.fromCharCode(10,10):'')+
    detailedText;output.style.display='block';
   const audit=data.normativeAudit||{};
   const reviewInfo=audit.reviewed===true?
    (audit.reviewVerdict==='revise'?'Поправен след вторичен независим нормативен преглед. ':'Преминал вторичен независим преглед за логическа съгласуваност. '):
    'Независим нормативен преглед не е удостоверен. ';
   status.textContent=reviewInfo+(audit.fullArticlesVerified===true?'Относимите пълни нормативни текстове от MASTER V11 са предоставени. Правната приложимост подлежи на експертно потвърждение.':'Пълните нормативни текстове не са удостоверени като използвани; необходима е експертна проверка.');
   document.dispatchEvent(new CustomEvent('kt115:stage4-draft',{detail:{
    caseId:identity.caseId,evidenceRevision:h.evidenceRevision,requestId,
    sourceDraft:str(data.draft),warnings:[],qualityPassed:true,
     reviewerVerdict:audit.reviewVerdict||"not_completed",
     reviewerFindings:Array.isArray(audit.findings)?audit.findings:[],
    qualificationRecord:data.qualificationRecord||null,qualificationProof:data.qualificationProof||null,qualificationGate:data.qualificationGate||null,
    originalCaseSignature:identity.signature,caseIdType:identity.caseIdType
   }}));
   button.textContent='Преработи проект с EG Автора';
  }catch(err){
   if(ticket===serial)status.textContent='Няма потвърден отговор от EG Автора: '+(String(err?.message||err)==='Failed to fetch'?
    'мрежова грешка или липсващ достъпен сървърен маршрут.':'връзката с услугата не е установена.')+' Не е заместен с алгоритмичен текст.';
  }finally{
   if(activityTicket!==undefined)window.KT80Busy?.finish?.(activityTicket);
   if(ticket===serial){button.disabled=false;pendingSignature='';}
  }
 }
 button.addEventListener('click',()=>generate());
 form.addEventListener('submit',e=>{e.preventDefault();const p=password.value;password.value='';dialog.close();generate(p)});
 document.addEventListener('kt80:stage-open',e=>{if(e.detail?.step===4)showEstablishedEvidence()});
 ['kt80:case-reset','kt80:case-change','kt82:evidence-invalidated'].forEach(e=>document.addEventListener(e,clear));
 window.KT96EGStage4=Object.freeze({refresh:()=>generate(),snapshot:()=>finishedSignature===caseIdentity().signature?lastResult:null,
  getStatus:()=>status.textContent});
 // KT105: on entry only present established evidence and one explicit author button.
 showEstablishedEvidence();
 return true;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1500),{once:true});
else setTimeout(boot,1500);
