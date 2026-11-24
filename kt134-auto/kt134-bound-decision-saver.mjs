/**
 * KT134 guarded final decision save adapter.
 * Requires an actual KT125 host-provided atomicCommit, NOT a browser request.
 * Host must implement in-transaction ACL/session/case revision/hash checks.
 * This module is fail-closed and ISOLATED (no live Worker).
 */
const sha=/^[a-f0-9]{64}$/;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createKT134BoundDecisionSaver({atomicCommit}={}){
 if(typeof atomicCommit!=='function')throw Error('Липсва KT125 атомарен запис');
 return Object.freeze({async saveDecision({
  caseId,expectedVersion,expectedCaseRevision,expectedWordSha256,
  expectedBindingSha256,record
 }={}){
  if(!uuid.test(caseId||'')||typeof expectedVersion!=='string'||!expectedVersion.trim()||
   !Number.isSafeInteger(expectedCaseRevision)||expectedCaseRevision<0||
   !sha.test(expectedWordSha256||'')||!sha.test(expectedBindingSha256||'')||
   record?.action!=='confirm'||record?.expertConfirmed!==true||
   record?.caseId!==caseId||record?.proposalVersion!==expectedVersion||
   record?.caseRevision!==expectedCaseRevision||
   record?.wordSha256!==expectedWordSha256||
   record?.bindingSha256!==expectedBindingSha256||
   typeof record.userId!=='string'||!record.userId.trim())
   throw Error('Окончателното решение не е обвързано с архивирания Word');
  // No authorization asserted here: atomicCommit MUST independently re-read
  // authoritative KT125 local session, ACL, case state and D1 hash conditions.
  const saved=await atomicCommit(Object.freeze({
   caseId,proposalVersion:expectedVersion,caseRevision:expectedCaseRevision,
   wordSha256:expectedWordSha256,bindingSha256:expectedBindingSha256,
   userId:record.userId,action:'case.confirm'
  }));
  if(saved?.ok!==true||saved.caseId!==caseId||
   saved.previousVersion!==expectedVersion||
   typeof saved.version!=='string'||!saved.version.trim()||
   saved.atomic!==true||saved.updatedRows!==1)
   throw Error('Защитеният KT125 сървър не потвърди атомарно решение');
  return Object.freeze({ok:true,caseId,previousVersion:expectedVersion,
   version:saved.version});
 }});
}
