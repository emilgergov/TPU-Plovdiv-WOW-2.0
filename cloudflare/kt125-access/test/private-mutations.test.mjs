import assert from "node:assert/strict";
import {createKT125PrivateHandler} from "../src/private-worker.mjs";
const now=1794891600000;
const origin="https://office.example.invalid";
const verifier={async verify(r){return r.headers.get("Cf-Access-Jwt-Assertion")==="verified"?
 {verified:true,issuer:"https://testing.cloudflareaccess.com",subject:"real-alice"}:{verified:false}}};
const actor={user_id:"alice",organization_id:"riosv-plovdiv",role:"expert",active:1};
const other={user_id:"bob",organization_id:"riosv-plovdiv",role:"delegated_expert",active:1};
const resource={case_id:"case-a",organization_id:"riosv-plovdiv",owner_id:"alice",status:"active"};
let count=0;
const uuid=()=> "kt125-id-"+(++count);
function makeDB({changes=[1,1],actorRow=actor,targetRow=other,caseRow=resource,failBatch=false}={}){
 const batches=[];
 return {batches,prepare(sql){return {bind(...params){return {sql,params,async first(){
  if(sql.includes("FROM kt125_users WHERE identity_provider"))return actorRow;
  if(sql.includes("FROM kt125_cases WHERE case_id"))return caseRow;
  if(sql.includes("FROM kt125_users WHERE user_id"))return targetRow;
  throw Error("Unexpected query");
 },async all(){return {results:[]}}
 }}}},async batch(stmts){
   batches.push(stmts);
   if(failBatch)throw Error("Transaction aborted");
   assert.equal(stmts.length,2);
   assert(stmts[1].sql.includes("kt125_audit"));
   return changes.map(value=>({meta:{changes:value}}));
 }};
}
const db=makeDB(), env={KT125_DB:db,
 KT125_ACCESS_TEAM_DOMAIN:"https://testing.cloudflareaccess.com",
 KT125_ACCESS_AUD:"kt125-test-application-audience",KT125_PRIVATE_ORIGIN:origin};
const handler=createKT125PrivateHandler({getVerifier:()=>verifier,clock:()=>now,uuid,auditEvent:async()=>true});
const body={granteeId:"bob",actions:["case.read"],notBeforeMs:now,expiresAtMs:now+100000};
function req(method,path,options={}){
 return new Request(origin+path,{
  method,headers:{"Origin":origin,"Sec-Fetch-Site":"same-origin",
    "Cf-Access-Jwt-Assertion":"verified",...(method==="POST"?{"Content-Type":"application/json"}:{}),
    ...(options.headers||{})},
  ...(method==="POST"?{body:JSON.stringify(options.body??body)}:{})
 });
}
const issuePath="/kt125/cases/case-a/grants";
const issue=await handler.fetch(req("POST",issuePath),env);
assert.equal(issue.status,201);
const issued=await issue.json();assert(issued.grantId.startsWith("kt125-id-"));
assert.equal(db.batches.length,1);
assert.equal((await handler.fetch(req("DELETE",issuePath+"/"+issued.grantId),env)).status,200);
assert.equal(db.batches.length,2);
for(const overridden of [
 {headers:{Origin:"https://evil.example.invalid"}},
 {headers:{"Sec-Fetch-Site":"cross-site"}},
 {headers:{"Cf-Access-Jwt-Assertion":"forged"}}
])assert.equal((await handler.fetch(req("POST",issuePath,overridden),env)).status,403);
assert.equal((await handler.fetch(req("POST",issuePath+"?override=1"),env)).status,403);
assert.equal((await handler.fetch(req("POST",issuePath),{...env,KT125_PRIVATE_ORIGIN:undefined})).status,403);
assert.equal((await handler.fetch(req("POST",issuePath,{body:{...body,actions:["case.delegate"]}}),env)).status,403);
assert.equal((await handler.fetch(req("POST",issuePath),{...env,KT125_DB:makeDB({actorRow:{...actor,role:"administrator"}})})).status,403);
assert.equal((await handler.fetch(req("POST",issuePath),{...env,KT125_DB:makeDB({changes:[0,0]})})).status,403);
assert.equal((await handler.fetch(req("POST",issuePath),{...env,KT125_DB:makeDB({failBatch:true})})).status,403);
assert.equal((await handler.fetch(req("DELETE",issuePath+"/grant-missing"),{...env,KT125_DB:makeDB({changes:[0,0]})})).status,403);
const oversize=req("POST",issuePath,{body:{...body,extra:"x".repeat(5000)}});
assert.equal((await handler.fetch(oversize,env)).status,413);
assert.equal((await handler.fetch(req("GET",issuePath),env)).status,200);
assert.equal((await handler.fetch(req("GET","/kt125/admin/users"),env)).status,403);
console.log("PASS KT125 private endpoints: write authorization, same-origin CSRF, signed principal, atomic audit, denial on stale grant/invalid roles/oversize.");
