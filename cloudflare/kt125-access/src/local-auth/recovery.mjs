import {id,token,purposeToken,equalToken,normalizeKT125Email} from './common.mjs';
export const RESET_SCHEMA=[
 `CREATE TABLE IF NOT EXISTS kt125_local_resets(
 reset_id TEXT PRIMARY KEY NOT NULL,account_id TEXT NOT NULL,credential_version INTEGER NOT NULL,
 nonce TEXT NOT NULL,expires_at_ms INTEGER NOT NULL,used_at_ms INTEGER,
 mail_state TEXT NOT NULL CHECK(mail_state IN ('queued','sending','accepted','failed','uncertain')),
 created_at_ms INTEGER NOT NULL,FOREIGN KEY(account_id) REFERENCES kt125_local_accounts(account_id))`,
 `CREATE INDEX IF NOT EXISTS idx_kt125_reset_account ON kt125_local_resets(account_id,created_at_ms)`
];
export const resetProof=(env,row)=>purposeToken(env,'reset',{...row,activation_nonce:row.nonce,activation_expires_ms:row.expires_at_ms});
export async function requestReset({db,config,email,now,uuid=()=>crypto.randomUUID()}){
 const address=normalizeKT125Email(email),resetId=uuid();if(!address||!id(resetId))return null;
 const r=await db.prepare(`INSERT INTO kt125_local_resets(reset_id,account_id,credential_version,nonce,expires_at_ms,mail_state,created_at_ms)
 SELECT ?,a.account_id,a.credential_version,?,?,'queued',? FROM kt125_local_accounts a JOIN kt125_users u ON u.user_id=a.user_id AND u.organization_id=a.organization_id
 WHERE a.email=? AND a.organization_id=? AND a.state='approved' AND a.activated_at_ms IS NOT NULL AND u.active=1 AND u.role=a.approved_role
 AND NOT EXISTS(SELECT 1 FROM kt125_local_resets r WHERE r.account_id=a.account_id AND r.created_at_ms>?)`)
 .bind(resetId,token(),now+30*60000,now,address,config.org,now-20*60000).run();
 return r?.meta?.changes===1?resetId:null;
}
export async function usableReset({db,config,env,resetId,proof,now}){
 if(!id(resetId)||typeof proof!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(proof))return null;
 const row=await db.prepare(`SELECT r.*,a.organization_id,a.email,a.display_name FROM kt125_local_resets r
 JOIN kt125_local_accounts a ON a.account_id=r.account_id AND a.credential_version=r.credential_version
 JOIN kt125_users u ON u.user_id=a.user_id AND u.organization_id=a.organization_id
 WHERE r.reset_id=? AND a.organization_id=? AND r.used_at_ms IS NULL AND r.expires_at_ms>?
 AND a.state='approved' AND a.activated_at_ms IS NOT NULL AND u.active=1 AND u.role=a.approved_role`)
 .bind(resetId,config.org,now).first();
 return row&&equalToken(proof,await resetProof(env,row))?row:null;
}
export async function completeReset({db,config,row,passwordHash,now,uuid=()=>crypto.randomUUID()}){
 const eventId=uuid(),auditId=uuid();if(!id(eventId)||!id(auditId)||eventId===auditId)return false;
 try{
 const update=db.prepare(`UPDATE kt125_local_accounts SET password_hash=?,credential_version=credential_version+1,updated_at_ms=?
 WHERE account_id=? AND organization_id=? AND credential_version=? AND state='approved' AND activated_at_ms IS NOT NULL
 AND EXISTS(SELECT 1 FROM kt125_local_resets r WHERE r.reset_id=? AND r.account_id=kt125_local_accounts.account_id AND r.credential_version=kt125_local_accounts.credential_version AND r.nonce=? AND r.used_at_ms IS NULL AND r.expires_at_ms>?)
 AND EXISTS(SELECT 1 FROM kt125_users u WHERE u.user_id=kt125_local_accounts.user_id AND u.organization_id=kt125_local_accounts.organization_id AND u.active=1 AND u.role=kt125_local_accounts.approved_role)`)
 .bind(passwordHash,now,row.account_id,config.org,row.credential_version,row.reset_id,row.nonce,now);
 const used=db.prepare('UPDATE kt125_local_resets SET used_at_ms=? WHERE reset_id=? AND used_at_ms IS NULL AND changes()=1').bind(now,row.reset_id);
 const audit=db.prepare(`INSERT INTO kt125_audit(event_id,organization_id,actor_id,action,outcome,timestamp_ms,request_id,details_json)
 VALUES(?,(SELECT a.organization_id FROM kt125_local_accounts a JOIN kt125_local_resets r ON r.account_id=a.account_id WHERE r.reset_id=? AND r.used_at_ms=? AND changes()=1),(SELECT user_id FROM kt125_local_accounts WHERE account_id=?),'users.local.password_reset','allowed',?,?,?)`)
 .bind(eventId,row.reset_id,now,row.account_id,now,auditId,JSON.stringify({account_id:row.account_id}));
 const purge=db.prepare('DELETE FROM kt125_local_sessions WHERE account_id=?').bind(row.account_id);
 const out=await db.batch([update,used,audit,purge]);return out?.length===4&&out.slice(0,3).every(r=>r.meta.changes===1);
 }catch{return false}
}
