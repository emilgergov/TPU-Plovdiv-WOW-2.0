/** Explicit manager migration only. A matching email alone never binds an
 * existing user: the manager must confirm the exact active non-admin target. */
import {kt125ManagementPrincipal} from '../management-read.mjs';
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(v);
export async function linkKT125ExistingMember({request,verifier,db,requestId,targetUserId,nowMs=Date.now(),uuid=()=>crypto.randomUUID()}={}){
 if(!id(requestId)||!id(targetUserId)||!Number.isSafeInteger(nowMs))return {ok:false};
 const actor=await kt125ManagementPrincipal({request,verifier,db});
 if(!actor||!['egmaster','administrator'].includes(actor.role))return {ok:false};
 let identity;try{identity=await verifier.verify(request)}catch{return {ok:false}}
 if(!identity?.verified)return {ok:false};
 const ids=[uuid(),uuid(),uuid()];if(!ids.every(id)||new Set(ids).size!==3)return {ok:false};
 const [invitationId,eventId,auditId]=ids;
 try{
  const invitation=db.prepare(`INSERT INTO kt125_staff_invitations
   (invitation_id,organization_id,identity_provider,email,display_name,role,status,invited_by,created_at_ms,expires_at_ms,accepted_user_id,updated_at_ms)
   SELECT ?,r.organization_id,r.identity_provider,r.email,r.display_name,u.role,'accepted',?,?,?,u.user_id,?
   FROM kt125_access_requests r JOIN kt125_member_accounts a ON a.request_id=r.request_id
    JOIN kt125_staff_profiles p ON p.email=r.email AND p.organization_id=r.organization_id
    JOIN kt125_users u ON u.user_id=p.user_id AND u.organization_id=r.organization_id
   WHERE r.request_id=? AND r.organization_id=? AND r.status='pending' AND a.linked_user_id IS NULL
    AND u.user_id=? AND u.active=1 AND u.role IN ('expert','reviewer','delegated_expert')
    AND EXISTS(SELECT 1 FROM kt125_users m WHERE m.user_id=? AND m.organization_id=? AND m.identity_provider=? AND m.provider_subject=? AND m.active=1 AND m.role IN ('egmaster','administrator'))
  `).bind(invitationId,actor.userId,nowMs,nowMs+7*86400000,nowMs,requestId,actor.organizationId,targetUserId,actor.userId,actor.organizationId,identity.issuer,identity.subject);
  const link=db.prepare(`UPDATE kt125_member_accounts SET linked_user_id=? WHERE request_id=? AND linked_user_id IS NULL AND changes()=1`).bind(targetUserId,requestId);
  const decision=db.prepare(`UPDATE kt125_access_requests SET status='approved',decided_by=?,invitation_id=?,updated_at_ms=? WHERE request_id=? AND organization_id=? AND status='pending' AND changes()=1`).bind(actor.userId,invitationId,nowMs,requestId,actor.organizationId);
  const mail=db.prepare(`INSERT INTO kt125_invitation_mail(invitation_id,organization_id,state) SELECT invitation_id,organization_id,'queued' FROM kt125_access_requests WHERE request_id=? AND invitation_id=? AND status='approved' AND changes()=1`).bind(requestId,invitationId);
  const audit=db.prepare(`INSERT INTO kt125_audit(event_id,organization_id,actor_id,action,outcome,timestamp_ms,request_id,details_json)
   VALUES(?,(SELECT organization_id FROM kt125_access_requests WHERE request_id=? AND invitation_id=? AND status='approved' AND changes()=1),?,'users.password.link','allowed',?,?,?)`
  ).bind(eventId,requestId,invitationId,actor.userId,nowMs,auditId,JSON.stringify({access_request_id:requestId,target_user_id:targetUserId}));
  const result=await db.batch([invitation,link,decision,mail,audit]);
  return result?.length===5&&result.every(r=>r?.meta?.changes===1)?{ok:true,invitationId}:{ok:false};
 }catch{return {ok:false}}
}
