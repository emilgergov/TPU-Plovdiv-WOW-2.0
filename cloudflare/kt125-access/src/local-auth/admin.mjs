import {kt125ManagementPrincipal} from '../management-read.mjs';
import {id,roles,token,normalizeKT125Email} from './common.mjs';
export async function localTarget(db,requestId){try{return await db.prepare('SELECT account_id FROM kt125_local_accounts WHERE request_id=?').bind(requestId).first()}catch(e){if(/no such table: (?:main\.)?kt125_local_accounts/.test(String(e?.message)+' '+String(e?.cause?.message)))return null;throw e;}}
export async function decideLocal({request,verifier,db,requestId,decision,role,existingUserId=null,now=Date.now(),uuid=()=>crypto.randomUUID()}){
 if(!id(requestId)||!['approve','reject','link'].includes(decision)||(!roles.has(role)&&decision==='approve')||(decision==='link'&&!id(existingUserId)))return {ok:false};
 const actor=await kt125ManagementPrincipal({request,verifier,db});if(!actor||!['egmaster','administrator'].includes(actor.role))return {ok:false};
 let who;try{who=await verifier.verify(request)}catch{return {ok:false}}if(!who?.verified)return {ok:false};
 const eventId=uuid(),auditId=uuid(),mailId=uuid(),nonce=token();if(![eventId,auditId,mailId].every(id)||new Set([eventId,auditId,mailId]).size!==3)return {ok:false};
 const ownerSelf=decision==='link'&&actor.role==='egmaster'&&actor.userId===existingUserId;
 const email=normalizeKT125Email(who.email)||'';
 try{
  let targetRole=role;
  if(decision==='link'){
   const old=await db.prepare(`SELECT u.role FROM kt125_users u JOIN kt125_local_accounts a ON a.organization_id=u.organization_id
    WHERE a.request_id=? AND u.user_id=? AND u.active=1 AND
    ((u.role IN ('expert','reviewer','delegated_expert') AND EXISTS(SELECT 1 FROM kt125_staff_profiles p WHERE p.user_id=u.user_id AND p.organization_id=a.organization_id AND p.email=a.email))
     OR (u.role='egmaster' AND ?=1 AND a.email=?))`).bind(requestId,existingUserId,ownerSelf?1:0,email).first();
   if(!old)return {ok:false};targetRole=old.role;
  }
  const approved=decision!=='reject';
  // The three registration roles are the only assignable roles. An EGMASTER
  // may explicitly link ONLY their own already-privileged verified Access identity.
  const update=db.prepare(`UPDATE kt125_local_accounts SET state=?,approved_role=?,existing_user_id=?,activation_nonce=?,activation_expires_ms=?,updated_at_ms=?
   WHERE request_id=? AND organization_id=? AND state='pending'
    AND EXISTS(SELECT 1 FROM kt125_users m WHERE m.user_id=? AND m.organization_id=kt125_local_accounts.organization_id AND m.identity_provider=? AND m.provider_subject=? AND m.active=1 AND m.role IN ('egmaster','administrator'))
    AND (?<>'approve' OR NOT EXISTS(SELECT 1 FROM kt125_staff_profiles p WHERE p.email=kt125_local_accounts.email AND p.organization_id=kt125_local_accounts.organization_id))
    AND (?<>'link' OR EXISTS(SELECT 1 FROM kt125_users u WHERE u.user_id=? AND u.organization_id=kt125_local_accounts.organization_id AND u.active=1 AND u.role=? AND ((u.role IN ('expert','reviewer','delegated_expert') AND EXISTS(SELECT 1 FROM kt125_staff_profiles p WHERE p.user_id=u.user_id AND p.organization_id=u.organization_id AND p.email=kt125_local_accounts.email)) OR (u.role='egmaster' AND ?=1 AND kt125_local_accounts.email=?))))`)
   .bind(approved?'approved':'rejected',approved?targetRole:null,decision==='link'?existingUserId:null,approved?nonce:null,approved?now+7*86400000:null,now,
    requestId,actor.organizationId,actor.userId,who.issuer,who.subject,decision,decision,existingUserId,targetRole||null,ownerSelf?1:0,email);
  const req=db.prepare(`UPDATE kt125_access_requests SET status=?,decided_by=?,updated_at_ms=? WHERE request_id=? AND organization_id=? AND status='pending' AND changes()=1`).bind(approved?'approved':'rejected',actor.userId,now,requestId,actor.organizationId);
  const writes=[update,req];
  if(approved)writes.push(db.prepare(`INSERT INTO kt125_local_outbox(mail_id,account_id,organization_id,state,created_at_ms)
   SELECT ?,account_id,organization_id,'queued',? FROM kt125_local_accounts WHERE request_id=? AND state='approved' AND changes()=1`).bind(mailId,now,requestId));
  writes.push(db.prepare(`INSERT INTO kt125_audit(event_id,organization_id,actor_id,action,outcome,timestamp_ms,request_id,details_json)
   VALUES(?,(SELECT organization_id FROM kt125_access_requests WHERE request_id=? AND status=? AND decided_by=? AND changes()=1),?,'users.local.decide',?,?,?,?)`)
   .bind(eventId,requestId,approved?'approved':'rejected',actor.userId,actor.userId,approved?'allowed':'denied',now,auditId,JSON.stringify({access_request_id:requestId,decision,...(approved?{role:targetRole}:{}),...(existingUserId?{target_user_id:existingUserId}:{})})));
  const out=await db.batch(writes);return out?.length===writes.length&&out.every(r=>r.meta.changes===1)?{ok:true,...(approved?{mailId}:{} )}:{ok:false};
 }catch{return {ok:false}}
}
export async function renewLocal({request,verifier,db,requestId,now=Date.now(),uuid=()=>crypto.randomUUID()}){
 if(!id(requestId))return {ok:false};
 const actor=await kt125ManagementPrincipal({request,verifier,db});if(!actor||!['egmaster','administrator'].includes(actor.role))return {ok:false};
 let who;try{who=await verifier.verify(request)}catch{return {ok:false}}if(!who?.verified)return {ok:false};
 const eventId=uuid(),auditId=uuid(),mailId=uuid();if(![eventId,auditId,mailId].every(id)||new Set([eventId,auditId,mailId]).size!==3)return {ok:false};
 try{
  const update=db.prepare(`UPDATE kt125_local_accounts SET activation_nonce=?,activation_expires_ms=?,updated_at_ms=?
   WHERE request_id=? AND organization_id=? AND state='approved' AND activated_at_ms IS NULL
   AND EXISTS(SELECT 1 FROM kt125_users m WHERE m.user_id=? AND m.organization_id=kt125_local_accounts.organization_id AND m.identity_provider=? AND m.provider_subject=? AND m.active=1 AND m.role IN ('egmaster','administrator'))`)
   .bind(token(),now+7*86400000,now,requestId,actor.organizationId,actor.userId,who.issuer,who.subject);
  const mail=db.prepare(`INSERT INTO kt125_local_outbox(mail_id,account_id,organization_id,state,created_at_ms)
   SELECT ?,account_id,organization_id,'queued',? FROM kt125_local_accounts WHERE request_id=? AND changes()=1`).bind(mailId,now,requestId);
  const audit=db.prepare(`INSERT INTO kt125_audit(event_id,organization_id,actor_id,action,outcome,timestamp_ms,request_id,details_json)
   VALUES(?,(SELECT organization_id FROM kt125_local_outbox WHERE mail_id=? AND changes()=1),?,'users.local.renew','allowed',?,?,?)`)
   .bind(eventId,mailId,actor.userId,now,auditId,JSON.stringify({access_request_id:requestId}));
  const out=await db.batch([update,mail,audit]);return out?.length===3&&out.every(r=>r.meta.changes===1)?{ok:true,mailId}:{ok:false};
 }catch{return {ok:false}}
}

export async function cancelAccessRequest({request,verifier,db,requestId,local,now=Date.now(),uuid=()=>crypto.randomUUID()}){
 if(!id(requestId))return {ok:false};
 const actor=await kt125ManagementPrincipal({request,verifier,db});
 if(!actor||!['egmaster','administrator'].includes(actor.role))return {ok:false};
 let who;try{who=await verifier.verify(request)}catch{return {ok:false}}
 if(!who?.verified)return {ok:false};
 const eventId=uuid(),auditId=uuid();
 if(!id(eventId)||!id(auditId))return {ok:false};
 // Release the unique registration identifiers while preserving journal references.
 const retired='!cancelled:'+requestId;
 const eligible=local?`r.status IN ('pending','approved') AND EXISTS(
   SELECT 1 FROM kt125_local_accounts a WHERE a.request_id=r.request_id AND a.organization_id=r.organization_id
   AND a.state=r.status AND a.activated_at_ms IS NULL AND a.user_id IS NULL)`:`r.status='pending'`;
 try{
  const update=db.prepare(`UPDATE kt125_access_requests AS r SET status='rejected',email=?,provider_subject=?,decided_by=?,updated_at_ms=?
   WHERE request_id=? AND organization_id=? AND invitation_id IS NULL AND ${eligible}
    AND EXISTS(SELECT 1 FROM kt125_users m WHERE m.user_id=? AND m.organization_id=r.organization_id
     AND m.identity_provider=? AND m.provider_subject=? AND m.active=1 AND m.role IN ('egmaster','administrator'))`)
   .bind(retired,retired,actor.userId,now,requestId,actor.organizationId,actor.userId,who.issuer,who.subject);
  const writes=[update];
  if(local)writes.push(db.prepare(`UPDATE kt125_local_accounts SET state='rejected',email=?,username=?,
   activation_nonce=NULL,activation_expires_ms=NULL,approved_role=NULL,existing_user_id=NULL,
   credential_version=credential_version+1,updated_at_ms=?
   WHERE request_id=? AND organization_id=? AND activated_at_ms IS NULL AND user_id IS NULL AND changes()=1`)
   .bind(retired,retired,now,requestId,actor.organizationId));
  writes.push(db.prepare(`INSERT INTO kt125_audit(event_id,organization_id,actor_id,action,outcome,timestamp_ms,request_id,details_json)
   VALUES(?,(SELECT organization_id FROM kt125_access_requests WHERE request_id=? AND email=? AND changes()=1),
    ?,'users.request.cancel','allowed',?,?,?)`)
   .bind(eventId,requestId,retired,actor.userId,now,auditId,JSON.stringify({access_request_id:requestId})));
  const result=await db.batch(writes);
  return {ok:result.length===writes.length&&result.every(row=>row.meta.changes===1)};
 }catch{return {ok:false}}
}
