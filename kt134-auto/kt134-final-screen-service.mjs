/**
 * KT134 final-screen handoff. The Word file and shown paragraphs are bound
 * to one version of a protected proposal before any expert confirm action.
 * The host owns authorization, revision and atomic persistence; no browser
 * can turn a synthetic preview into an approved document.
 */
const val=x=>String(x??'').trim();
const check=(condition,message)=>{if(!condition)throw Error(message)};
export function createAutoFinalScreenService({
 verifySession,authorizeCase,loadCaseRevision,processor,verifyWord,saveDraft,audit
}={}){
 for(const [name,fn] of Object.entries({
  verifySession,authorizeCase,loadCaseRevision,saveDraft,audit
 }))check(typeof fn==='function','Липсва защитен порт: '+name);
 check(typeof processor?.run==='function','Липсва автоматичен обработчик');
 check(typeof verifyWord?.bind==='function','Липсва проверка на DOCX');
 return Object.freeze({async prepare({session,caseId,proposalVersion}){
  check(session?.active===true&&val(session.userId)&&val(caseId)&&val(proposalVersion),
   'Липсва активна сесия или версия на преписката');
  const who=await verifySession();
  check(who?.active===true&&who.userId===session.userId,'Липсва потвърден експерт');
  check(await authorizeCase({userId:who.userId,caseId,action:'case.edit'}),
   'Няма права върху преписката');
  const firstRevision=await loadCaseRevision({caseId,userId:who.userId});
  check(Number.isSafeInteger(firstRevision),'Невалидна ревизия на преписката');
  const result=await processor.run({session,caseId});
  check(result?.proposal?.caseId===caseId,'Анализът върна друга преписка');
  check(result.proposal.dossierVersion===String(firstRevision),
   'Преписката е променена по време на подготовката');
  check(result.proposal.expertConfirmed===false,'Недопустимо междинно експертно потвърждение');
  if(result.wordError||!(result.wordDraft instanceof Uint8Array))
   throw Error('Липсва готов Word проект; автоматичният резултат не е пълен');
  const presentation=await verifyWord.bind({caseId,proposalVersion,
   proposal:result.proposal,wordBytes:result.wordDraft});
  check(presentation.wordReady===true&&presentation.expertConfirmed===false,
   'Неуспешно свързване на документа и прегледа');
  const secondRevision=await loadCaseRevision({caseId,userId:who.userId});
  check(secondRevision===firstRevision,'Преписката е променена преди записването');
  // Host MUST atomically bind case revision and proposal version, store the
  // exact bytes, and publish no approval as a side effect.
  const saved=await saveDraft({caseId,caseRevision:firstRevision,
   proposalVersion,userId:who.userId,proposal:result.proposal,
   wordBytes:result.wordDraft,presentation});
  check(saved?.ok===true&&saved.caseId===caseId&&
   saved.caseRevision===firstRevision&&saved.proposalVersion===proposalVersion&&
   saved.bindingSha256===presentation.bindingSha256,
   'Сървърът не потвърди точната версия на Word проекта');
  await audit({caseId,userId:who.userId,proposalVersion,
   event:'auto_final_screen_prepared',bindingSha256:presentation.bindingSha256});
  return Object.freeze({
   caseId,proposalVersion,internalNumber:result.proposal.internalNumber,
   incomingNumber:result.proposal.incomingNumber,
   procedure:result.proposal.procedure,justification:result.proposal.justification,
   leadDocumentId:result.proposal.leadingDocumentId,
   proposedPanel:result.proposal.proposedPanel,
   reviewerStatus:result.proposal.reviewerStatus,
   reviewNotes:result.proposal.reviewNotes,uncertainties:result.proposal.uncertainties,
   wordReady:true,previewParagraphs:presentation.previewParagraphs,
   bindingSha256:presentation.bindingSha256,expertConfirmed:false,
   availableActions:Object.freeze(['confirm','edit','manual_from_stage1'])
  });
 }});
}
