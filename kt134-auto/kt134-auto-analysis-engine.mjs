/**
 * KT134: standalone server-side author/reviewer coordinator.
 * It is NOT the live EG service; the protected host must provide real author,
 * reviewer, spatial/legal readers, and audit implementations.
 * No intermediate expert prompts, password prompts, or expertConfirmed flags.
 */
const str=x=>String(x??'').trim();
const list=x=>Array.isArray(x)?x:[];
const unique=a=>[...new Set(a)];
const need=(c,msg)=>{if(!c)throw new Error(msg)};
const limit=(s,n=10000)=>str(s).slice(0,n);
const validFile=(d)=>str(d?.fileId);
const clone=o=>JSON.parse(JSON.stringify(o));
function normalizeEvidence(e,validFiles){
 const output=[];
 for(const raw of list(e).slice(0,100)){
  const factId=limit(raw?.factId,160),value=limit(raw?.value,1800);
  const sourceId=limit(raw?.sourceId,160),sourceLocation=limit(raw?.sourceLocation,300);
  const verification=raw?.verification==='verified'?'verified':
    raw?.verification==='partial'?'partial':'unverified';
  if(!factId||!value)continue;
  // Documentary facts must refer to a file actually present in THIS dossier.
  if(raw?.sourceType==='dossier'&&(!validFiles.has(sourceId)||!sourceLocation))continue;
  // GIS/legal facts require explicitly named, verifiable source and location.
  const factual=verification==='verified'&&sourceId&&sourceLocation;
  output.push(Object.freeze({factId,value,sourceId,sourceLocation,
   sourceType:limit(raw?.sourceType,48),verification:factual?'verified':'unverified'}));
 }
 return Object.freeze(output);
}
function normalizeAuthor(a,caseId,validFiles){
 need(a?.caseId===caseId,'EG Авторът върна чужда преписка');
 need(validFiles.has(str(a.leadingDocumentId)),'EG Авторът избра чужд водещ документ');
 need(str(a.currentRequest)&&str(a.leadRationale),'Липсва мотивиран избор на водещ документ');
 need(str(a.procedure)&&str(a.justification)&&str(a.documentDraft)&&str(a.documentTitle),
  'EG Авторът не изготви завършено предложение');
 need(str(a.documentDraft).startsWith('Относно:'),'Проектът няма задължителен ред „Относно:“');
 const panel=Number(a.panelId);
 const evidence=normalizeEvidence(a.evidence,validFiles);
 return Object.freeze({
  caseId,leadingDocumentId:str(a.leadingDocumentId),
  currentRequest:limit(a.currentRequest,1800),leadRationale:limit(a.leadRationale,3000),
  procedure:limit(a.procedure,1500),justification:limit(a.justification,15000),
  documentTitle:limit(a.documentTitle,250),documentDraft:limit(a.documentDraft,50000),
  panelId:Number.isInteger(panel)&&panel>=1&&panel<=22?panel:null,
  evidence,uncertainties:unique(list(a.uncertainties).map(x=>limit(x,600)).filter(Boolean)),
  expertConfirmed:false
 });
}
export function createAutoAnalysisEngine({author,reviewer,readSpatial,readNormative,recordAudit}={}){
 for(const [name,fn] of Object.entries({author,reviewer,readSpatial,readNormative,recordAudit}))
  need(typeof fn==='function','Липсва защитен компонент: '+name);
 return async function analyze({caseId,verifiedUserId,dossier,mode,requireExpertApproval}){
  need(mode==='automatic_proposal'&&requireExpertApproval===true,'Недопустим автоматичен режим');
  need(str(caseId)&&dossier?.caseId===caseId&&str(verifiedUserId),'Нееднозначна преписка');
  const documents=list(dossier.documents);
  need(documents.length>0&&documents.length<=50,'Невалидни документи');
  const fileIds=documents.map(validFile),validFiles=new Set(fileIds);
  need(fileIds.every(Boolean)&&validFiles.size===fileIds.length,'Повторени или неидентифицирани документи');
  // All records are evidence candidates only. A text excerpt is NOT an approved fact.
  const context=Object.freeze({caseId,dossierVersion:str(dossier.version),
   documents:clone(documents),incomingNumber:str(dossier.incomingNumber)});
  const [spatial,normative]=await Promise.allSettled([
   readSpatial({caseId,verifiedUserId,context}),
   readNormative({caseId,verifiedUserId,context})
  ]);
  const findings=Object.freeze({
   spatial:spatial.status==='fulfilled'?spatial.value:null,
   normative:normative.status==='fulfilled'?normative.value:null
  });
  const gaps=[];
  if(spatial.status!=='fulfilled')gaps.push('Пространствената справка не е потвърдена');
  if(normative.status!=='fulfilled')gaps.push('Нормативната справка не е потвърдена');
  // Author and reviewer each process ONE case; no prior case output is injected.
  const original=normalizeAuthor(await author({caseId,verifiedUserId,context,findings,
   instruction:'Create one reasoned proposal; do not invent facts; no expert confirmation'}),caseId,validFiles);
  let proposal=original,reviewerStatus='not_completed',reviewNotes=[];
  try {
   const review=await reviewer({caseId,verifiedUserId,context,findings,
    proposal:clone(original),instruction:'Review constructively; never veto or approve as expert'});
   need(review?.caseId===caseId,'Рецензентът върна чужда преписка');
   reviewerStatus=review.agrees===true?'internally_validated':
     'proposal_with_concerns';
   reviewNotes=unique([...list(review?.improvements),...list(review?.concerns)]
    .map(x=>limit(x,1500)).filter(Boolean));
   // A reviewer may suggest a revised FULL draft, but must not manufacture an
   // expert decision or silently switch the selected leading file.
   if(review.revisedDraft){
    const revised={...original,...review.revisedDraft,
     caseId,leadingDocumentId:original.leadingDocumentId,expertConfirmed:false};
    proposal=normalizeAuthor(revised,caseId,validFiles);
    reviewerStatus='reviewed_with_suggestions';
   }
  }catch(e){
   reviewerStatus='not_completed';
   reviewNotes=['Независимата рецензия не е приключила; предложението изисква експертно внимание'];
  }
  const evidence=normalizeEvidence([...list(proposal.evidence),
   ...list(findings.spatial?.evidence),...list(findings.normative?.evidence)],validFiles);
  const uncertainties=unique([
   ...proposal.uncertainties,...gaps,
   ...(evidence.length===0?['Няма приложени проверими доказателствени препратки']:[]),
   ...(evidence.some(x=>x.verification!=='verified')?['Част от сведенията остават непотвърдени']:[]),
   ...(reviewerStatus==='not_completed'?['Рецензентският контрол не е приключил']:[])
  ]);
  await recordAudit({caseId,verifiedUserId,event:'auto_case_review_completed',
   leadDocumentId:proposal.leadingDocumentId,reviewerStatus,
   verifiedEvidenceCount:evidence.filter(x=>x.verification==='verified').length,
   unresolvedCount:uncertainties.length});
  return Object.freeze({...proposal,caseId,evidence,uncertainties,
   reviewerStatus,reviewNotes,expertConfirmed:false,
   status:'automatic_proposal',sourceVersion:str(dossier.version)});
 }
}
