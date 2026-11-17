/* KT125 independent security audit. Only allowlisted metadata is recorded;
 * no JWT, IP, browser headers, personal data or dossier text is persisted.
 * The requested case ID is SHA-256 hashed before recording.
 */
const ACTIONS=new Set(["case.read","case.delegate","grant.revoke"]);
const REASONS=new Set(["GRANTED","ACCESS_DENIED","IDENTITY_DENIED","UNAUTHORIZED_MUTATION",
 "INVALID_ORIGIN","INVALID_PAYLOAD","AUTH_CONFIGURATION_ERROR"]);
const isId=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{1,160}$/.test(x);
const bytesToHex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
export async function recordKT125SecurityEvent({
 db,action,outcome,reason,caseId,actorUserId=null,nowMs=Date.now(),
 uuid=()=>crypto.randomUUID(),cryptoImpl=crypto
}={}){
 if(typeof db?.prepare!=="function"||!ACTIONS.has(action)||
   !["allowed","denied"].includes(outcome)||!REASONS.has(reason)||
   !Number.isSafeInteger(nowMs)||!isId(caseId))return false;
 const eventId=uuid(),requestId=uuid();
 if(!isId(eventId)||!isId(requestId)||eventId===requestId)return false;
 if(actorUserId!==null&&!isId(actorUserId))return false;
 let digest;
 try{
  digest=bytesToHex(new Uint8Array(await cryptoImpl.subtle.digest(
   "SHA-256",new TextEncoder().encode(caseId))));
  const result=await db.prepare(
   "INSERT INTO kt125_security_events "+
   "(event_id,occurred_at_ms,request_id,action,outcome,reason,case_ref_digest,actor_user_id) "+
   "VALUES(?,?,?,?,?,?,?,?)"
  ).bind(eventId,nowMs,requestId,action,outcome,reason,digest,actorUserId).run();
  return result?.success===true || result?.meta?.changes===1;
 }catch{return false}
}
