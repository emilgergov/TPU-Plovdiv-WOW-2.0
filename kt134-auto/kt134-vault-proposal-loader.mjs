/**
 * KT134 — adapter from a real authorization-gated D1/R2 draft vault
 * to the protected proposal shape required by final expert decisions.
 * No browser input and no automatic confirmation.
 */
const hash=/^[a-f0-9]{64}$/;
const check=(v,m)=>{if(!v)throw Error(m)};
export function createKT134VaultProposalLoader({vault}={}){
 check(typeof vault?.loadDraft==='function','Липсва защитен Word архив');
 return Object.freeze({async loadProposal({caseId,userId}={}){
  check(typeof userId==='string'&&userId.trim(),'Липсва удостоверен експерт');
  check(typeof caseId==='string'&&caseId.trim(),'Липсва преписка');
  // Only an authorised, current-revision, hash-verified DOCX can become the
  // authoritative proposal. Host MUST additionally re-check ACL atomically.
  // Version selection is host-owned, never taken from the browser.
  check(typeof vault.loadCurrentDraft==='function',
   'Липсва защитен метод за актуалната версия на проекта');
  const item=await vault.loadCurrentDraft({userId,caseId,includeWord:true});
  check(item?.caseId===caseId&&item.status==='awaiting_expert',
   'Няма актуален неодобрен проект');
  check(typeof item.proposalVersion==='string'&&item.proposalVersion.trim()&&
   Number.isSafeInteger(item.caseRevision)&&item.caseRevision>=0,
   'Няма валидна версия на преписката');
  check(hash.test(item.bindingSha256||'')&&hash.test(item.wordSha256||'')&&
   item.wordBytes instanceof Uint8Array&&item.wordBytes.length>4,
   'Word проектът не е проверен');
  const p=item.proposal;
  check(p?.caseId===caseId&&p.expertConfirmed===false&&
   typeof p.documentDraft==='string'&&p.documentDraft.trim()&&
   typeof p.procedure==='string'&&p.procedure.trim()&&
   typeof p.documentTitle==='string'&&p.documentTitle.trim(),
   'Липсва мотивирано предложение');
  return Object.freeze({
   caseId,version:item.proposalVersion,caseRevision:item.caseRevision,
   status:'awaiting_final_expert_approval',expertConfirmed:false,
   wordReady:true,wordSha256:item.wordSha256,bindingSha256:item.bindingSha256,
   documentText:p.documentDraft,procedure:p.procedure,
   documentTitle:p.documentTitle,proposedPanel:p.proposedPanel??p.panelId??null
  });
 }});
}
