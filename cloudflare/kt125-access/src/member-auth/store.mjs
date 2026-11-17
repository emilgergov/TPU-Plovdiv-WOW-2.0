import {KT125_INVITATION_SCHEMA,acceptKT125Invitation} from '../staff-invitations.mjs';
import {KT125_REQUEST_SCHEMA} from '../access-requests.mjs';
import {normalizeKT125Email} from '../identity-email.mjs';
export const MEMBER_SCHEMA=[
 `CREATE TABLE IF NOT EXISTS kt125_member_accounts (
 identity_provider TEXT NOT NULL,provider_subject TEXT NOT NULL,email TEXT NOT NULL,
 username TEXT NOT NULL UNIQUE,request_id TEXT NOT NULL UNIQUE,
 credential_version INTEGER NOT NULL DEFAULT 0,reset_until_ms INTEGER NOT NULL DEFAULT 0,
 linked_user_id TEXT UNIQUE REFERENCES kt125_users(user_id),
 PRIMARY KEY(identity_provider,provider_subject),UNIQUE(identity_provider,email),
 FOREIGN KEY(request_id) REFERENCES kt125_access_requests(request_id))`,
 `CREATE TABLE IF NOT EXISTS kt125_registration_challenges (
 token_hash TEXT PRIMARY KEY NOT NULL,email TEXT NOT NULL,username TEXT NOT NULL,
 display_name TEXT NOT NULL,note TEXT NOT NULL,organization_id TEXT NOT NULL,
 expires_at_ms INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,used INTEGER NOT NULL DEFAULT 0,
 verified_provider TEXT,verified_subject TEXT,verified_at_ms INTEGER)`,
 `CREATE TABLE IF NOT EXISTS kt125_member_sessions (
 token_hash TEXT PRIMARY KEY NOT NULL,identity_provider TEXT NOT NULL,provider_subject TEXT NOT NULL,
 created_at_ms INTEGER NOT NULL,expires_at_ms INTEGER NOT NULL,credential_version INTEGER NOT NULL,
 FOREIGN KEY(identity_provider,provider_subject) REFERENCES kt125_member_accounts(identity_provider,provider_subject))`,
 `CREATE INDEX IF NOT EXISTS idx_kt125_member_sessions_subject ON kt125_member_sessions(identity_provider,provider_subject)`,
 `CREATE TABLE IF NOT EXISTS kt125_auth_limits (
 bucket TEXT PRIMARY KEY NOT NULL,window_start_ms INTEGER NOT NULL,hits INTEGER NOT NULL)`
];
export const SESSION_COOKIE='__Host-kt125-member';
export const CHALLENGE_COOKIE='__Host-kt125-registration';
export const SESSION_MS=24*3600000;
export const usernameValue=v=>typeof v==='string'&&/^[a-z0-9][a-z0-9._-]{2,39}$/.test(v)&&!['admin','administrator','egmaster','root','system'].includes(v)?v:null;
export const passwordOK=v=>typeof v==='string'&&v.length>=15&&v.length<=128&&!/[\x00]/.test(v);
export function registrationInput(data){
 const username=usernameValue(data.get('username')?.trim().toLowerCase());
 const email=normalizeKT125Email(data.get('email'));
 const name=data.get('name')?.trim(),note=data.get('note')||'';
 const password=data.get('password');
 if(!username||!email||!name||name.length>80||/[\x00-\x1f\x7f]/.test(name)||
  note.length>1000||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(note)||!passwordOK(password)||password!==data.get('password_confirm'))return null;
 return {username,email,name,note,password};
}
export async function digest(value){
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export function randomToken(){
 return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export function cookieValue(request,name){
 const matches=(request.headers.get('Cookie')||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(name+'='));
 if(matches.length!==1)return null;
 const value=matches[0].slice(name.length+1);return /^[A-Za-z0-9_-]{43}$/.test(value)?value:null;
}
export const cookie=(name,token,seconds)=>`${name}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}`;
export async function setupMemberStore(db){
 await db.batch([...KT125_INVITATION_SCHEMA,...KT125_REQUEST_SCHEMA,...MEMBER_SCHEMA].map(sql=>db.prepare(sql)));
}
export async function consumeAuthLimit(db,key,limit,windowMs,nowMs){
 const bucket=await digest(key);
 const row=await db.prepare(`INSERT INTO kt125_auth_limits(bucket,window_start_ms,hits) VALUES(?,?,1)
 ON CONFLICT(bucket) DO UPDATE SET hits=CASE WHEN window_start_ms<=? THEN 1 ELSE hits+1 END,
 window_start_ms=CASE WHEN window_start_ms<=? THEN excluded.window_start_ms ELSE window_start_ms END
 RETURNING hits`).bind(bucket,nowMs,nowMs-windowMs,nowMs-windowMs).first();
 return Boolean(row&&row.hits<=limit);
}
export async function saveRegistrationChallenge({db,input,organizationId,token,nowMs}){
 await db.prepare(`INSERT INTO kt125_registration_challenges(token_hash,email,username,display_name,note,organization_id,expires_at_ms)
 VALUES(?,?,?,?,?,?,?)`).bind(await digest(token),input.email,input.username,input.name,input.note,organizationId,nowMs+600000).run();
 // Deliberately no password, password hash, verification code or provider token.
}
export async function markRegistrationVerified({db,challenge,who,nowMs}){
 if(!who?.verified||who.email!==challenge.email)return false;
 const r=await db.prepare(`UPDATE kt125_registration_challenges SET verified_provider=?,verified_subject=?,verified_at_ms=? WHERE token_hash=? AND used=0 AND expires_at_ms>?`).bind(who.issuer,who.subject,nowMs,challenge.token_hash,nowMs).run();
 return r?.meta?.changes===1;
}
export async function verifiedRegistrationChallenge({db,token,issuer,nowMs}){
 if(!token)return null;
 return db.prepare(`SELECT token_hash,email,username,display_name,note,organization_id,verified_provider,verified_subject FROM kt125_registration_challenges WHERE token_hash=? AND verified_provider=? AND verified_subject IS NOT NULL AND verified_at_ms<=? AND expires_at_ms>? AND used=0`).bind(await digest(token),issuer,nowMs,nowMs).first();
}
export async function consumeRegistrationAttempt({db,token,nowMs}){
 if(!token)return null;
 return db.prepare(`UPDATE kt125_registration_challenges SET attempts=attempts+1
 WHERE token_hash=? AND used=0 AND expires_at_ms>? AND attempts<5
 RETURNING token_hash,email,username,display_name,note,organization_id`).bind(await digest(token),nowMs).first();
}
export async function queueVerifiedRegistration({db,challenge,who,nowMs,uuid=()=>crypto.randomUUID()}){
 if(!who?.verified||who.email!==challenge.email)return false;
 const requestId=uuid();
 if(!/^[A-Za-z0-9_-]{1,160}$/.test(requestId))return false;
 try{
  // Review, never role assignment. Existing legacy identities are NOT rebound by email.
  const insert=db.prepare(`INSERT INTO kt125_access_requests
   (request_id,organization_id,identity_provider,provider_subject,email,display_name,note,status,created_at_ms,updated_at_ms)
   SELECT ?,?,?,?,?,?,?,'pending',?,?
   WHERE EXISTS(SELECT 1 FROM kt125_users WHERE organization_id=? AND active=1 AND role='egmaster')
    AND NOT EXISTS(SELECT 1 FROM kt125_users WHERE identity_provider=? AND provider_subject=?)
    AND EXISTS(SELECT 1 FROM kt125_registration_challenges WHERE token_hash=? AND used=0 AND expires_at_ms>? AND verified_provider=? AND verified_subject=? AND email=?)
  `).bind(requestId,challenge.organization_id,who.issuer,who.subject,who.email,challenge.display_name,challenge.note,nowMs,nowMs,challenge.organization_id,who.issuer,who.subject,challenge.token_hash,nowMs,who.issuer,who.subject,who.email);
  const account=db.prepare(`INSERT INTO kt125_member_accounts(identity_provider,provider_subject,email,username,request_id)
   SELECT identity_provider,provider_subject,email,?,request_id FROM kt125_access_requests
   WHERE request_id=? AND changes()=1`).bind(challenge.username,requestId);
  const finish=db.prepare(`UPDATE kt125_registration_challenges SET used=1
   WHERE token_hash=? AND used=0 AND expires_at_ms>? AND changes()=1`).bind(challenge.token_hash,nowMs);
  // A final required sentinel makes zero-row/stale writes roll the whole batch back.
  const guard=db.prepare(`INSERT INTO kt125_auth_limits(bucket,window_start_ms,hits)
   VALUES((SELECT 'registration-'||token_hash FROM kt125_registration_challenges WHERE token_hash=? AND used=1 AND changes()=1),?,1)`
  ).bind(challenge.token_hash,nowMs);
  const result=await db.batch([insert,account,finish,guard]);
  return result?.length===4&&result.every(r=>r?.meta?.changes===1);
 }catch{return false}
}
export async function findMemberAccount(db,username){
 if(!usernameValue(username))return null;
 return db.prepare('SELECT identity_provider,provider_subject,email,username,request_id,credential_version,reset_until_ms,linked_user_id FROM kt125_member_accounts WHERE username=?').bind(username).first();
}
export async function memberCanEnter({db,who,request,nowMs,uuid}){
 const account=await db.prepare('SELECT linked_user_id FROM kt125_member_accounts WHERE identity_provider=? AND provider_subject=? AND email=?').bind(who.issuer,who.subject,who.email).first();
 if(account?.linked_user_id){
  const existing=await db.prepare('SELECT user_id,role,active FROM kt125_users WHERE user_id=?').bind(account.linked_user_id).first();
  return existing?.active===1&&['expert','reviewer','delegated_expert'].includes(existing.role)?existing:null;
 }
 let user=await db.prepare('SELECT user_id,role,active FROM kt125_users WHERE identity_provider=? AND provider_subject=?').bind(who.issuer,who.subject).first();
 if(!user){
  // After a manager approves, the FIRST password login accepts the matching invitation.
  const accepted=await acceptKT125Invitation({request,verifier:{verify:async()=>who},db,nowMs,uuid});
  if(accepted.ok)user=await db.prepare('SELECT user_id,role,active FROM kt125_users WHERE identity_provider=? AND provider_subject=?').bind(who.issuer,who.subject).first();
 }
 return user?.active===1&&['expert','reviewer','delegated_expert'].includes(user.role)?user:null;
}
export async function createMemberSession({db,who,nowMs,credentialVersion,token=randomToken()}){
 const r=await db.prepare(`INSERT INTO kt125_member_sessions(token_hash,identity_provider,provider_subject,created_at_ms,expires_at_ms,credential_version)
 SELECT ?,a.identity_provider,a.provider_subject,?,?,a.credential_version
 FROM kt125_member_accounts a JOIN kt125_users u ON (u.user_id=a.linked_user_id OR (a.linked_user_id IS NULL AND u.identity_provider=a.identity_provider AND u.provider_subject=a.provider_subject))
 WHERE a.identity_provider=? AND a.provider_subject=? AND a.email=? AND a.credential_version=? AND a.reset_until_ms<=? AND u.active=1 AND u.role IN ('expert','reviewer','delegated_expert') AND u.updated_at_ms<=?`)
 .bind(await digest(token),nowMs,nowMs+SESSION_MS,who.issuer,who.subject,who.email,credentialVersion,nowMs,nowMs).run();
 return r?.meta?.changes===1?token:null;
}
export async function beginPasswordReset({db,who,nowMs}){
 const row=await db.prepare(`UPDATE kt125_member_accounts SET credential_version=credential_version+1,reset_until_ms=?
 WHERE identity_provider=? AND provider_subject=? AND email=? AND reset_until_ms<=? RETURNING credential_version`)
 .bind(nowMs+60000,who.issuer,who.subject,who.email,nowMs).first();
 if(!row){
  const account=await db.prepare('SELECT username FROM kt125_member_accounts WHERE identity_provider=? AND provider_subject=?').bind(who.issuer,who.subject).first();
  if(account)throw Error('Reset already in progress');
  return null;
 }
 return row.credential_version;
}
export async function finishPasswordReset({db,who,version}){
 if(version!==null)await db.prepare('UPDATE kt125_member_accounts SET reset_until_ms=0 WHERE identity_provider=? AND provider_subject=? AND credential_version=?').bind(who.issuer,who.subject,version).run();
}
export async function sessionIdentity({request,db,issuer,nowMs}){
 const token=cookieValue(request,SESSION_COOKIE);if(!token)return null;
 try{
  const row=await db.prepare(`SELECT u.identity_provider,u.provider_subject,a.email,a.username,u.role,u.user_id
   FROM kt125_member_sessions s JOIN kt125_member_accounts a ON a.identity_provider=s.identity_provider AND a.provider_subject=s.provider_subject
   JOIN kt125_users u ON (u.user_id=a.linked_user_id OR (a.linked_user_id IS NULL AND u.identity_provider=s.identity_provider AND u.provider_subject=s.provider_subject))
   WHERE s.token_hash=? AND s.identity_provider=? AND s.expires_at_ms>? AND s.created_at_ms<=? AND u.active=1
    AND u.role IN ('expert','reviewer','delegated_expert') AND u.updated_at_ms<=s.created_at_ms AND s.credential_version=a.credential_version AND a.reset_until_ms<=?`).bind(await digest(token),issuer,nowMs,nowMs,nowMs).first();
  return row?{verified:true,issuer:row.identity_provider,subject:row.provider_subject,email:row.email,username:row.username,role:row.role,userId:row.user_id}:null;
 }catch{return null}
}
export async function deleteMemberSession(db,token){if(token)await db.prepare('DELETE FROM kt125_member_sessions WHERE token_hash=?').bind(await digest(token)).run();}
export async function deleteSubjectSessions(db,who){await db.prepare('DELETE FROM kt125_member_sessions WHERE identity_provider=? AND provider_subject=?').bind(who.issuer,who.subject).run();}
