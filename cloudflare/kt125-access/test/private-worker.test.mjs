import assert from "node:assert/strict";
import {createKT125PrivateHandler} from "../src/private-worker.mjs";
const now=Date.now();
const user={user_id:"expert-a",organization_id:"riosv-plovdiv",role:"expert",active:1};
const resource={case_id:"case-1",organization_id:"riosv-plovdiv",owner_id:"expert-a",status:"active"};
function db({registered=user,caseRow=resource,grants=[]}={}){
 return {prepare(sql){return {bind(...args){return {
  async first(){return sql.includes("kt125_users")?registered:
   sql.includes("kt125_cases")?caseRow:null},
  async all(){return {results:grants}}
 }}}}};
}
const env={KT125_DB:db(),KT125_ACCESS_TEAM_DOMAIN:"https://testing.cloudflareaccess.com",
 KT125_ACCESS_AUD:"kt125-audience-application"};
const verifier={async verify(request){return request.headers.get("Cf-Access-Jwt-Assertion")==="signed"?
 {verified:true,issuer:"https://testing.cloudflareaccess.com",subject:"provider-sub"}:
 {verified:false}}};
const handler=createKT125PrivateHandler({getVerifier:()=>verifier});
const req=(route,token="signed",method="GET")=>new Request("https://service.example.invalid"+route,{
 method,headers:{"Cf-Access-Jwt-Assertion":token,"X-Role":"egmaster"}
});
let result=await handler.fetch(req("/kt125/cases/case-1/access"),env);
assert.equal(result.status,200);
assert.deepEqual(await result.json(),{allowed:true,caseId:"case-1",action:"case.read"});
for(const [request,settings] of [
 [req("/kt125/cases/case-1/access",""),env],
 [req("/kt125/cases/case-1/access"),{...env,KT125_DB:db({registered:{...user,active:0}})}],
 [req("/kt125/cases/case-1/access"),{...env,KT125_DB:db({registered:{...user,user_id:"intruder"}})}],
 [req("/kt125/cases/case-1/access"),{...env,KT125_DB:db({caseRow:null})}],
 [req("/kt125/cases/case-1/access?user=expert-a"),env]
]){
 const response=await handler.fetch(request,settings);
 assert.equal(response.status,403);
 const body=JSON.stringify(await response.json());
 assert(!body.includes("expert-a")&&!body.includes("intruder"));
}
assert.equal((await handler.fetch(req("/kt125/cases/case-1/access"),{
 ...env,KT125_ACCESS_TEAM_DOMAIN:"https://fake.attacker.invalid"})).status,503);
assert.equal((await handler.fetch(req("/kt125/cases/case-1/access"),{
 ...env,KT125_DB:null})).status,503);
assert.equal((await handler.fetch(req("/kt125/cases/case-1/access","signed","POST"),env)).status,405);
assert.equal((await handler.fetch(req("/kt125/cases/case-1/document"),env)).status,404);
console.log("PASS KT125 private worker: no public dossier route, verified identity+DB enforced, no unauthorized case disclosures, no write routes.");
