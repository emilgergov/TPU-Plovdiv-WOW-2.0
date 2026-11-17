/**
 * KT125 — private grant commands with atomic authorization+audit D1 batches.
 * Not an HTTP route and not connected to R6. The identity verifier MUST
 * cryptographically validate the Access JWT; the DB is a private D1 binding.
 */
import {validateKT125Grant} from "./authorization-policy.mjs";

const id=v=>typeof v==="string"&&/^[a-zA-Z0-9_-]{1,160}$/.test(v);
const denial=reason=>Object.freeze({ok:false,reason});
const allowed=value=>Object.freeze({ok:true,...value});

async function verifiedActor({request,verifier,db}){
 if(typeof verifier?.verify!=="function"||typeof db?.prepare!=="function")return null;
 let assertion;
 try{assertion=await verifier.verify(request)}catch{return null}
 if(assertion?.verified!==true||typeof assertion.issuer!=="string"||
    typeof assertion.subject!=="string"||!assertion.issuer||!assertion.subject)return null;
 try{
  const user=await db.prepare(
   "SELECT user_id, organization_id, role, active FROM kt125_users WHERE identity_provider=? AND provider_subject=?"
  ).bind(assertion.issuer,assertion.subject).first();
  if(!user||user.active!==1||!id(user.user_id)||!id(user.organization_id))return null;
  return {verified:true,userId:user.user_id,organizationId:user.organization_id,
   roles:[user.role],disabled:false};
 }catch{return null}
}

async function getCaseAndGrantee(db,caseId,granteeId){
 const resource=await db.prepare(
   "SELECT case_id, organization_id, owner_id, status FROM kt125_cases WHERE case_id=?"
 ).bind(caseId).first();
 const user=await db.prepare(
   "SELECT user_id, organization_id, role, active FROM kt125_users WHERE user_id=?"
 ).bind(granteeId).first();
 return {resource:resource&&{caseId:resource.case_id,organizationId:resource.organization_id,
  ownerId:resource.owner_id,status:resource.status},grantee:user?.active===1?{
  verified:true,userId:user.user_id,organizationId:user.organization_id,roles:[user.role]
 }:null};
}

/** Issue one explicit, time-bounded delegation. The browser may request
 * actions but can never assert actor ID/organization/role. All mutations
 * and their audit records are a single private D1 transaction.
 */
export async function issueKT125Grant({
 request,verifier,db,caseId,granteeId,actions,notBeforeMs,expiresAtMs,
 nowMs=Date.now(),uuid=()=>crypto.randomUUID()
}={}){
 if(!id(caseId)||!id(granteeId)||!Array.isArray(actions)||
    typeof db?.batch!=="function"||!Number.isSafeInteger(nowMs))
   return denial("INVALID_REQUEST");
 const actor=await verifiedActor({request,verifier,db});
 if(!actor)return denial("IDENTITY_NOT_VERIFIED");
 let resource,grantee;
 try{({resource,grantee}=await getCaseAndGrantee(db,caseId,granteeId))}
 catch{return denial("REGISTRY_UNAVAILABLE")}
 if(!resource||!grantee)return denial("NOT_PERMITTED");
 const check=validateKT125Grant({
  grantor:actor,grantee,resource,actions,notBeforeMs,expiresAtMs,nowMs
 });
 if(!check.allowed)return denial("NOT_PERMITTED");
 const grantId=uuid(),eventId=uuid(),requestId=uuid();
 if(![grantId,eventId,requestId].every(id)||new Set([grantId,eventId,requestId]).size!==3)
  return denial("INVALID_IDENTIFIERS");
 try{
  // The INSERT rechecks the current owner and both active users at write time.
  // This prevents a racing owner transfer or deactivation from issuing rights.
  const insert=db.prepare(`
   INSERT INTO kt125_grants
   (grant_id,case_id,organization_id,grantor_id,grantee_id,actions_json,
    not_before_ms,expires_at_ms,revoked_at_ms,created_at_ms)
   SELECT ?,c.case_id,c.organization_id,?,u.user_id,?,?,?,NULL,?
   FROM kt125_cases c JOIN kt125_users u
     ON u.user_id=? AND u.organization_id=c.organization_id AND u.active=1
   JOIN kt125_users owner
     ON owner.user_id=c.owner_id AND owner.organization_id=c.organization_id AND owner.active=1
   WHERE c.case_id=? AND c.organization_id=? AND c.owner_id=?
     AND c.status='active'
  `).bind(grantId,actor.userId,JSON.stringify(actions),notBeforeMs,expiresAtMs,nowMs,
    granteeId,caseId,actor.organizationId,actor.userId);
  // Audit insert depends on the grant row, therefore no phantom success audit.
  const audit=db.prepare(`
   INSERT INTO kt125_audit
   (event_id,organization_id,case_id,actor_id,action,outcome,timestamp_ms,request_id,details_json)
   SELECT ?,g.organization_id,g.case_id,?,'case.delegate','created',?,?,?
   FROM kt125_grants g WHERE g.grant_id=? AND g.grantor_id=?\n   AND changes()=1
  `).bind(eventId,actor.userId,nowMs,requestId,JSON.stringify({grant_id:grantId,
    grantee_id:granteeId,actions}),grantId,actor.userId);
  const result=await db.batch([insert,audit]);
  if(result?.[0]?.meta?.changes!==1||result?.[1]?.meta?.changes!==1)
   return denial("NOT_PERMITTED");
  return allowed({grantId});
 }catch{return denial("ATOMIC_WRITE_FAILED")}
}

/** The current owner can revoke a grant; a former owner has no permission.
 * Revocation and its audit record are committed by the same D1 batch.
 */
export async function revokeKT125Grant({
 request,verifier,db,caseId,grantId,nowMs=Date.now(),uuid=()=>crypto.randomUUID()
}={}){
 if(!id(caseId)||!id(grantId)||typeof db?.batch!=="function"||
    !Number.isSafeInteger(nowMs))return denial("INVALID_REQUEST");
 const actor=await verifiedActor({request,verifier,db});
 if(!actor||!actor.roles.includes("expert"))return denial("NOT_PERMITTED");
 const eventId=uuid(),requestId=uuid();
 if(!id(eventId)||!id(requestId)||eventId===requestId)return denial("INVALID_IDENTIFIERS");
 try{
  const update=db.prepare(`
   UPDATE kt125_grants SET revoked_at_ms=?
   WHERE grant_id=? AND case_id=? AND revoked_at_ms IS NULL
   AND grantor_id=? AND organization_id=?
   AND EXISTS (
    SELECT 1 FROM kt125_cases c
    WHERE c.case_id=kt125_grants.case_id
     AND c.organization_id=kt125_grants.organization_id
     AND c.owner_id=? AND c.status='active'
   )
  `).bind(nowMs,grantId,caseId,actor.userId,actor.organizationId,actor.userId);
  const audit=db.prepare(`
   INSERT INTO kt125_audit
   (event_id,organization_id,case_id,actor_id,action,outcome,timestamp_ms,request_id,details_json)
   SELECT ?,g.organization_id,g.case_id,?,'case.delegate','revoked',?,?,?
   FROM kt125_grants g WHERE g.grant_id=? AND g.case_id=?
    AND g.grantor_id=? AND g.revoked_at_ms=?\n   AND changes()=1
  `).bind(eventId,actor.userId,nowMs,requestId,
    JSON.stringify({grant_id:grantId}),grantId,caseId,actor.userId,nowMs);
  const result=await db.batch([update,audit]);
  if(result?.[0]?.meta?.changes!==1||result?.[1]?.meta?.changes!==1)
   return denial("NOT_PERMITTED");
  return allowed({grantId,revoked:true});
 }catch{return denial("ATOMIC_WRITE_FAILED")}
}
