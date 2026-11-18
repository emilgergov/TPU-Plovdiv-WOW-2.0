import {KT125_INVITATION_SCHEMA} from '../staff-invitations.mjs';
import {KT125_REQUEST_SCHEMA} from '../access-requests.mjs';
import {LOCAL_SCHEMA,id,username,normalizeKT125Email,digest,token,SESSION_MS,getCookie} from './common.mjs';
export async function setup(db){await db.batch([...KT125_INVITATION_SCHEMA,...KT125_REQUEST_SCHEMA,...LOCAL_SCHEMA].map(s=>db.prepare(s)));}
export function registration(data){
 const un=username(data.get('username')?.trim().toLowerCase()),email=normalizeKT125Email(data.get('email'));
 const name=data.get('name')?.trim(),note=data.get('note')||'';
 if(!un||!email||!name||name.length>80||/[\x00-\x1f\x7f]/.test(name)||note.length>1000||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(note))return null;
 return {username:un,email,name,note};
}
export async function register({db,config,input,passwordHash,now,uuid=()=>crypto.randomUUID()}){
 const accountId=uuid(),requestId=uuid();if(!id(accountId)||!id(requestId)||accountId===requestId)return false;
 try{
  const request=db.prepare(`INSERT INTO kt125_access_requests(request_id,organization_id,identity_provider,provider_subject,email,display_name,note,status,created_at_ms,updated_at_ms)
   SELECT ?,?,?,?,?,?,?,'pending',?,? WHERE EXISTS(SELECT 1 FROM kt125_users WHERE organization_id=? AND active=1 AND role='egmaster')`)
   .bind(requestId,config.org,config.issuer,accountId,input.email,input.name,input.note,now,now,config.org);
  const account=db.prepare(`INSERT INTO kt125_local_accounts(account_id,organization_id,request_id,username,email,password_hash,display_name,note,state,created_at_ms,updated_at_ms)
   SELECT provider_subject,organization_id,request_id,?,?,?,?,?,'pending',?,? FROM kt125_access_requests WHERE request_id=? AND changes()=1`)
   .bind(input.username,input.email,passwordHash,input.name,input.note,now,now,requestId);
  const guard=db.prepare(`INSERT INTO kt125_local_limits(bucket,started_ms,hits) VALUES((SELECT 'registered-'||account_id FROM kt125_local_accounts WHERE account_id=? AND changes()=1),?,1)`).bind(accountId,now);
  const out=await db.batch([request,account,guard]);return out?.length===3&&out.every(r=>r.meta.changes===1);
 }catch{return false}
}
export async function findAccount(db,name){if(!username(name))return null;return db.prepare(`SELECT account_id,organization_id,username,email,password_hash,state,approved_role,user_id,existing_user_id,credential_version,activation_nonce,activation_expires_ms,activated_at_ms FROM kt125_local_accounts WHERE username=?`).bind(name).first();}
export async function activate({db,config,account,now,uuid=()=>crypto.randomUUID()}){
 const newId=account.existing_user_id||uuid(),eventId=uuid(),requestId=uuid();
 if(![newId,eventId,requestId].every(id)||new Set([newId,eventId,requestId]).size!==3)return false;
 try{
  let statements=[];
  const proof=[account.account_id,account.credential_version,account.activation_nonce,now,config.org];
  if(!account.existing_user_id){
   statements.push(db.prepare(`INSERT INTO kt125_users(user_id,organization_id,identity_provider,provider_subject,role,active,created_at_ms,updated_at_ms,activation_pending)
    SELECT ?,a.organization_id,?,a.account_id,a.approved_role,1,?,?,0 FROM kt125_local_accounts a
    WHERE a.account_id=? AND a.credential_version=? AND a.activation_nonce=? AND a.activation_expires_ms>? AND a.organization_id=?
     AND a.state='approved' AND a.activated_at_ms IS NULL AND a.existing_user_id IS NULL
     AND a.approved_role IN ('expert','reviewer','delegated_expert')
     AND NOT EXISTS(SELECT 1 FROM kt125_staff_profiles p WHERE p.email=a.email AND p.organization_id=a.organization_id)`)
    .bind(newId,config.issuer,now,now,...proof));
   statements.push(db.prepare(`INSERT INTO kt125_staff_profiles(user_id,organization_id,identity_provider,email,display_name)
    SELECT ?,organization_id,?,email,display_name FROM kt125_local_accounts WHERE account_id=? AND changes()=1`).bind(newId,config.issuer,account.account_id));
  }
  const prior=account.existing_user_id?'':" AND changes()=1";
  statements.push(db.prepare(`UPDATE kt125_local_accounts SET user_id=?,activated_at_ms=?,activation_nonce=NULL,activation_expires_ms=NULL,updated_at_ms=?
   WHERE account_id=? AND credential_version=? AND activation_nonce=? AND activation_expires_ms>? AND organization_id=?
    AND state='approved' AND activated_at_ms IS NULL${prior}
    AND EXISTS(SELECT 1 FROM kt125_users u WHERE u.user_id=? AND u.organization_id=kt125_local_accounts.organization_id AND u.active=1 AND u.role=kt125_local_accounts.approved_role)`)
   .bind(newId,now,now,...proof,newId));
  statements.push(db.prepare(`INSERT INTO kt125_audit(event_id,organization_id,actor_id,action,outcome,timestamp_ms,request_id,details_json)
   VALUES(?,(SELECT organization_id FROM kt125_local_accounts WHERE account_id=? AND user_id=? AND activated_at_ms=? AND changes()=1),?,'users.local.activate','allowed',?,?,?)`)
   .bind(eventId,account.account_id,newId,now,newId,now,requestId,JSON.stringify({account_id:account.account_id})));
  const out=await db.batch(statements);return out?.length===statements.length&&out.every(r=>r.meta.changes===1);
 }catch{return false}
}
export async function createSession({db,account,now,sessionToken=token()}){
 const r=await db.prepare(`INSERT INTO kt125_local_sessions(token_hash,account_id,credential_version,user_updated_at_ms,created_at_ms,expires_at_ms)
  SELECT ?,a.account_id,a.credential_version,u.updated_at_ms,?,? FROM kt125_local_accounts a JOIN kt125_users u ON u.user_id=a.user_id AND u.organization_id=a.organization_id
  WHERE a.account_id=? AND a.credential_version=? AND a.state='approved' AND a.activated_at_ms IS NOT NULL AND u.active=1 AND u.role=a.approved_role`)
 .bind(await digest(sessionToken),now,now+SESSION_MS,account.account_id,account.credential_version).run();return r?.meta?.changes===1?sessionToken:null;
}
export async function identity({db,request,config,now}){
 const t=getCookie(request);if(!t)return null;
 try{const row=await db.prepare(`SELECT u.identity_provider,u.provider_subject,u.user_id,u.role,a.username,a.email
 FROM kt125_local_sessions s JOIN kt125_local_accounts a ON a.account_id=s.account_id JOIN kt125_users u ON u.user_id=a.user_id AND u.organization_id=a.organization_id
 WHERE s.token_hash=? AND a.organization_id=? AND a.state='approved' AND a.activated_at_ms IS NOT NULL
  AND s.credential_version=a.credential_version AND s.user_updated_at_ms=u.updated_at_ms
  AND s.expires_at_ms>? AND s.created_at_ms<=? AND u.active=1 AND u.role=a.approved_role`)
 .bind(await digest(t),config.org,now,now).first();return row?{verified:true,issuer:row.identity_provider,subject:row.provider_subject,userId:row.user_id,role:row.role,username:row.username,email:row.email}:null;
 }catch{return null}
}
export async function logout(db,request){const t=getCookie(request);if(t)await db.prepare('DELETE FROM kt125_local_sessions WHERE token_hash=?').bind(await digest(t)).run();}
