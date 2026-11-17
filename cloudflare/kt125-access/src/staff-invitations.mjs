/** Name/email invitations: no browser-supplied subject, no account provisioning.
 * The signed Access application email binds a pending invitation to the subject
 * only when its owner explicitly accepts. Never relinks an existing identity.
 */
import {kt125ManagementPrincipal} from './management-read.mjs';
import {normalizeKT125Email} from './identity-email.mjs';
export {normalizeKT125Email} from './identity-email.mjs';
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(v);
const text=v=>typeof v==='string'&&v===v.trim()&&v.length>0&&v.length<=256&&!/[\x00-\x1f\x7f]/.test(v);
const displayName=v=>typeof v==='string'&&v===v.trim()&&v.length>0&&v.length<=80&&!/[\x00-\x1f\x7f]/.test(v);
const roles=new Set(['expert','reviewer','delegated_expert']);
const denied=code=>({ok:false,code});
const DAY=24*60*60*1000;
// Kept as explicit statements to run identically through D1 batch and SQLite QA.
export const KT125_INVITATION_SCHEMA=[
 `CREATE TABLE IF NOT EXISTS kt125_staff_profiles (
 user_id TEXT PRIMARY KEY NOT NULL, organization_id TEXT NOT NULL,
 identity_provider TEXT NOT NULL, email TEXT NOT NULL, display_name TEXT NOT NULL,
 UNIQUE(identity_provider,email),
 FOREIGN KEY(user_id,organization_id) REFERENCES kt125_users(user_id,organization_id))`,
 `CREATE TABLE IF NOT EXISTS kt125_staff_invitations (
 invitation_id TEXT PRIMARY KEY NOT NULL, organization_id TEXT NOT NULL,
 identity_provider TEXT NOT NULL, email TEXT NOT NULL, display_name TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('expert','reviewer','delegated_expert')),
 status TEXT NOT NULL CHECK(status IN ('pending','accepted','revoked')),
 invited_by TEXT NOT NULL, created_at_ms INTEGER NOT NULL,
 expires_at_ms INTEGER NOT NULL CHECK(expires_at_ms>created_at_ms),
 accepted_user_id TEXT, updated_at_ms INTEGER NOT NULL,
 FOREIGN KEY(invited_by,organization_id) REFERENCES kt125_users(user_id,organization_id),
 FOREIGN KEY(accepted_user_id,organization_id) REFERENCES kt125_users(user_id,organization_id))`,
 `CREATE UNIQUE INDEX IF NOT EXISTS idx_kt125_one_pending_email
 ON kt125_staff_invitations(identity_provider,email) WHERE status='pending'`,
 `CREATE INDEX IF NOT EXISTS idx_kt125_invitation_org
 ON kt125_staff_invitations(organization_id,created_at_ms)`
];
async function identityFor(request,verifier){
 try{const who=await verifier.verify(request);
 return who?.verified===true&&text(who.issuer)&&text(who.subject)?who:null;
 }catch{return null}
}
async function managerFor(request,verifier,db){
 const actor=await kt125ManagementPrincipal({request,verifier,db});
 return actor&&['egmaster','administrator'].includes(actor.role)?actor:null;
}
export async function inviteKT125Staff({request,verifier,db,name,email,role,nowMs=Date.now(),uuid=()=>crypto.randomUUID()}={}){
 const normalized=normalizeKT125Email(email);
 if(!displayName(name)||!normalized||!roles.has(role)||!Number.isSafeInteger(nowMs)||
  typeof db?.prepare!=='function'||typeof db?.batch!=='function')return denied('INVALID_INVITATION');
 const identity=await identityFor(request,verifier);
 if(!identity)return denied('UNVERIFIED');
 if(identity.email===normalized)return denied('SELF_INVITATION');
 const actor=await managerFor(request,verifier,db);
 if(!actor)return denied('NOT_PERMITTED');
 const invitationId=uuid(),eventId=uuid(),requestId=uuid();
 if(![invitationId,eventId,requestId].every(id)||new Set([invitationId,eventId,requestId]).size!==3)return denied('INVALID_IDS');
 try{
  // Additive one-time setup, only after the current manager is verified.
  await db.batch(KT125_INVITATION_SCHEMA.map(sql=>db.prepare(sql)));
  const insert=db.prepare(`
   INSERT INTO kt125_staff_invitations
    (invitation_id,organization_id,identity_provider,email,display_name,role,status,invited_by,created_at_ms,expires_at_ms,updated_at_ms)
   SELECT ?,a.organization_id,?,?,?,?, 'pending',a.user_id,?,?,?
   FROM kt125_users a
   WHERE a.user_id=? AND a.organization_id=? AND a.active=1
    AND a.role IN ('egmaster','administrator') AND a.identity_provider=? AND a.provider_subject=?
    AND NOT EXISTS(SELECT 1 FROM kt125_staff_profiles WHERE identity_provider=? AND email=?)
  `).bind(invitationId,identity.issuer,normalized,name,role,nowMs,nowMs+7*DAY,nowMs,
    actor.userId,actor.organizationId,identity.issuer,identity.subject,identity.issuer,normalized);
  // NOT NULL on organization_id turns any stale/denied write into a transaction
  // failure. An audit collision also rolls back the invitation, never a partial write.
  const audit=db.prepare(`
   INSERT INTO kt125_audit(event_id,organization_id,case_id,actor_id,action,outcome,timestamp_ms,request_id,details_json)
   VALUES(?,(SELECT organization_id FROM kt125_staff_invitations WHERE invitation_id=? AND changes()=1),NULL,?,'users.invite','created',?,?,?)
  `).bind(eventId,invitationId,actor.userId,nowMs,requestId,JSON.stringify({invitation_id:invitationId,role}));
  const result=await db.batch([insert,audit]);
  if(result?.length!==2||result.some(x=>x?.meta?.changes!==1))return denied('INVITATION_FAILED');
  return {ok:true,invitationId};
 }catch{return denied('INVITATION_FAILED')}
}
export async function acceptKT125Invitation({request,verifier,db,nowMs=Date.now(),uuid=()=>crypto.randomUUID()}={}){
 if(!Number.isSafeInteger(nowMs)||typeof db?.prepare!=='function'||typeof db?.batch!=='function')return denied('INVALID_REQUEST');
 const who=await identityFor(request,verifier);
 // email is emitted ONLY after signature validation of an Access app token.
 const email=normalizeKT125Email(who?.email);
 if(!who||!email)return denied('VERIFIED_EMAIL_REQUIRED');
 let pending;
 try{
  pending=await db.prepare(`SELECT invitation_id,organization_id,role,display_name,email
   FROM kt125_staff_invitations WHERE identity_provider=? AND email=?
    AND status='pending' AND expires_at_ms>?`).bind(who.issuer,email,nowMs).first();
 }catch{return denied('INVITATION_UNAVAILABLE')}
 if(!pending||!id(pending.invitation_id)||!id(pending.organization_id)||!roles.has(pending.role))return denied('NO_PENDING_INVITATION');
 const userId=uuid(),eventId=uuid(),requestId=uuid();
 if(![userId,eventId,requestId].every(id)||new Set([userId,eventId,requestId]).size!==3)return denied('INVALID_IDS');
 try{
  const userInsert=db.prepare(`
   INSERT INTO kt125_users(user_id,organization_id,identity_provider,provider_subject,role,active,created_at_ms,updated_at_ms,activation_pending)
   SELECT ?,i.organization_id,i.identity_provider,?,i.role,1,?,?,0
   FROM kt125_staff_invitations i
   JOIN kt125_users a ON a.user_id=i.invited_by AND a.organization_id=i.organization_id
   WHERE i.invitation_id=? AND i.identity_provider=? AND i.email=? AND i.organization_id=?
    AND i.status='pending' AND i.expires_at_ms>? AND i.role IN ('expert','reviewer','delegated_expert')
    AND a.active=1 AND a.role IN ('egmaster','administrator')
    AND NOT EXISTS(SELECT 1 FROM kt125_users WHERE identity_provider=? AND provider_subject=?)
    AND NOT EXISTS(SELECT 1 FROM kt125_staff_profiles WHERE identity_provider=? AND email=?)
  `).bind(userId,who.subject,nowMs,nowMs,pending.invitation_id,who.issuer,email,pending.organization_id,nowMs,who.issuer,who.subject,who.issuer,email);
  const profileInsert=db.prepare(`
   INSERT INTO kt125_staff_profiles(user_id,organization_id,identity_provider,email,display_name)
   SELECT u.user_id,u.organization_id,u.identity_provider,i.email,i.display_name
   FROM kt125_users u JOIN kt125_staff_invitations i ON i.invitation_id=? AND i.organization_id=u.organization_id
   WHERE u.user_id=? AND u.identity_provider=? AND u.provider_subject=? AND changes()=1
  `).bind(pending.invitation_id,userId,who.issuer,who.subject);
  const consume=db.prepare(`
   UPDATE kt125_staff_invitations SET status='accepted',accepted_user_id=?,updated_at_ms=?
   WHERE invitation_id=? AND organization_id=? AND identity_provider=? AND email=?
    AND status='pending' AND expires_at_ms>? AND changes()=1
  `).bind(userId,nowMs,pending.invitation_id,pending.organization_id,who.issuer,email,nowMs);
  const auditAccept=db.prepare(`
   INSERT INTO kt125_audit(event_id,organization_id,case_id,actor_id,action,outcome,timestamp_ms,request_id,details_json)
   VALUES(?,(SELECT organization_id FROM kt125_staff_invitations
    WHERE invitation_id=? AND accepted_user_id=? AND status='accepted' AND changes()=1),NULL,?,'users.invitation.accept','allowed',?,?,?)
  `).bind(eventId,pending.invitation_id,userId,userId,nowMs,requestId,JSON.stringify({invitation_id:pending.invitation_id}));
  const result=await db.batch([userInsert,profileInsert,consume,auditAccept]);
  if(result?.length!==4||result.some(x=>x?.meta?.changes!==1))return denied('ACTIVATION_FAILED');
  return {ok:true,userId,role:pending.role};
 }catch{return denied('ACTIVATION_FAILED')}
}
export async function revokeKT125Invitation({request,verifier,db,invitationId,nowMs=Date.now(),uuid=()=>crypto.randomUUID()}={}){
 if(!id(invitationId)||!Number.isSafeInteger(nowMs)||typeof db?.batch!=='function')return denied('INVALID_REQUEST');
 const actor=await managerFor(request,verifier,db);
 if(!actor)return denied('NOT_PERMITTED');
 const eventId=uuid(),requestId=uuid();
 if(!id(eventId)||!id(requestId)||eventId===requestId)return denied('INVALID_IDS');
 try{
  const revoke=db.prepare(`UPDATE kt125_staff_invitations SET status='revoked',updated_at_ms=?
   WHERE invitation_id=? AND organization_id=? AND status='pending'
    AND EXISTS(SELECT 1 FROM kt125_users WHERE user_id=? AND organization_id=?
     AND active=1 AND role IN ('egmaster','administrator'))
  `).bind(nowMs,invitationId,actor.organizationId,actor.userId,actor.organizationId);
  const auditRevoke=db.prepare(`INSERT INTO kt125_audit(event_id,organization_id,case_id,actor_id,action,outcome,timestamp_ms,request_id,details_json)
   VALUES(?,(SELECT organization_id FROM kt125_staff_invitations WHERE invitation_id=? AND organization_id=? AND status='revoked' AND changes()=1),NULL,?,'users.invitation.revoke','revoked',?,?,?)
  `).bind(eventId,invitationId,actor.organizationId,actor.userId,nowMs,requestId,JSON.stringify({invitation_id:invitationId}));
  const result=await db.batch([revoke,auditRevoke]);
  return result?.length===2&&result.every(x=>x?.meta?.changes===1)?{ok:true}:denied('REVOCATION_FAILED');
 }catch{return denied('REVOCATION_FAILED')}
}
export async function readKT125InvitationDirectory({request,verifier,db,nowMs=Date.now()}={}){
 const actor=await managerFor(request,verifier,db);
 if(!actor)return denied('NOT_PERMITTED');
 try{
  const invitations=await db.prepare(`SELECT invitation_id,display_name,email,role,status,expires_at_ms
   FROM kt125_staff_invitations WHERE organization_id=? ORDER BY created_at_ms DESC LIMIT 51`).bind(actor.organizationId).all();
  const profiles=await db.prepare(`SELECT user_id,display_name,email FROM kt125_staff_profiles WHERE organization_id=? LIMIT 1000`).bind(actor.organizationId).all();
  if(!Array.isArray(invitations?.results)||!Array.isArray(profiles?.results))return denied('DIRECTORY_UNAVAILABLE');
  return {ok:true,invitations:invitations.results.slice(0,50).map(r=>({
   invitation_id:r.invitation_id,display_name:r.display_name,email:r.email,role:r.role,
   status:r.status==='pending'&&r.expires_at_ms<=nowMs?'expired':r.status,expires_at_ms:r.expires_at_ms})),
   profiles:profiles.results.map(r=>({user_id:r.user_id,display_name:r.display_name,email:r.email})),hasMore:invitations.results.length>50};
 }catch(e){
  // The installed FIX92 registry has neither additive table yet. No writes on GET.
  if(/no such table: (?:main\.)?kt125_staff_(?:profiles|invitations)/i.test(String(e?.message||'')+' '+String(e?.cause?.message||'')))
   return {ok:true,invitations:[],profiles:[],hasMore:false};
  return denied('DIRECTORY_UNAVAILABLE');
 }
}
