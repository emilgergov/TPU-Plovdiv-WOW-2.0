import assert from "node:assert/strict";
import {createKT125PrivateHandler} from "../src/private-worker.mjs";
import {renderKT125GrantManagement} from "../src/grant-admin-page.mjs";
const team="https://testing.cloudflareaccess.com",origin="https://office.example.invalid",now=1794891600000;
let counter=0;const uuid=()=> "grant-id-"+(++counter);
const verifier={async verify(req){return req.headers.get("Cf-Access-Jwt-Assertion")==="signed"?
 {verified:true,issuer:team,subject:"person"}:{verified:false}}};
function db({role="expert",userId="owner",caseOwner="owner",status="active",change=[1,1]}={}){
 const changes=[],calls=[];
 return {changes,calls,prepare(sql){
  return {bind(...args){calls.push({sql,args});return {sql,args,
   async first(){
    if(sql.includes("identity_provider"))return {user_id:userId,organization_id:"riosv",role,active:1};
    if(sql.includes("FROM kt125_cases"))return {case_id:"case-a",owner_id:caseOwner,organization_id:"riosv",status};
    if(sql.includes("FROM kt125_users WHERE user_id"))return {user_id:args[0],organization_id:"riosv",role:"expert",active:1};
    return null;
   },async all(){
    if(sql.includes("FROM kt125_grants WHERE case_id"))return {results:[{
      grant_id:"grant-a",grantee_id:"delegate",grantor_id:"owner",
      actions_json:'["case.read","case.review"]',not_before_ms:now-1000,
      expires_at_ms:now+10000,revoked_at_ms:null
    }]};
    return {results:[]};
   }
  }}};
 },async batch(statements){
  changes.push(statements);
  assert.equal(statements.length,2);
  assert(statements[1].sql.includes("kt125_audit"));
  return change.map(n=>({meta:{changes:n}}));
 }};
}
const handler=createKT125PrivateHandler({getVerifier:()=>verifier,
 clock:()=>now,uuid,auditEvent:async()=>true});
const env=database=>({KT125_DB:database,KT125_ACCESS_TEAM_DOMAIN:team,
 KT125_ACCESS_AUD:"kt125-private-application-audience",KT125_PRIVATE_ORIGIN:origin});
const path="/kt125/cases/case-a";
function req(method,endpoint,body=null,overrides={}){
 return new Request(origin+endpoint,{method,headers:{
  "Cf-Access-Jwt-Assertion":"signed","Origin":origin,"Sec-Fetch-Site":"same-origin",
  "Content-Type":"application/x-www-form-urlencoded",...(overrides.headers||{})
 },...(body!==null?{body}:{})});
}
let result=await handler.fetch(req("GET",path+"/manage"),env(db()));
assert.equal(result.status,200);
let html=await result.text();
assert(html.includes('action="'+path+'/grants/form"'));
assert(html.includes('action="'+path+'/grants/grant-a/revoke"'));
assert(html.includes('name="confirm" value="GRANT"'));
assert(html.includes('name="confirm" value="REVOKE"'));
assert(html.includes("Предостави достъп"));
assert(!html.includes("<script"));
assert.equal(result.headers.get("cache-control"),"no-store, private");

for(const options of [{role:"administrator",userId:"admin"},{role:"egmaster",userId:"master"},
 {role:"expert",userId:"owner",status:"archived"}]){
 result=await handler.fetch(req("GET",path+"/manage"),env(db(options)));
 assert.equal(result.status,200);
 html=await result.text();
 assert(!html.includes('action="'+path+'/grants/form"'));
 assert(!html.includes('action="'+path+'/grants/grant-a/revoke"'));
}
assert.equal((await handler.fetch(req("GET",path+"/manage"),env(db({role:"expert",userId:"other"})))).status,403);
assert.equal((await handler.fetch(req("GET",path+"/manage",null,{headers:{"Cf-Access-Jwt-Assertion":"fake"}}),env(db()))).status,403);
const valid="grantee=delegate&action=case.read&action=case.review&confirm=GRANT";
const ownerDb=db();
result=await handler.fetch(req("POST",path+"/grants/form",valid),env(ownerDb));
assert.equal(result.status,303);
assert.equal(result.headers.get("location"),path+"/manage");
assert.equal(ownerDb.changes.length,1);
const inserted=ownerDb.changes[0][0].args;
assert(inserted.includes("delegate"));
assert(inserted.includes(now+7*24*60*60*1000));
assert(inserted.includes('["case.read","case.review"]'));

const revokeDb=db();
result=await handler.fetch(req("POST",path+"/grants/grant-a/revoke","confirm=REVOKE"),env(revokeDb));
assert.equal(result.status,303);
assert.equal(revokeDb.changes.length,1);
assert(revokeDb.changes[0][0].args.includes("grant-a"));
for(const payload of [
 "grantee=delegate&action=case.read",
 "grantee=delegate&action=case.delegate&confirm=GRANT",
 "grantee=delegate&action=case.read&action=case.read&confirm=GRANT",
 "grantee=delegate&action=case.read&confirm=GRANT&role=egmaster",
 "grantee=delegate&action=case.read&confirm=GRANT&confirm=GRANT",
 "grantee=owner&action=case.read&confirm=GRANT"
]){
 const r=await handler.fetch(req("POST",path+"/grants/form",payload),env(db()));
 assert([400,403].includes(r.status),payload);
}
assert.equal((await handler.fetch(req("POST",path+"/grants/form",valid),env(db({role:"administrator",userId:"admin"})))).status,403);
assert.equal((await handler.fetch(req("POST",path+"/grants/form",valid),env(db({role:"expert",userId:"former",caseOwner:"owner"})))).status,403);
assert.equal((await handler.fetch(req("POST",path+"/grants/form",valid,{headers:{Origin:"https://evil.invalid"}}),env(db()))).status,403);
assert.equal((await handler.fetch(req("POST",path+"/grants/grant-a/revoke","confirm=wrong"),env(db()))).status,400);
assert.equal((await handler.fetch(req("POST",path+"/grants/grant-a/revoke","confirm=REVOKE&other=1"),env(db()))).status,400);
assert.equal((await handler.fetch(req("POST",path+"/grants/grant-a/revoke","confirm=REVOKE"),env(db({role:"administrator",userId:"admin"})))).status,403);
assert.throws(()=>renderKT125GrantManagement({caseId:"<script>",ownerId:"owner"}));
const hostile=renderKT125GrantManagement({caseId:"case-a",ownerId:"owner",status:"active",canChange:false,
 items:[{granteeId:'<img src=x onerror=alert(1)>',grantId:"grant-a",
 actions:["case.read","case.delegate"],revoked:false,expiresAtMs:now+1000}]});
assert(!hostile.includes("<img"));
assert(!hostile.includes("case.delegate"));
console.log("PASS KT125-VT02.2: owner-only private forms, exact confirmations, 7-day scope, revocation, manager read-only, malformed/foreign requests denied.");
