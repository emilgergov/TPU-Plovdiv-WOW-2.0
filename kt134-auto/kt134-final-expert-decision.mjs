// KT134 final expert authority, isolated from the approved classic stage gates.
// All authoritative state persistence is the injected protected host's responsibility.
const str=x=>String(x??'').trim();
const ensure=(yes,text)=>{if(!yes)throw Error(text)};
export function createAutoExpertDecisions({verifySession,authorizeCase,loadProposal,saveDecision,audit}){
 for(const [name,fn] of Object.entries({verifySession,authorizeCase,loadProposal,saveDecision,audit})){
  ensure(typeof fn==='function','Липсва защитена функция: '+name);
 }
 async function decide({session,caseId,proposalVersion,action,editedText}){
  ensure(session?.active===true&&str(session.userId),'Липсва активна сесия');
  ensure(str(caseId)&&str(proposalVersion),'Липсва версия на предложението');
  ensure(['confirm','edit','manual_from_stage1'].includes(action),'Непознато експертно действие');
  const verified=await verifySession();
  ensure(verified?.active===true&&str(verified.userId)===str(session.userId),'Неуспешно удостоверяване');
  ensure(await authorizeCase({userId:verified.userId,caseId}), 'Няма права върху преписката');
  // Load authoritative, case-bound proposal from protected storage, not browser state.
  const current=await loadProposal({caseId,userId:verified.userId});
  ensure(current?.caseId===caseId&&current?.version===proposalVersion,'Преписката или предложението са променени');
  ensure(current.status==='awaiting_final_expert_approval','Предложението не е достъпно за окончателно решение');
  ensure(current.expertConfirmed!==true,'Предложението вече е одобрено');
  let record;
  if(action==='manual_from_stage1'){
   record={caseId,proposalVersion,userId:verified.userId,action,
    mode:'classic',startStage:1,preserveDossier:true,preserveIds:true,
    automaticFindingsRemainUnconfirmed:true,expertConfirmed:false};
  }else if(action==='edit'){
   ensure(typeof editedText==='string'&&editedText.trim().length>0,'Липсва редактиран текст');
   record={caseId,proposalVersion,userId:verified.userId,action,
    editedText:editedText.trim(),status:'draft_revised_pending_final_approval',
    expertConfirmed:false};
  }else{
   // Final click confirms EXACT authoritative proposal version. It cannot be
   // silently updated by an AI response after user action.
   ensure(current.wordReady===true,'Липсва изготвен Word проект по одобрената бланка');
   ensure(current.documentText&&current.procedure&&current.documentTitle,
    'Липсва готово административно предложение');
   record={caseId,proposalVersion,userId:verified.userId,action,
    finalDocumentText:current.documentText,procedure:current.procedure,
    documentTitle:current.documentTitle,proposedPanel:current.proposedPanel,
    status:'expert_approved',expertConfirmed:true};
  }
  // Host must atomically compare proposalVersion and persist the expert action.
  const saved=await saveDecision({caseId,expectedVersion:proposalVersion,record});
  ensure(saved?.ok===true&&saved.caseId===caseId&&saved.previousVersion===proposalVersion,
   'Окончателното експертно действие не е записано');
  await audit({userId:verified.userId,caseId,action,proposalVersion,
    decisionVersion:saved.version});
  return Object.freeze({caseId,action,version:saved.version,
   expertConfirmed:record.expertConfirmed,
   ...(action==='manual_from_stage1'?{startStage:1,mode:'classic'}:{}),
   ...(action==='edit'?{requiresFinalApproval:true}:{})});
 }
 return Object.freeze({decide});
}
