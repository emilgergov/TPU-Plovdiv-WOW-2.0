// KT84-02 · Private Worker API. Never deploy to the existing EG Author worker.
// Cloudflare Access must protect the Worker itself; ctx.access is the trusted
// authentication context. No browser-supplied actor or role is accepted.
import {authorize,validateGrant,KT84_ACTIONS as A} from './access-policy.mjs';
const json=(obj,status=200)=>new Response(JSON.stringify(obj),{
 status,headers:{'content-type':'application/json; charset=utf-8',
 'cache-control':'no-store','x-content-type-options':'nosniff',
 'referrer-policy':'no-referrer','content-security-policy':"default-src 'none'",
 'x-frame-options':'DENY'}
});
const fail=(status,code)=>json({ok:false,code},status);
const timestamp=()=>Math.floor(Date.now()/1000);
const uuid=()=>crypto.randomUUID();
const grantable=new Set([A.READ,A.EDIT,A.REVIEW,A.EXPORT]);
async function actorFromAccess(ctx,db){
 // NEVER use Cf-Access-Authenticated-User-Email or request body as identity.
 if(!ctx?.access?.getIdentity)return null;
 let identity;
 try{identity=await ctx.access.getIdentity()}catch{return null}
 const uid=identity?.id;
 if(typeof uid!=='string'||!uid||uid.length>200)return null;
 const row=await db.prepare('SELECT user_id,org_id,role,status FROM users WHERE user_id=?')
  .bind(uid).first();
 if(!row||row.status!=='active')return null;
 return {subject:row.user_id,orgId:row.org_id,role:row.role,
  status:row.status,verifiedByGateway:true};
}
async function getCase(db,id){
 return db.prepare('SELECT case_id AS id,org_id AS orgId,owner_id AS ownerId,status,version,subject FROM cases WHERE case_id=?')
  .bind(id).first();
}
async function getGrants(db,record,actor,now){
 const r=await db.prepare(`SELECT case_id AS caseId,org_id AS orgId,grantee_id AS granteeId,
  granted_by AS grantedBy,actions_json,expires_at AS expiresAt,status
  FROM case_grants WHERE case_id=? AND org_id=? AND grantee_id=? AND status='active' AND expires_at>?`)
  .bind(record.id,actor.orgId,actor.subject,now).all();
 return (r.results||[]).map(g=>({...g,actions:safeActions(g.actions_json)}));
}
function safeActions(s){
 try{const x=JSON.parse(s);return Array.isArray(x)&&x.every(a=>grantable.has(a))?x:[]}catch{return []}
}
async function allowed(db,actor,record,action,now,expectedVersion){
 const grants=await getGrants(db,record,actor,now);
 return authorize({principal:actor,caseRecord:record,action,grants,now,expectedVersion});
}
async function audit(db,{actor,caseId,action,result,version,requestId}){
 // No dossier contents, tokens, file names or body data are logged.
 await db.prepare(`INSERT INTO audit_events
 (event_id,time,request_id,actor_id,org_id,case_id,action,result,version)
 VALUES (?,?,?,?,?,?,?,?,?)`)
 .bind(uuid(),timestamp(),requestId,actor?.subject||null,actor?.orgId||null,
 caseId||null,action,result,Number.isSafeInteger(version)?version:null).run();
}
async function bodyJSON(request){
 if(request.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')return null;
 if(Number(request.headers.get('content-length')||0)>16384)return null;
 const raw=await request.text();
 if(raw.length>16384)return null;
 try{return JSON.parse(raw)}catch{return null}
}
const validText=(x,max)=>typeof x==='string'&&x.trim().length>0&&x.length<=max;
const casePath=/^\/v1\/cases\/([0-9a-f-]{36})$/i;
const grantsPath=/^\/v1\/cases\/([0-9a-f-]{36})\/grants$/i;
const revokePath=/^\/v1\/cases\/([0-9a-f-]{36})\/grants\/([0-9a-f-]{36})$/i;
function sameOrigin(request){
 const origin=request.headers.get('origin');
 if(!origin)return true; // machine API calls still require Access.
 return origin===new URL(request.url).origin;
}
export default {
 async fetch(request,env,ctx){
  // Fail closed until real bindings and an Access-protected Worker are configured.
  if(!env?.PRIVATE_DB||!env?.PRIVATE_FILES||!ctx?.access)
   return fail(503,'PRIVATE_ACCESS_NOT_CONFIGURED');
  if(!sameOrigin(request))return fail(403,'CROSS_ORIGIN_BLOCKED');
  const actor=await actorFromAccess(ctx,env.PRIVATE_DB);
  if(!actor)return fail(403,'ACCESS_REQUIRED');
  const db=env.PRIVATE_DB,now=timestamp(),requestId=uuid();
  const url=new URL(request.url),path=url.pathname;
  try{
   if(request.method==='GET'&&path==='/v1/me')
    return json({ok:true,user:{id:actor.subject,role:actor.role,orgId:actor.orgId}});
   if(request.method==='GET'&&path==='/v1/cases'){
    // Only own cases + explicit unexpired grants, all constrained to same org.
    const rs=await db.prepare(`SELECT DISTINCT c.case_id AS id,c.subject,c.status,c.version,
     c.owner_id AS ownerId,c.updated_at AS updatedAt
     FROM cases c LEFT JOIN case_grants g
     ON g.case_id=c.case_id AND g.org_id=c.org_id AND g.grantee_id=?
     AND g.status='active' AND g.expires_at>?
     WHERE c.org_id=? AND c.status='active' AND
     (c.owner_id=? OR (g.grant_id IS NOT NULL AND instr(g.actions_json,'"case.read"')>0))
     ORDER BY c.updated_at DESC LIMIT 100`)
     .bind(actor.subject,now,actor.orgId,actor.subject).all();
    return json({ok:true,cases:rs.results||[]});
   }
   if(request.method==='POST'&&path==='/v1/cases'){
    if(actor.role!=='expert')return fail(403,'EXPERT_ONLY');
    const b=await bodyJSON(request);
    if(!b||!validText(b.subject,1000))return fail(400,'INVALID_CASE_INPUT');
    const id=uuid();
    await db.batch([
     db.prepare(`INSERT INTO cases
      (case_id,org_id,owner_id,status,version,subject,created_at,updated_at)
      VALUES (?,?,?,'active',1,?,?,?)`).bind(id,actor.orgId,actor.subject,b.subject.trim(),now,now),
     db.prepare('INSERT INTO case_revisions(case_id,version,editor_id,changed_at) VALUES (?,1,?,?)')
       .bind(id,actor.subject,now)
    ]);
    await audit(db,{actor,caseId:id,action:'case.create',result:'allowed',version:1,requestId});
    return json({ok:true,id,version:1},201);
   }
   const match=path.match(casePath),grantMatch=path.match(grantsPath),revokeMatch=path.match(revokePath);
   const caseId=(match||grantMatch||revokeMatch)?.[1];
   if(!caseId)return fail(404,'NOT_FOUND');
   const record=await getCase(db,caseId);
   if(!record||record.orgId!==actor.orgId)return fail(404,'NOT_FOUND');
   if(match&&request.method==='GET'){
    const p=await allowed(db,actor,record,A.READ,now);
    await audit(db,{actor,caseId,action:A.READ,result:p.code,version:record.version,requestId});
    return p.allowed?json({ok:true,case:record}):fail(404,'NOT_FOUND');
   }
   if(match&&request.method==='PATCH'){
    const b=await bodyJSON(request);
    if(!b||!validText(b.subject,1000)||!Number.isSafeInteger(b.version))
     return fail(400,'INVALID_CASE_INPUT');
    const p=await allowed(db,actor,record,A.EDIT,now,b.version);
    if(!p.allowed){await audit(db,{actor,caseId,action:A.EDIT,result:p.code,version:record.version,requestId});return fail(p.code==='VERSION_CONFLICT'?409:403,p.code)}
    // Atomic compare-and-swap avoids silent lost updates. A new request
    // must be re-authorized after any simultaneous grant revocation.
    const out=await db.prepare(`UPDATE cases SET subject=?,version=version+1,updated_at=?
      WHERE case_id=? AND org_id=? AND version=? AND status='active' AND
      (owner_id=? OR EXISTS(SELECT 1 FROM case_grants g WHERE
       g.case_id=cases.case_id AND g.org_id=cases.org_id AND
       g.grantee_id=? AND g.granted_by=cases.owner_id AND g.status='active'
       AND g.expires_at>? AND instr(g.actions_json,'"case.edit"')>0))`)
       .bind(b.subject.trim(),now,caseId,actor.orgId,b.version,actor.subject,actor.subject,now).run();
    if(out.meta?.changes!==1)return fail(409,'CONCURRENT_CHANGE_OR_REVOKED_GRANT');
    const version=b.version+1;
    await db.prepare('INSERT INTO case_revisions(case_id,version,editor_id,changed_at) VALUES (?,?,?,?)')
      .bind(caseId,version,actor.subject,now).run();
    await audit(db,{actor,caseId,action:A.EDIT,result:'allowed',version,requestId});
    return json({ok:true,id:caseId,version});
   }
   if(grantMatch&&request.method==='POST'){
    const b=await bodyJSON(request);
    if(!b||!validText(b.granteeId,200)||!Number.isSafeInteger(b.expiresAt)||
      !Array.isArray(b.actions))return fail(400,'INVALID_GRANT');
    const user=await db.prepare('SELECT user_id AS subject,org_id AS orgId,role,status FROM users WHERE user_id=?')
      .bind(b.granteeId).first();
    const chk=validateGrant({actor,caseRecord:record,grantee:user,actions:b.actions,
      expiresAt:b.expiresAt,now});
    if(!chk.allowed)return fail(403,chk.code);
    const grantId=uuid();
    await db.prepare(`INSERT INTO case_grants
     (grant_id,case_id,org_id,grantee_id,granted_by,actions_json,expires_at,status,created_at)
     VALUES (?,?,?,?,?,?,?,'active',?)`)
     .bind(grantId,caseId,actor.orgId,user.subject,actor.subject,
       JSON.stringify(b.actions),b.expiresAt,now).run();
    await audit(db,{actor,caseId,action:A.SHARE,result:'allowed',version:record.version,requestId});
    return json({ok:true,grantId},201);
   }
   if(revokeMatch&&request.method==='DELETE'){
    if(actor.subject!==record.ownerId)return fail(403,'OWNER_ONLY');
    const grantId=revokeMatch[2];
    const out=await db.prepare(`UPDATE case_grants SET status='revoked',revoked_at=?
      WHERE grant_id=? AND case_id=? AND org_id=? AND status='active'`)
      .bind(now,grantId,caseId,actor.orgId).run();
    await audit(db,{actor,caseId,action:'case.share.revoke',result:out.meta?.changes?'allowed':'not_found',version:record.version,requestId});
    return out.meta?.changes?json({ok:true}):fail(404,'GRANT_NOT_FOUND');
   }
   return fail(405,'METHOD_NOT_ALLOWED');
  }catch(_){
   // Never leak D1 errors, document details, identities or stack traces.
   return fail(503,'PRIVATE_SERVICE_UNAVAILABLE');
  }
 }
};
