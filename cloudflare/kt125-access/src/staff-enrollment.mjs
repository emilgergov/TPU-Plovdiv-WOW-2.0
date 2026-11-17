/**
 * KT125-VT02.3 — private, audited staff enrollment.
 * The enrolled identity is a *pre-existing* subject in the same verified
 * identity provider. Creating a registry row is NOT account creation.
 * Enrollment is INACTIVE until the employee presents their own signed Access JWT.\n * No bootstrap, EGMASTER or administrator role issuance over HTTP.
 */
const ident=v=>typeof v==="string"&&/^[A-Za-z0-9_-]{1,160}$/.test(v);
const subject=v=>typeof v==="string"&&v.length>=1&&v.length<=200&&
 !/[\x00-\x1f\x7f]/.test(v)&&v===v.trim();
const allowedRoles=new Set(["expert","reviewer","delegated_expert"]);
const denied=code=>Object.freeze({ok:false,code});
export async function enrollKT125Staff({
 request,verifier,db,providerSubject,role,nowMs=Date.now(),
 uuid=()=>crypto.randomUUID()
}={}){
 if(!allowedRoles.has(role)||!subject(providerSubject)||
   !Number.isSafeInteger(nowMs)||typeof verifier?.verify!=="function"||
   typeof db?.prepare!=="function"||typeof db?.batch!=="function")
  return denied("INVALID_ENROLLMENT");
 let identity;
 try{identity=await verifier.verify(request)}catch{return denied("UNVERIFIED")}
 if(identity?.verified!==true||!subject(identity.issuer)||!subject(identity.subject))
  return denied("UNVERIFIED");
 // Even a valid manager cannot create a second identity for themselves.
 if(providerSubject===identity.subject)return denied("SELF_REGISTRATION_DENIED");
 let actor;
 try{
  actor=await db.prepare(
   "SELECT user_id,organization_id,role,active FROM kt125_users WHERE identity_provider=? AND provider_subject=?"
  ).bind(identity.issuer,identity.subject).first();
 }catch{return denied("REGISTRY_UNAVAILABLE")}
 if(!actor||actor.active!==1||!ident(actor.user_id)||
   !ident(actor.organization_id)||!["egmaster","administrator"].includes(actor.role))
  return denied("NOT_PERMITTED");
 const userId=uuid(),eventId=uuid(),requestId=uuid();
 if(![userId,eventId,requestId].every(ident)||new Set([userId,eventId,requestId]).size!==3)
  return denied("INVALID_IDS");
 try{
  // The verified manager is RECHECKED at write time. An identity provider
  // subject is globally unique across all orgs; a conflict rolls back.
  const insert=db.prepare(`
   INSERT INTO kt125_users
    (user_id,organization_id,identity_provider,provider_subject,role,active,created_at_ms,updated_at_ms,activation_pending)
   SELECT ?,a.organization_id,?,?,?,0,?,?,1
   FROM kt125_users a
   WHERE a.user_id=? AND a.organization_id=? AND a.active=1
    AND a.role IN ('egmaster','administrator')
    AND NOT (a.identity_provider=? AND a.provider_subject=?)
    AND NOT EXISTS (
     SELECT 1 FROM kt125_users existing
     WHERE existing.identity_provider=? AND existing.provider_subject=?
    )
  `).bind(userId,identity.issuer,providerSubject,role,nowMs,nowMs,
   actor.user_id,actor.organization_id,identity.issuer,providerSubject,
   identity.issuer,providerSubject);
  const audit=db.prepare(`
   INSERT INTO kt125_audit
    (event_id,organization_id,case_id,actor_id,action,outcome,timestamp_ms,request_id,details_json)
   SELECT ?,u.organization_id,NULL,?,'users.enroll','created',?,?,?
   FROM kt125_users u WHERE u.user_id=? AND u.role=?
    AND u.organization_id=? AND changes()=1
  `).bind(eventId,actor.user_id,nowMs,requestId,
   JSON.stringify({new_user_id:userId,role}),userId,role,actor.organization_id);
  const results=await db.batch([insert,audit]);
  if(results?.[0]?.meta?.changes!==1||results?.[1]?.meta?.changes!==1)
   return denied("ENROLLMENT_NOT_PERMITTED");
  return Object.freeze({ok:true,userId,role});
 }catch{return denied("TRANSACTION_FAILED")}
}
