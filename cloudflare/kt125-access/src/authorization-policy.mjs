/**
 * WOW KT125 — isolated, pure server-side authorization policy.
 * This is NOT a login provider and NEVER accepts browser-supplied role claims
 * as trusted identities. Callers must authenticate and load grants on the server.
 * No connection to Stage4/Stage5 or public GitHub Pages is made here.
 */
export const KT125_ACTIONS=Object.freeze([
 "case.read","case.edit","case.review","case.confirm",
 "document.generate","case.delegate","case.archive",
 "users.manage","config.manage","audit.read"
]);
export const KT125_ROLES=Object.freeze([
 "egmaster","administrator","expert","reviewer","delegated_expert"
]);
const ACTIONS=new Set(KT125_ACTIONS),ROLES=new Set(KT125_ROLES);
const CASE_ACTIONS=new Set(KT125_ACTIONS.filter(x=>x.startsWith("case.")||x.startsWith("document.")));
const SELF_ACTIONS=new Set(["case.read","case.edit","case.review","case.confirm","document.generate","case.archive"]);
const REVIEW_ACTIONS=new Set(["case.read","case.review"]);
const DELEGABLE=new Set(["case.read","case.edit","case.review","case.confirm","document.generate"]);
const MANAGEMENT=Object.freeze({
 "egmaster":new Set(["users.manage","config.manage","audit.read"]),
 "administrator":new Set(["users.manage","config.manage"]),
 "expert":new Set(),"reviewer":new Set(),"delegated_expert":new Set()
});
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
const str=v=>typeof v==="string"?v.trim():"";
const validId=v=>str(v).length>0&&str(v).length<=200;
const reject=reason=>Object.freeze({allowed:false,reason});
const accept=reason=>Object.freeze({allowed:true,reason});
const list=value=>Array.isArray(value)?value:[];

/**
 * principal is produced by VERIFIED server session middleware only:
 * {verified:true, userId, organizationId, roles:[...], disabled:false}
 * resource is fetched from trusted private registry, never from body:
 * {caseId, organizationId, ownerId, status}
 * delegation is trusted private DB record with explicit validity window.
 */
export function authorizeKT125({principal,resource,action,grants=[],nowMs}={}){
 if(!ACTIONS.has(action))return reject("UNKNOWN_ACTION");
 if(principal?.verified!==true||principal?.disabled===true||
   !validId(principal?.userId)||!validId(principal?.organizationId))
  return reject("NO_VERIFIED_IDENTITY");
 const roles=list(principal.roles);
 if(!roles.length||roles.some(r=>!ROLES.has(r)))return reject("INVALID_ROLE");
 if(!Number.isFinite(nowMs)||nowMs<0)return reject("INVALID_CLOCK");
 if(!CASE_ACTIONS.has(action)){
  if(roles.some(role=>MANAGEMENT[role].has(action)))return accept("VERIFIED_MANAGEMENT_ROLE");
  return reject("MANAGEMENT_NOT_PERMITTED");
 }
 if(!resource||!validId(resource.caseId)||!validId(resource.ownerId)||
    !validId(resource.organizationId))return reject("MISSING_TRUSTED_RESOURCE");
 if(resource.organizationId!==principal.organizationId)
  return reject("OUTSIDE_ORGANIZATION");
 if(resource.status==="sealed"&&action!=="case.read"&&action!=="case.review")
  return reject("SEALED_CASE");
 // EGMASTER and administrator have no implicit dossier access.
 if(resource.ownerId===principal.userId&&roles.includes("expert")){
  if(SELF_ACTIONS.has(action))return accept("OWNER_EXPERT");
  if(action==="case.delegate")return accept("OWNER_CAN_DELEGATE");
 }
 const matches=list(grants).filter(grant=>
  grant?.caseId===resource.caseId&&
  grant?.organizationId===principal.organizationId&&
  grant?.granteeId===principal.userId&&
  grant?.revoked!==true&&grant?.active===true&&
  validId(grant?.grantorId)&&
  Number.isFinite(grant?.notBeforeMs)&&
  Number.isFinite(grant?.expiresAtMs)&&
  grant.notBeforeMs<=nowMs&&nowMs<grant.expiresAtMs&&
  grant.expiresAtMs>grant.notBeforeMs&&
  list(grant.actions).every(a=>DELEGABLE.has(a))&&
  list(grant.actions).includes(action)
 );
 if(matches.length)return accept("ACTIVE_EXPLICIT_GRANT");
 return reject("CASE_ACCESS_NOT_GRANTED");
}

/**
 * Grant issuance: both the grantor and the grantee must be VERIFIED users of
 * the same organization. Only a case-owning expert may issue grants. A grant
 * cannot outlive its declared expiry, and the service must atomically store
 * grant + immutable audit event after this pure validation returns allowed.
 */
export function validateKT125Grant({grantor,grantee,resource,actions,notBeforeMs,expiresAtMs,nowMs}={}){
 if(grantor?.verified!==true||grantee?.verified!==true||
  !validId(grantee?.userId)||!validId(grantee?.organizationId))return reject("UNVERIFIED_GRANT_PARTY");
 const permission=authorizeKT125({principal:grantor,resource,action:"case.delegate",nowMs});
 if(!permission.allowed)return permission;
 if(grantee.organizationId!==resource.organizationId)return reject("CROSS_ORG_GRANT");
 const requested=list(actions);
 if(!requested.length||new Set(requested).size!==requested.length||
    requested.some(a=>!DELEGABLE.has(a)))return reject("INVALID_DELEGATED_ACTIONS");
 if(!Number.isFinite(notBeforeMs)||!Number.isFinite(expiresAtMs)||
   notBeforeMs<nowMs||expiresAtMs<=notBeforeMs)return reject("INVALID_GRANT_WINDOW");
 if(grantee.userId===grantor.userId)return reject("SELF_DELEGATION");
 return accept("GRANT_MAY_BE_RECORDED");
}
