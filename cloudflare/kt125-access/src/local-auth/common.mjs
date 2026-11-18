import {normalizeKT125Email} from '../identity-email.mjs';
export {normalizeKT125Email};
export const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(v);
export const username=v=>typeof v==='string'&&/^[a-z0-9][a-z0-9._-]{2,39}$/.test(v)&&!['egmaster','administrator','admin','root','system'].includes(v)?v:null;
export const roles=new Set(['expert','reviewer','delegated_expert']);
export const SESSION_COOKIE='__Host-wow-local';
export const SESSION_MS=24*3600000;
export async function digest(v){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)))].map(b=>b.toString(16).padStart(2,'0')).join('')}
export const token=()=>btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
export const cookie=(value,age)=>`${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
export function getCookie(request){const values=(request.headers.get('Cookie')||'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(SESSION_COOKIE+'='));const t=values.length===1?values[0].slice(SESSION_COOKIE.length+1):'';return /^[A-Za-z0-9_-]{43}$/.test(t)?t:null;}
export function localConfig(env){
 try{const u=new URL(env.KT125_LOCAL_ORIGIN);
 if(env.KT125_LOCAL_ENABLED!=='true'||u.protocol!=='https:'||u.origin!==env.KT125_LOCAL_ORIGIN||!id(env.KT125_REQUEST_ORGANIZATION)||typeof env.KT125_AUTH_SECRET!=='string'||!/^[a-f0-9]{64}$/.test(env.KT125_AUTH_SECRET)||!env.KT125_DB)return null;
 return {origin:u.origin,issuer:u.origin+'/kt125/local-auth',org:env.KT125_REQUEST_ORGANIZATION};}catch{return null}
}
export async function purposeToken(env,purpose,account){
 const key=await crypto.subtle.importKey('raw',Uint8Array.from(env.KT125_AUTH_SECRET.match(/../g),v=>parseInt(v,16)),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const value=[purpose,account.account_id,account.credential_version,account.activation_nonce,account.activation_expires_ms].join(':');
 const signature=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value));
 return btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}
export function equalToken(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==43||b.length!==43)return false;let diff=0;for(let i=0;i<43;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
export const LOCAL_SCHEMA=[
 `CREATE TABLE IF NOT EXISTS kt125_local_accounts (
 account_id TEXT PRIMARY KEY NOT NULL,organization_id TEXT NOT NULL,
 request_id TEXT NOT NULL UNIQUE,username TEXT NOT NULL UNIQUE,email TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL,display_name TEXT NOT NULL,note TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('pending','approved','rejected')),
 approved_role TEXT CHECK(approved_role IN ('egmaster','administrator','expert','reviewer','delegated_expert')),
 user_id TEXT UNIQUE,existing_user_id TEXT,credential_version INTEGER NOT NULL DEFAULT 0,
 activation_nonce TEXT,activation_expires_ms INTEGER,activated_at_ms INTEGER,
 created_at_ms INTEGER NOT NULL,updated_at_ms INTEGER NOT NULL,
 FOREIGN KEY(request_id) REFERENCES kt125_access_requests(request_id),
 FOREIGN KEY(user_id,organization_id) REFERENCES kt125_users(user_id,organization_id),
 FOREIGN KEY(existing_user_id,organization_id) REFERENCES kt125_users(user_id,organization_id))`,
 `CREATE TABLE IF NOT EXISTS kt125_local_sessions (
 token_hash TEXT PRIMARY KEY NOT NULL,account_id TEXT NOT NULL,credential_version INTEGER NOT NULL,
 user_updated_at_ms INTEGER NOT NULL,created_at_ms INTEGER NOT NULL,expires_at_ms INTEGER NOT NULL,
 FOREIGN KEY(account_id) REFERENCES kt125_local_accounts(account_id))`,
 `CREATE INDEX IF NOT EXISTS idx_kt125_local_session_account ON kt125_local_sessions(account_id)`,
 `CREATE TABLE IF NOT EXISTS kt125_local_outbox (
 mail_id TEXT PRIMARY KEY NOT NULL,account_id TEXT NOT NULL,organization_id TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('queued','sending','accepted','failed','uncertain')),
 created_at_ms INTEGER NOT NULL,attempt_at_ms INTEGER,
 FOREIGN KEY(account_id) REFERENCES kt125_local_accounts(account_id))`,
 `CREATE TRIGGER IF NOT EXISTS kt125_revoke_local_sessions AFTER UPDATE OF active,role,updated_at_ms ON kt125_users
 WHEN OLD.active<>NEW.active OR OLD.role<>NEW.role OR OLD.updated_at_ms<>NEW.updated_at_ms
 BEGIN
 DELETE FROM kt125_local_sessions WHERE account_id IN (SELECT account_id FROM kt125_local_accounts WHERE user_id=NEW.user_id);
 UPDATE kt125_local_accounts SET credential_version=credential_version+1,approved_role=NEW.role WHERE user_id=NEW.user_id;
 END`,
 `CREATE TABLE IF NOT EXISTS kt125_local_limits(bucket TEXT PRIMARY KEY NOT NULL,started_ms INTEGER NOT NULL,hits INTEGER NOT NULL)`
];
export async function rateLimit(db,key,limit,window,now){const row=await db.prepare(`INSERT INTO kt125_local_limits(bucket,started_ms,hits) VALUES(?,?,1)
 ON CONFLICT(bucket) DO UPDATE SET hits=CASE WHEN started_ms<=? THEN 1 ELSE hits+1 END,started_ms=CASE WHEN started_ms<=? THEN excluded.started_ms ELSE started_ms END RETURNING hits`).bind(await digest(key),now,now-window,now-window).first();return row?.hits<=limit;}
