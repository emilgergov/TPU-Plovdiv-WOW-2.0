import {authorizeKT125} from "./authorization-policy.mjs";

/**
 * KT125 server-side service boundary. Not a public login endpoint.
 * All identity evidence comes from an independently configured/verifying
 * server-side adapter. The HTTP request's user/role/org/body is NEVER trusted.
 * D1-compatible persistence is a binding on the private Worker, not GitHub Pages.
 */
const deny=reason=>Object.freeze({allowed:false,reason});
const str=v=>typeof v==="string"?v.trim():"";
const stableId=v=>str(v).length>0&&str(v).length<=200;
/**
 * The application must inject a trusted verifier implementation via this
 * server-only dependency. A verifier must validate an actual identity-provider
 * signature, audience, expiry and issuer; calling it is not proof by itself.
 */
export async function authorizeKT125CaseRequest({
 request,identityVerifier,db,action,caseId,nowMs=Date.now()
}={}){
 if(!identityVerifier||typeof identityVerifier.verify!=="function"||!db||
    typeof db.prepare!=="function")return deny("AUTH_SERVICE_UNCONFIGURED");
 if(!request||!stableId(caseId)||!Number.isFinite(nowMs))
  return deny("INVALID_ACCESS_REQUEST");
 let assertion;
 try{assertion=await identityVerifier.verify(request)}
 catch{return deny("IDENTITY_VERIFICATION_FAILED")}
 if(assertion?.verified!==true||!stableId(assertion.issuer)||
    !stableId(assertion.subject))return deny("IDENTITY_VERIFICATION_FAILED");

 let user;
 try{
  user=await db.prepare(
   "SELECT user_id, organization_id, role, active FROM kt125_users WHERE identity_provider = ? AND provider_subject = ?"
  ).bind(assertion.issuer,assertion.subject).first();
 }catch{return deny("IDENTITY_REGISTRY_UNAVAILABLE")}
 if(!user||user.active!==1||!stableId(user.user_id)||!stableId(user.organization_id))
  return deny("NO_ACTIVE_REGISTERED_USER");
 const principal={verified:true,userId:user.user_id,organizationId:user.organization_id,roles:[user.role],disabled:false};

 let resource;
 try{
  resource=await db.prepare(
   "SELECT case_id, organization_id, owner_id, status FROM kt125_cases WHERE case_id = ?"
  ).bind(caseId).first();
 }catch{return deny("CASE_REGISTRY_UNAVAILABLE")}
 if(!resource)return deny("CASE_NOT_ACCESSIBLE");

 let rows;
 try{
  rows=await db.prepare(
   "SELECT case_id,organization_id,grantor_id,grantee_id,actions_json,not_before_ms,expires_at_ms,revoked_at_ms FROM kt125_grants WHERE case_id = ? AND grantee_id = ?"
  ).bind(caseId,principal.userId).all();
 }catch{return deny("GRANTS_UNAVAILABLE")}
 const grants=(Array.isArray(rows?.results)?rows.results:[]).map(g=>{
  let actions;
  try{actions=JSON.parse(g.actions_json)}catch{actions=[]}
  return {caseId:g.case_id,organizationId:g.organization_id,
   grantorId:g.grantor_id,granteeId:g.grantee_id,actions,
   active:true,revoked:g.revoked_at_ms!=null,
   notBeforeMs:g.not_before_ms,expiresAtMs:g.expires_at_ms};
 });
 return authorizeKT125({principal,resource:{
  caseId:resource.case_id,organizationId:resource.organization_id,
  ownerId:resource.owner_id,status:resource.status
 },action,grants,nowMs});
}
// API handlers must not reveal whether a denied case exists or who owns it.
// Audit is recorded separately by the private service using a transaction;
// an unavailable audit sink must prevent sensitive state changes.
export function kt125PublicDenialResponse(){
 return new Response(JSON.stringify({error:"Достъпът до преписката е отказан."}),
  {status:403,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
}
