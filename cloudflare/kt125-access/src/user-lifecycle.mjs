/**
 * KT125 — private administrative user lifecycle.
 * Does NOT expose a public endpoint and does NOT grant dossier read.
 * A verified, active administrator/EGMASTER may disable an inactive-for-cases
 * colleague within the SAME organization, never self, and only with audit.
 */
const validId=v=>typeof v==="string"&&/^[A-Za-z0-9_-]{1,160}$/.test(v);
const denied=reason=>Object.freeze({ok:false,reason});
const ok=value=>Object.freeze({ok:true,...value});
export async function disableKT125User({
 request,verifier,db,targetUserId,nowMs=Date.now(),uuid=()=>crypto.randomUUID()
}={}){
 if(!validId(targetUserId)||!Number.isSafeInteger(nowMs)||
    typeof verifier?.verify!=="function"||typeof db?.prepare!=="function"||
    typeof db?.batch!=="function")return denied("INVALID_REQUEST");
 let identity;
 try{identity=await verifier.verify(request)}catch{return denied("UNVERIFIED")}
 if(identity?.verified!==true||typeof identity.issuer!=="string"||
    typeof identity.subject!=="string"||!identity.issuer||!identity.subject)
  return denied("UNVERIFIED");
 let actor;
 try{
  actor=await db.prepare(
   "SELECT user_id,organization_id,role,active FROM kt125_users WHERE identity_provider=? AND provider_subject=?"
  ).bind(identity.issuer,identity.subject).first();
 }catch{return denied("REGISTRY_UNAVAILABLE")}
 if(!actor||actor.active!==1||!validId(actor.user_id)||
    !validId(actor.organization_id)||
    !["egmaster","administrator"].includes(actor.role)||actor.user_id===targetUserId)
  return denied("NOT_PERMITTED");
 const eventId=uuid(),requestId=uuid();
 if(!validId(eventId)||!validId(requestId)||eventId===requestId)return denied("INVALID_IDENTIFIERS");
 try{
  // Server-side guarded UPDATE rechecks role/active and same organization
  // at write time; never disables the last owner of an active case.
  const update=db.prepare(`
   UPDATE kt125_users SET active=0,updated_at_ms=?
   WHERE user_id=? AND organization_id=? AND active=1
    AND user_id<>?
    AND NOT EXISTS (
     SELECT 1 FROM kt125_cases c WHERE c.owner_id=kt125_users.user_id
      AND c.organization_id=kt125_users.organization_id AND c.status='active'
    )
    AND EXISTS (
     SELECT 1 FROM kt125_users admin WHERE admin.user_id=?
      AND admin.organization_id=kt125_users.organization_id
      AND admin.active=1 AND admin.role IN ('egmaster','administrator')
    )
  `).bind(nowMs,targetUserId,actor.organization_id,actor.user_id,actor.user_id);
  const audit=db.prepare(`
   INSERT INTO kt125_audit
   (event_id,organization_id,case_id,actor_id,action,outcome,timestamp_ms,request_id,details_json)
   SELECT ?,u.organization_id,NULL,?,'users.disable','revoked',?,?,?
   FROM kt125_users u WHERE u.user_id=? AND u.organization_id=?
    AND u.active=0 AND changes()=1
  `).bind(eventId,actor.user_id,nowMs,requestId,
    JSON.stringify({target_user_id:targetUserId}),targetUserId,actor.organization_id);
  const result=await db.batch([update,audit]);
  if(result?.[0]?.meta?.changes!==1||result?.[1]?.meta?.changes!==1)
    return denied("NO_ELIGIBLE_USER");
  return ok({disabledUserId:targetUserId});
 }catch{return denied("ATOMIC_WRITE_FAILED")}
}
