/** A verified mailbox may request access; only a current organization manager
 * can approve it. Approval creates an invitation, never an active user.
 * No code here modifies Access policies or the R6 expert module. */
import {normalizeKT125Email,KT125_INVITATION_SCHEMA} from './staff-invitations.mjs';
import {kt125ManagementPrincipal} from './management-read.mjs';
import {escapeHtml,kt125PageCss,kt125PrivateHtmlResponse} from './private-admin-page.mjs';
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(v);
const safe=v=>typeof v==='string'&&v.length>0&&v.length<=256&&!/[\x00-\x1f\x7f]/.test(v);
const nameOK=v=>typeof v==='string'&&v===v.trim()&&v.length>0&&v.length<=80&&!/[\x00-\x1f\x7f]/.test(v);
const noteOK=v=>typeof v==='string'&&v.length<=1000&&!/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v);
const roles=new Set(['expert','reviewer','delegated_expert']);
const fail=code=>({ok:false,code});
export const KT125_REQUEST_SCHEMA=[
 `CREATE TABLE IF NOT EXISTS kt125_access_requests (
 request_id TEXT PRIMARY KEY NOT NULL,organization_id TEXT NOT NULL,
 identity_provider TEXT NOT NULL,provider_subject TEXT NOT NULL,email TEXT NOT NULL,
 display_name TEXT NOT NULL,note TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected')),
 created_at_ms INTEGER NOT NULL,updated_at_ms INTEGER NOT NULL,
 decided_by TEXT,invitation_id TEXT UNIQUE,
 UNIQUE(identity_provider,email),UNIQUE(identity_provider,provider_subject),
 FOREIGN KEY(decided_by,organization_id) REFERENCES kt125_users(user_id,organization_id),
 FOREIGN KEY(invitation_id) REFERENCES kt125_staff_invitations(invitation_id))`,
 `CREATE INDEX IF NOT EXISTS idx_kt125_requests_org ON kt125_access_requests(organization_id,created_at_ms)`,
 `CREATE TABLE IF NOT EXISTS kt125_invitation_mail (
 invitation_id TEXT PRIMARY KEY NOT NULL,organization_id TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('queued','sending','accepted','failed')),
 first_attempt_ms INTEGER,attempt_at_ms INTEGER,provider_id TEXT,
 from_email TEXT,activation_origin TEXT,payload_json TEXT,
 FOREIGN KEY(invitation_id) REFERENCES kt125_staff_invitations(invitation_id))`
];
export async function kt125RequestIdentity(request,verifier){
 try{const who=await verifier.verify(request);
 return who?.verified===true&&safe(who.issuer)&&safe(who.subject)&&normalizeKT125Email(who.email)
  ?{issuer:who.issuer,subject:who.subject,email:normalizeKT125Email(who.email)}:null;
 }catch{return null}
}
export function renderKT125AccessRequest({email='',message='',status=200}={}){
 return kt125PrivateHtmlResponse(`<!doctype html><html lang="bg"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WOW · Заявка за достъп</title><style>${kt125PageCss}</style></head><body><header><small>WOW · КТ125</small><h1>Заявка за достъп до модула</h1></header><main style="max-width:980px"><section class="panel"><h2>Представете се</h2>${message?`<p class="state">${escapeHtml(message)}</p>`:`<p>Попълнете името си и по желание добавете забележка. Имейлът е потвърден чрез входа. Заявката ще бъде разгледана от администратор. Подаването ѝ не предоставя достъп до преписки.</p><form method="post" action="/kt125/enrollment/request"><label class="wide-field">Име <input name="name" required maxlength="80" autocomplete="name"></label><label class="wide-field">Имейл адрес <input name="email" type="email" value="${escapeHtml(email)}" required readonly maxlength="254" autocomplete="email"></label><label class="full-field">Забележка (незадължително)<textarea name="note" maxlength="1000" rows="5" placeholder="Посочете организация, длъжност или причина за искания достъп."></textarea></label><label><input type="checkbox" name="confirm" value="REQUEST" required> Потвърждавам заявката за моя профил</label><button>Изпрати заявката</button></form><p><small>До 1000 знака за забележката. Не включвайте съдържание на преписки.</small></p>`}</section></main></body></html>`,status);
}
export async function submitKT125AccessRequest({request,verifier,db,organizationId,name,email,note='',nowMs=Date.now(),uuid=()=>crypto.randomUUID()}={}){
 if(!id(organizationId)||!nameOK(name)||!noteOK(note)||!Number.isSafeInteger(nowMs))return fail('INVALID_REQUEST');
 const who=await kt125RequestIdentity(request,verifier);
 if(!who||normalizeKT125Email(email)!==who.email)return fail('VERIFIED_EMAIL_REQUIRED');
 const requestId=uuid();if(!id(requestId))return fail('INVALID_REQUEST');
 try{
  // Explicit deployment-owned organization; never infer it from the first user.
  const org=await db.prepare("SELECT user_id FROM kt125_users WHERE organization_id=? AND identity_provider=? AND active=1 AND role='egmaster' LIMIT 1").bind(organizationId,who.issuer).first();
  if(!org)return fail('REQUESTS_UNAVAILABLE');
  await db.batch([...KT125_INVITATION_SCHEMA,...KT125_REQUEST_SCHEMA].map(s=>db.prepare(s)));
  const result=await db.prepare(`INSERT INTO kt125_access_requests
   (request_id,organization_id,identity_provider,provider_subject,email,display_name,note,status,created_at_ms,updated_at_ms)
   SELECT ?,?,?,?,?,?,?,'pending',?,?
   WHERE NOT EXISTS(SELECT 1 FROM kt125_users WHERE identity_provider=? AND provider_subject=?)
    AND NOT EXISTS(SELECT 1 FROM kt125_staff_profiles WHERE identity_provider=? AND email=?)
    AND NOT EXISTS(SELECT 1 FROM kt125_staff_invitations WHERE identity_provider=? AND email=? AND status='pending')
  `).bind(requestId,organizationId,who.issuer,who.subject,who.email,name,note,nowMs,nowMs,
   who.issuer,who.subject,who.issuer,who.email,who.issuer,who.email).run();
  return result?.meta?.changes===1?{ok:true,requestId}:fail('ALREADY_RECORDED');
 }catch{return fail('REQUEST_NOT_RECORDED')}
}
async function manager(args){
 const actor=await kt125ManagementPrincipal(args);
 return actor&&['egmaster','administrator'].includes(actor.role)?actor:null;
}
export async function readKT125AccessRequests(args){
 const actor=await manager(args);if(!actor)return fail('NOT_PERMITTED');
 try{
  const result=await args.db.prepare(`SELECT r.request_id,r.display_name,r.email,r.note,r.status,r.created_at_ms,m.state AS mail_state
   FROM kt125_access_requests r LEFT JOIN kt125_invitation_mail m ON m.invitation_id=r.invitation_id
   WHERE r.organization_id=? ORDER BY r.created_at_ms DESC,r.request_id LIMIT 51`).bind(actor.organizationId).all();
  if(!Array.isArray(result?.results))return fail('REQUESTS_UNAVAILABLE');
  const items=result.results.slice(0,50);
  try{
   const local=await args.db.prepare(`SELECT a.request_id,a.email,a.activated_at_ms,o.state AS mail_state,u.user_id AS existing_user_id,u.role AS existing_role
    FROM kt125_local_accounts a
    LEFT JOIN kt125_local_outbox o ON o.mail_id=(SELECT mail_id FROM kt125_local_outbox WHERE account_id=a.account_id ORDER BY created_at_ms DESC,mail_id DESC LIMIT 1)
    LEFT JOIN kt125_staff_profiles p ON p.email=a.email AND p.organization_id=a.organization_id
    LEFT JOIN kt125_users u ON u.user_id=p.user_id AND u.organization_id=a.organization_id AND u.active=1 AND u.role IN ('expert','reviewer','delegated_expert')
    WHERE a.request_id IN (SELECT request_id FROM kt125_access_requests WHERE organization_id=? ORDER BY created_at_ms DESC,request_id LIMIT 51)`)
    .bind(actor.organizationId).all();
   const byId=new Map((local.results||[]).map(r=>[r.request_id,r]));
   let signed;try{signed=await args.verifier.verify(args.request)}catch{}
   const ownerEmail=actor.role==='egmaster'&&signed?.verified?normalizeKT125Email(signed.email):null;
   for(const row of items){const own=byId.get(row.request_id);if(!own)continue;
    row.auth_kind='local';row.mail_state=own.mail_state;row.activated_at_ms=own.activated_at_ms;
    if(row.status==='pending'){
     row.existing_user_id=own.existing_user_id;row.existing_role=own.existing_role;
     if(ownerEmail&&ownerEmail===own.email){row.existing_user_id=actor.userId;row.existing_role='egmaster';}
    }
   }
  }catch(e){
   if(!/no such table: (?:main\.)?kt125_local_(?:accounts|outbox)/i.test(String(e?.message)+' '+String(e?.cause?.message)))return fail('REQUESTS_UNAVAILABLE');
  }
  return {ok:true,items,hasMore:result.results.length>50};
 }catch(e){
  if(/no such table: (?:main\.)?kt125_(?:access_requests|invitation_mail)/i.test(String(e?.message)+' '+String(e?.cause?.message)))return {ok:true,items:[],hasMore:false};
  return fail('REQUESTS_UNAVAILABLE');
 }
}
export async function decideKT125AccessRequest({request,verifier,db,requestId,decision,role,nowMs=Date.now(),uuid=()=>crypto.randomUUID()}={}){
 if(!id(requestId)||!['approve','reject'].includes(decision)||!roles.has(role)||!Number.isSafeInteger(nowMs))return fail('INVALID_REQUEST');
 const actor=await manager({request,verifier,db});if(!actor)return fail('NOT_PERMITTED');
 // Some existing EGMASTER assertions omit email; manager identity still uses issuer/sub.
 let signed;try{signed=await verifier.verify(request)}catch{return fail('NOT_PERMITTED')}
 if(signed?.verified!==true||!safe(signed.issuer)||!safe(signed.subject))return fail('NOT_PERMITTED');
 const ids=[uuid(),uuid(),uuid()];if(!ids.every(id)||new Set(ids).size!==3)return fail('INVALID_REQUEST');
 const [invitationId,eventId,auditRequestId]=ids;
 try{
  const params=[actor.userId,actor.organizationId,signed.issuer,signed.subject];
  const liveManager=`EXISTS(SELECT 1 FROM kt125_users a WHERE a.user_id=? AND a.organization_id=? AND a.identity_provider=? AND a.provider_subject=? AND a.active=1 AND a.role IN ('egmaster','administrator'))`;
  let writes=[];
  if(decision==='approve'){
   writes.push(db.prepare(`INSERT INTO kt125_staff_invitations
    (invitation_id,organization_id,identity_provider,email,display_name,role,status,invited_by,created_at_ms,expires_at_ms,updated_at_ms)
    SELECT ?,r.organization_id,r.identity_provider,r.email,r.display_name,?,'pending',?,?,?,?
    FROM kt125_access_requests r WHERE r.request_id=? AND r.organization_id=? AND r.status='pending'
     AND ${liveManager}
     AND NOT EXISTS(SELECT 1 FROM kt125_users u WHERE u.identity_provider=r.identity_provider AND u.provider_subject=r.provider_subject)
     AND NOT EXISTS(SELECT 1 FROM kt125_staff_profiles p WHERE p.email=r.email AND p.organization_id=r.organization_id)
   `).bind(invitationId,role,actor.userId,nowMs,nowMs+7*86400000,nowMs,requestId,actor.organizationId,...params));
   writes.push(db.prepare(`UPDATE kt125_access_requests SET status='approved',decided_by=?,invitation_id=?,updated_at_ms=?
    WHERE request_id=? AND organization_id=? AND status='pending' AND changes()=1`).bind(actor.userId,invitationId,nowMs,requestId,actor.organizationId));
   writes.push(db.prepare(`INSERT INTO kt125_invitation_mail(invitation_id,organization_id,state)
    SELECT invitation_id,organization_id,'queued' FROM kt125_access_requests WHERE request_id=? AND invitation_id=? AND status='approved' AND changes()=1`).bind(requestId,invitationId));
  }else{
   writes.push(db.prepare(`UPDATE kt125_access_requests SET status='rejected',decided_by=?,updated_at_ms=?
    WHERE request_id=? AND organization_id=? AND status='pending' AND ${liveManager}`).bind(actor.userId,nowMs,requestId,actor.organizationId,...params));
  }
  writes.push(db.prepare(`INSERT INTO kt125_audit(event_id,organization_id,actor_id,action,outcome,timestamp_ms,request_id,details_json)
   VALUES(?,(SELECT organization_id FROM kt125_access_requests WHERE request_id=? AND status=? AND decided_by=? AND changes()=1),?,'users.request.decide',?,?,?,?)`
  ).bind(eventId,requestId,decision==='approve'?'approved':'rejected',actor.userId,actor.userId,decision==='approve'?'allowed':'denied',nowMs,auditRequestId,JSON.stringify({access_request_id:requestId,decision,...(decision==='approve'?{role}:{})})));
  const out=await db.batch(writes);
  return out?.length===writes.length&&out.every(r=>r?.meta?.changes===1)?{ok:true,...(decision==='approve'?{invitationId}:{})}:fail('DECISION_FAILED');
 }catch{return fail('DECISION_FAILED')}
}

export async function readKT125OwnRequest({request,verifier,db,organizationId}={}){
 const who=await kt125RequestIdentity(request,verifier);
 if(!who||!id(organizationId))return null;
 try{return await db.prepare(`SELECT status FROM kt125_access_requests WHERE organization_id=? AND identity_provider=? AND provider_subject=? AND email=?`).bind(organizationId,who.issuer,who.subject,who.email).first();}catch{return null}
}
