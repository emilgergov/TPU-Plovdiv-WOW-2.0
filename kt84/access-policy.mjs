/**
 * KT84 — server-side policy contract (NOT an authentication implementation).
 *
 * Every invocation MUST receive an identity verified server-side by the
 * authentication gateway; browser fields, usernames and case IDs are NEVER
 * trusted as authentication. This module is a pure authorization policy for
 * future protected Worker endpoints and is not imported by public GitHub Pages.
 *
 * Default deny. The administrator manages membership and grants but does not
 * obtain unrestricted access to the content of personal dossiers.
 */
const str=v=>typeof v==='string'?v.trim():'';
const A=Object.freeze({
  READ:'case.read',
  EDIT:'case.edit',
  REVIEW:'case.review',
  EXPORT:'case.export',
  SHARE:'case.share',
  ADMIN_MEMBERS:'org.members.manage',
  ADMIN_GRANTS:'org.grants.manage',
  AUDIT_READ:'org.audit.read'
});
const validRole=new Set(['expert','reviewer','administrator']);
const delegable=new Set([A.READ,A.EDIT,A.REVIEW,A.EXPORT]);
const validStatuses=new Set(['active','suspended']);
const result=(allowed,code)=>Object.freeze({allowed,code});
export const KT84_ACTIONS=A;
export function authorize({principal,caseRecord,action,grants=[],now,expectedVersion}={}){
 if(!str(principal?.subject)||!str(principal?.orgId)||!validRole.has(principal?.role)||
    principal?.verifiedByGateway!==true||!validStatuses.has(principal?.status)||
    principal.status!=='active')
  return result(false,'UNAUTHENTICATED_OR_INACTIVE');
 if(!Object.values(A).includes(action))return result(false,'UNKNOWN_ACTION');
 if(!Number.isSafeInteger(now)||now<0)return result(false,'INVALID_TIME');
 // Administrative membership controls never imply access to case documents.
 if([A.ADMIN_MEMBERS,A.ADMIN_GRANTS,A.AUDIT_READ].includes(action)){
  return principal.role==='administrator'
    ?result(true,'ADMIN_METADATA_ONLY'):result(false,'ADMIN_ONLY');
 }
 if(!caseRecord||!str(caseRecord.id)||!str(caseRecord.ownerId)||
    !str(caseRecord.orgId)||caseRecord.orgId!==principal.orgId||
    caseRecord.status!=='active')
  return result(false,'CASE_NOT_ACCESSIBLE');
 // Edit must be conditional on the current server-side row version, to
 // prevent silent lost updates from concurrent experts and stale browser tabs.
 if(action===A.EDIT&&(!Number.isSafeInteger(expectedVersion)||
    expectedVersion!==caseRecord.version))
  return result(false,'VERSION_CONFLICT');
 if(principal.subject===caseRecord.ownerId)
  return result(true,'OWNER');
 // An administrator may manage grants separately but does not read case data
 // without a specific, time-bound case grant.
 if(action===A.SHARE)return result(false,'OWNER_ONLY');
 const permitted=grants.some(g=>
  g?.caseId===caseRecord.id&&g?.orgId===principal.orgId&&
  g?.granteeId===principal.subject&&g?.grantedBy===caseRecord.ownerId&&
  g?.status==='active'&&Number.isSafeInteger(g.expiresAt)&&
  g.expiresAt>now&&Array.isArray(g.actions)&&
  g.actions.every(a=>delegable.has(a))&&g.actions.includes(action)
 );
 return permitted?result(true,'EXPLICIT_CASE_GRANT'):result(false,'NO_CASE_GRANT');
}
export function validateGrant({actor,caseRecord,grantee,actions,expiresAt,now}={}){
 if(!str(actor?.subject)||actor.verifiedByGateway!==true||
    actor.status!=='active'||actor.role!=='expert'||
    !str(caseRecord?.id)||caseRecord.status!=='active'||
    actor.orgId!==caseRecord.orgId||actor.subject!==caseRecord.ownerId||
    !str(grantee?.subject)||grantee.status!=='active'||
    grantee.orgId!==caseRecord.orgId||grantee.subject===actor.subject||
    !Array.isArray(actions)||!actions.length||
    new Set(actions).size!==actions.length||
    !actions.every(a=>delegable.has(a))||
    !Number.isSafeInteger(now)||!Number.isSafeInteger(expiresAt)||
    expiresAt<=now||expiresAt>now+90*24*60*60)
  return result(false,'INVALID_GRANT');
 return result(true,'OWNER_AUTHORIZED_GRANT');
}
