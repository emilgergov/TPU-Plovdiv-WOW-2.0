/** KT125: self-activation only after a separate, cryptographically verified
 * Cloudflare Access login by the exact invited subject and issuer.
 * Never reactivates suspended users (activation_pending=0).
 */
const identifier=v=>typeof v==="string"&&/^[A-Za-z0-9_-]{1,160}$/.test(v);
const identityText=v=>typeof v==="string"&&v.length>0&&v.length<=256&&v===v.trim()&&!/[\x00-\x1f\x7f]/.test(v);
const denied=code=>Object.freeze({ok:false,code});
export async function activateKT125Staff({
 request,verifier,db,nowMs=Date.now(),uuid=()=>crypto.randomUUID()
}={}){
 if(typeof verifier?.verify!=="function"||typeof db?.prepare!=="function"||
  typeof db?.batch!=="function"||!Number.isSafeInteger(nowMs))return denied("INVALID_REQUEST");
 let identity;
 try{identity=await verifier.verify(request)}catch{return denied("UNVERIFIED")}
 if(identity?.verified!==true||!identityText(identity.issuer)||!identityText(identity.subject))
  return denied("UNVERIFIED");
 let target;
 try{
  target=await db.prepare(`SELECT user_id,organization_id,role,active,activation_pending
    FROM kt125_users WHERE identity_provider=? AND provider_subject=?`)
   .bind(identity.issuer,identity.subject).first();
 }catch{return denied("REGISTRY_UNAVAILABLE")}
 if(!target||!identifier(target.user_id)||!identifier(target.organization_id)||
  target.active!==0||target.activation_pending!==1||
  !["expert","reviewer","delegated_expert"].includes(target.role))
  return denied("NOT_PENDING");
 const eventId=uuid(),requestId=uuid();
 if(!identifier(eventId)||!identifier(requestId)||eventId===requestId)
  return denied("INVALID_IDENTIFIERS");
 try{
  const update=db.prepare(`
   UPDATE kt125_users SET active=1,activation_pending=0,updated_at_ms=?
   WHERE user_id=? AND organization_id=? AND identity_provider=?
     AND provider_subject=? AND active=0 AND activation_pending=1
     AND role IN ('expert','reviewer','delegated_expert')
  `).bind(nowMs,target.user_id,target.organization_id,identity.issuer,identity.subject);
  const audit=db.prepare(`
   INSERT INTO kt125_audit
    (event_id,organization_id,case_id,actor_id,action,outcome,timestamp_ms,request_id,details_json)
   SELECT ?,u.organization_id,NULL,u.user_id,'users.activate','allowed',?,?,?
   FROM kt125_users u WHERE u.user_id=? AND u.organization_id=?
    AND u.active=1 AND u.activation_pending=0 AND changes()=1
  `).bind(eventId,nowMs,requestId,
     JSON.stringify({verified_identity:true}),target.user_id,target.organization_id);
  const result=await db.batch([update,audit]);
  if(result?.[0]?.meta?.changes!==1||result?.[1]?.meta?.changes!==1)
   return denied("ACTIVATION_FAILED");
  return Object.freeze({ok:true,userId:target.user_id,role:target.role});
 }catch{return denied("ATOMIC_WRITE_FAILED")}
}
