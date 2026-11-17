/**
 * KT125-VT02. Protected, read-only metadata APIs for an EGMASTER control
 * console. All identities and roles are resolved on the PRIVATE server from
 * a cryptographically verified Access assertion, never from the browser.
 * No dossier body, extracts, personal contact details, or AI prompts returned.
 */
const validId=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{1,160}$/.test(x);
const error=code=>Object.freeze({ok:false,code});
const success=data=>Object.freeze({ok:true,data});
export async function kt125ManagementPrincipal({request,verifier,db}={}){
 if(!request||typeof verifier?.verify!=="function"||typeof db?.prepare!=="function")
  return null;
 let assertion;
 try{assertion=await verifier.verify(request)}catch{return null}
 if(assertion?.verified!==true||!assertion.issuer||!assertion.subject)return null;
 try{
  const row=await db.prepare(
   "SELECT user_id,organization_id,role,active FROM kt125_users WHERE identity_provider=? AND provider_subject=?"
  ).bind(assertion.issuer,assertion.subject).first();
  if(!row||row.active!==1||!validId(row.user_id)||!validId(row.organization_id)||
     !["egmaster","administrator","expert","reviewer","delegated_expert"].includes(row.role))
   return null;
  return Object.freeze({userId:row.user_id,organizationId:row.organization_id,role:row.role});
 }catch{return null}
}
const ACTIONS=Object.freeze({
 users:{roles:["egmaster","administrator"],
  sql:"SELECT user_id,role,active,created_at_ms,updated_at_ms FROM kt125_users WHERE organization_id=? ORDER BY user_id ASC LIMIT 51"},
 cases:{roles:["egmaster","administrator"],
  sql:"SELECT case_id,owner_id,status,created_at_ms,updated_at_ms FROM kt125_cases WHERE organization_id=? ORDER BY created_at_ms DESC,case_id ASC LIMIT 51"},
 audit:{roles:["egmaster"],
  sql:"SELECT event_id,case_id,actor_id,action,outcome,timestamp_ms,request_id FROM kt125_audit WHERE organization_id=? ORDER BY timestamp_ms DESC,event_id ASC LIMIT 51"}
});
export async function readKT125Management({request,verifier,db,section}={}){
 if(!Object.hasOwn(ACTIONS,section))return error("UNKNOWN_SECTION");
 const actor=await kt125ManagementPrincipal({request,verifier,db});
 if(!actor)return error("NOT_VERIFIED");
 const config=ACTIONS[section];
 if(!config.roles.includes(actor.role))return error("ROLE_NOT_PERMITTED");
 let rows;
 try{
  rows=await db.prepare(config.sql).bind(actor.organizationId).all();
 }catch{return error("REGISTRY_UNAVAILABLE")}
 if(!Array.isArray(rows?.results))return error("REGISTRY_UNAVAILABLE");
 // No unbounded dump, no cross-org metadata, no arbitrary caller-supplied SQL.
 const fields=section==="users"
  ?["user_id","role","active","created_at_ms","updated_at_ms"]
  :section==="cases"
   ?["case_id","owner_id","status","created_at_ms","updated_at_ms"]
   :["event_id","case_id","actor_id","action","outcome","timestamp_ms","request_id"];
 const data=rows.results.slice(0,50).map(r=>Object.fromEntries(
  fields.map(k=>[k,r[k]??null])
 ));
 return success({section,items:data,hasMore:rows.results.length>50});
}
export async function readKT125CaseGrants({request,verifier,db,caseId}={}){
 if(!validId(caseId))return error("INVALID_CASE");
 const actor=await kt125ManagementPrincipal({request,verifier,db});
 if(!actor)return error("NOT_VERIFIED");
 if(!["egmaster","administrator","expert"].includes(actor.role))
  return error("ROLE_NOT_PERMITTED");
 try{
  const row=await db.prepare(
   "SELECT case_id,organization_id,owner_id,status FROM kt125_cases WHERE case_id=? AND organization_id=?"
  ).bind(caseId,actor.organizationId).first();
  if(!row)return error("CASE_NOT_ACCESSIBLE");
  // The expert can inspect delegation on own cases only; managers see
  // permission metadata but NEVER the underlying dossier content.
  if(actor.role==="expert"&&row.owner_id!==actor.userId)
   return error("CASE_NOT_ACCESSIBLE");
  const results=await db.prepare(
   "SELECT grant_id,grantee_id,grantor_id,actions_json,not_before_ms,expires_at_ms,revoked_at_ms "+
   "FROM kt125_grants WHERE case_id=? AND organization_id=? ORDER BY created_at_ms DESC LIMIT 51"
  ).bind(caseId,actor.organizationId).all();
  if(!Array.isArray(results?.results))return error("REGISTRY_UNAVAILABLE");
  const items=results.results.slice(0,50).map(g=>{
   let actions=[];try{const a=JSON.parse(g.actions_json);if(Array.isArray(a))actions=a.filter(x=>typeof x==="string").slice(0,6)}catch{}
   return {grantId:g.grant_id,granteeId:g.grantee_id,grantorId:g.grantor_id,
    actions,notBeforeMs:g.not_before_ms,expiresAtMs:g.expires_at_ms,
    revoked:g.revoked_at_ms!=null};
  });
  return success({caseId,ownerId:row.owner_id,status:row.status,
   items,hasMore:results.results.length>50});
 }catch{return error("REGISTRY_UNAVAILABLE")}
}
