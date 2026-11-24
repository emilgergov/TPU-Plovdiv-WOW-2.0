// KT134 isolated prototype. No imports from, or mutations of, KT133.
// This module evaluates administrative relevance; it never grants expert approval.
const clean = v => String(v ?? '').trim().slice(0, 10000);
const distinct = items => [...new Set(items)];
const types = Object.freeze(['complaint','objection','appeal','notification','supplement','authority_response','decision','request','unknown']);
const labels = Object.freeze({
 complaint:'жалба', objection:'възражение', appeal:'обжалване',
 notification:'уведомление', supplement:'допълнение',
 authority_response:'писмо на органа', decision:'административен акт',
 request:'искане', unknown:'неустановен вид'
});
function buildCaseContext(raw){
 if (!raw || typeof raw !== 'object') throw new TypeError('Липсва преписка');
 const caseId=clean(raw.caseId);
 if (!caseId) throw new Error('Липсва вътрешен ИД на преписката');
 if (!Array.isArray(raw.documents) || raw.documents.length===0) throw new Error('Липсват документи');
 const ids=new Set();
 const documents=raw.documents.map((d,i)=>{
  const fileId=clean(d.fileId||d.file||d.name);
  if (!fileId || ids.has(fileId)) throw new Error('Нееднозначен идентификатор на документ');
  ids.add(fileId);
  const kind=types.includes(d.kind)?d.kind:'unknown';
  const evidenceRefs=Array.isArray(d.evidenceRefs)?distinct(d.evidenceRefs.map(clean).filter(Boolean)):[];
  return Object.freeze({
   fileId, kind, label:labels[kind], date:clean(d.date),
   sourceText:clean(d.sourceText), statedRequest:clean(d.statedRequest),
   evidenceRefs:Object.freeze(evidenceRefs), documentIndex:i,
   isIncoming:d.isIncoming===true, explicitlyCurrent:d.explicitlyCurrent===true
  });
 });
 return Object.freeze({caseId,incomingNumber:clean(raw.incomingNumber),
  dossierVersion:clean(raw.dossierVersion),documents:Object.freeze(documents),
  status:'automatic_unconfirmed'});
}
// Ranking is a navigation aid, NEVER a substitute for semantic assessment.
// In particular the most recent file, biggest file, and first upload have no automatic priority.
function assessLeadDocument(context, assessments){
 if (!context?.caseId || !Array.isArray(context.documents)) throw new Error('Невалиден контекст');
 if (!Array.isArray(assessments)) throw new Error('Липсва анализ на актуалното искане');
 const byId=new Map(context.documents.map(d=>[d.fileId,d]));
 const seen=new Set();
 const candidates=assessments.map(a=>{
  const fileId=clean(a.fileId),doc=byId.get(fileId);
  if (!doc||seen.has(fileId)) throw new Error('Неизвестен или повторен кандидат');
  seen.add(fileId);
  const currentRequest=clean(a.currentAdministrativeRequest);
  const rationale=clean(a.rationale);
  const refs=Array.isArray(a.sourceRefs)?distinct(a.sourceRefs.map(clean).filter(Boolean)):[];
  const isSupported=Boolean(currentRequest&&rationale&&refs.length);
  return Object.freeze({fileId,kind:doc.kind,currentAdministrativeRequest:currentRequest,
   rationale,sourceRefs:Object.freeze(refs),supported:isSupported,
   relevant:a.relevant===true,uncertainties:Object.freeze((Array.isArray(a.uncertainties)?a.uncertainties:[]).map(clean).filter(Boolean))});
 });
 const relevant=candidates.filter(c=>c.relevant);
 // Always propose the best available specific candidate; never silently claim it is proven.
 const supported=relevant.filter(c=>c.supported);
 const primary=supported[0]||relevant[0]||candidates[0]||null;
 const issues=[];
 if (!primary) issues.push('Липсва оценен документ — необходим е анализ на преписката');
 else if (!primary.supported) issues.push('Водещият документ няма достатъчно доказателствена обосновка');
 if (relevant.length>1) issues.push('Има конкуриращи се актуални искания');
 if (context.documents.length>candidates.length) issues.push('Не са оценени всички документи');
 return Object.freeze({
  caseId:context.caseId,selectedFileId:primary?.fileId||null,
  currentAdministrativeRequest:primary?.currentAdministrativeRequest||'',
  rationale:primary?.rationale||'',sourceRefs:primary?.sourceRefs||Object.freeze([]),
  alternatives:Object.freeze(candidates.filter(c=>c.fileId!==primary?.fileId)),
  issues:Object.freeze(issues),status:'automatic_proposal',expertConfirmed:false,
  reviewerStatus:'not_reviewed'
 });
}
function addReviewerAssessment(proposal,review){
 if (proposal?.status!=='automatic_proposal') throw new Error('Няма работно предложение');
 const notes=Array.isArray(review?.improvements)?review.improvements.map(clean).filter(Boolean):[];
 const concerns=Array.isArray(review?.concerns)?review.concerns.map(clean).filter(Boolean):[];
 const verdict=review?.agrees===true?'internally_validated':concerns.length?'proposal_with_concerns':'reviewed_with_suggestions';
 return Object.freeze({...proposal,
  reviewerStatus:verdict,
  reviewerImprovements:Object.freeze(notes),reviewerConcerns:Object.freeze(concerns),
  // Review improves the proposal; neither disagreement nor absence of review is a veto.
  status:'automatic_proposal',expertConfirmed:false
 });
}
function finalOutputContract(input){
 if (!input?.caseId || !input?.proposal || !input?.draftText)
  throw new Error('Липсва преписка, процедура или проект на документ');
 return Object.freeze({caseId:clean(input.caseId),
  procedure:clean(input.proposal),justification:clean(input.justification),
  documentDraft:clean(input.draftText),
  template:'РИОСВ – Пловдив',wordStatus:'draft_not_approved',
  proposedPanel:Number.isInteger(input.panelId)?input.panelId:null,
  expertConfirmed:false,
  expertActions:Object.freeze(['confirm','edit','manual_from_stage1'])});
}
export {buildCaseContext,assessLeadDocument,addReviewerAssessment,finalOutputContract};
