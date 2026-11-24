/**
 * KT134 isolated atomic decision adapter — TEST ACL schema ONLY.
 * A single D1 UPDATE guards case revision, exact preview fingerprint,
 * pending status and a test-only ACL membership. NOT a live KT125 ACL adapter.
 * Actual KT125 must replace the ACL EXISTS with its authoritative server ACL
 * *within the same atomic statement*, or an equivalent serialized transaction.
 */
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hash=/^[a-f0-9]{64}$/;
export const TEST_ATOMIC_APPROVAL_SQL=`
UPDATE kt134_auto_drafts SET status='approved',approved_at_ms=?
WHERE case_id=? AND proposal_version=? AND case_revision=?
 AND binding_sha256=? AND word_sha256=? AND status='awaiting_expert'
 AND EXISTS (SELECT 1 FROM kt126_registry r
             WHERE r.case_id=kt134_auto_drafts.case_id AND r.revision=?)
 AND EXISTS (SELECT 1 FROM kt134_test_approval_acl a
             WHERE a.case_id=kt134_auto_drafts.case_id
             AND a.user_id=? AND a.active=1 AND a.can_confirm=1)
`;
export function createKT134TestAtomicApproval({db,now=()=>Date.now()}={}){
 if(typeof db?.prepare!=='function')throw Error('Липсва D1 за атомарно одобрение');
 return Object.freeze({async approve({caseId,proposalVersion,caseRevision,bindingSha256,wordSha256,userId}={}){
  if(!uuid.test(caseId||'')||typeof proposalVersion!=='string'||!proposalVersion.trim()||
   !Number.isSafeInteger(caseRevision)||caseRevision<0||
   !hash.test(bindingSha256||'')||!hash.test(wordSha256||'')||typeof userId!=='string'||!userId.trim())
   throw Error('Невалидни данни за окончателно одобрение');
  const time=now();
  if(!Number.isSafeInteger(time)||time<=0)throw Error('Невалидно време на решението');
  const result=await db.prepare(TEST_ATOMIC_APPROVAL_SQL).bind(
   time,caseId,proposalVersion,caseRevision,bindingSha256,wordSha256,caseRevision,userId
  ).run();
  if(result?.meta?.changes!==1)
   throw Error('Отказ: промяна на преписка, документ, права или вече одобрен проект');
  return Object.freeze({ok:true,caseId,previousVersion:proposalVersion,
   version:'expert-approved:'+proposalVersion,expertConfirmed:true});
 }});
}
