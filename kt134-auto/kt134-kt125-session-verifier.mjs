/**
 * KT134 — independent read-only verification of EXISTING KT125 session.
 * Uses the same SHA-256 opaque-token digest and KT125 D1 session rows.
 * Never trusts a user ID, role, or session identifier supplied by the browser.
 * Never creates sessions or modifies accounts.
 */
const fail=code=>{const e=new Error(code);e.code=code;throw e};
const hex=bytes=>[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
const allowed=/^[a-zA-Z0-9_.-]{4,90}$/;
const decode=token=>{
 try{return decodeURIComponent(token)}catch{return ''}
};
export function createKt134Kt125SessionVerifier({db,cookieName,clock=()=>Date.now()}={}){
 if(typeof db?.prepare!=='function'||!allowed.test(cookieName||''))
   fail('KT125_SESSION_VERIFIER_NOT_CONFIGURED');
 const lookup=async digest=>{
  if(!/^[a-f0-9]{64}$/.test(digest||''))return null;
  const row=await db.prepare(
    'SELECT s.token_hash,s.credential_version AS session_credential_version,'+
    's.user_updated_at_ms,s.expires_at_ms,a.account_id,a.user_id,'+
    'a.organization_id,a.state AS account_state,a.activated_at_ms,'+
    'a.credential_version AS account_credential_version,u.role,u.active,'+
    'u.updated_at_ms,u.organization_id AS user_organization_id '+
    'FROM kt125_local_sessions s '+
    'JOIN kt125_local_accounts a ON a.account_id=s.account_id '+
    'JOIN kt125_users u ON u.user_id=a.user_id AND u.organization_id=a.organization_id '+
    'WHERE s.token_hash=? LIMIT 1'
  ).bind(digest).first();
  if(!row||Number(row.active)!==1||row.account_state!=='approved'||
     row.activated_at_ms==null||Number(row.expires_at_ms)<=clock()||
     Number(row.session_credential_version)!==Number(row.account_credential_version)||
     Number(row.user_updated_at_ms)!==Number(row.updated_at_ms)||
     row.organization_id!==row.user_organization_id||
     !['expert','egmaster','administrator','admin'].includes(String(row.role||'').toLowerCase()))
    return null;
  return {authenticated:true,sessionId:digest,
    principal:{authenticated:true,userId:row.user_id,organizationId:row.organization_id,
      role:row.role}};
 };
 const resolveKt125Session=async request=>{
  const raw=request.headers.get('cookie')||'';
  const values=raw.split(';').map(s=>s.trim()).filter(s=>s.startsWith(cookieName+'='));
  if(values.length!==1)return null;
  const token=decode(values[0].slice(cookieName.length+1));
  if(!/^[a-zA-Z0-9_-]{32,256}$/.test(token))return null;
  const d=hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))));
  return lookup(d);
 };
 const resolvePrincipal=async authenticatedSession=>{
  const row=await lookup(authenticatedSession);
  return row?.principal||null;
 };
 return Object.freeze({resolveKt125Session,resolvePrincipal});
}
