import assert from "node:assert/strict";
import {createKT125PrivateHandler} from "../src/private-worker.mjs";
import {renderKT125PrivatePage} from "../src/private-admin-page.mjs";
const origin="https://office.example.invalid";
const team="https://testing.cloudflareaccess.com";
let sequence=0;
const uuid=()=>"enroll-"+(++sequence);
const verifier={async verify(req){return req.headers.get("Cf-Access-Jwt-Assertion")==="valid"?
 {verified:true,issuer:team,subject:"manager-sub"}:{verified:false};}};
function db(role="egmaster"){
 const writes=[];
 return {writes,prepare(sql){return {bind(...args){return {
  sql,args,async first(){return {user_id:"manager",organization_id:"riosv-plovdiv",role,active:1};},
  async all(){return {results:[]};}
 };}};},async batch(stmts){writes.push(stmts);return [{meta:{changes:1}},{meta:{changes:1}}];}};
}
const handler=createKT125PrivateHandler({getVerifier:()=>verifier,uuid,clock:()=>1794891600000});
const env=d=>({KT125_DB:d,KT125_ACCESS_TEAM_DOMAIN:team,
 KT125_ACCESS_AUD:"app-audience-kt125-private",KT125_PRIVATE_ORIGIN:origin});
function submit({body="subject=employee-sub&role=expert&confirm=ENROLL",token="valid",headers={},method="POST"}={}){
 return new Request(origin+"/kt125/admin/users/enroll",{method,headers:{
 "Origin":origin,"Sec-Fetch-Site":"same-origin","Content-Type":"application/x-www-form-urlencoded",
 "Cf-Access-Jwt-Assertion":token,...headers},body:method==="POST"?body:undefined});
}
const good=db();
let response=await handler.fetch(submit(),env(good));
assert.equal(response.status,303);
assert.equal(response.headers.get("location"),"/kt125/admin/panel/users");
assert.equal(good.writes.length,1);
assert(good.writes[0][0].sql.includes("NOT EXISTS"));
assert(good.writes[0][1].sql.includes("kt125_audit"));
for(const role of ["reviewer","delegated_expert"])
 assert.equal((await handler.fetch(submit({body:`subject=employee-sub&role=${role}&confirm=ENROLL`}),env(db()))).status,303);
for(const body of ["","subject=x&role=egmaster&confirm=ENROLL",
 "subject=x&role=administrator&confirm=ENROLL","subject=manager-sub&role=expert&confirm=ENROLL",
 "subject=x&role=expert&confirm=ENROLL&extra=x",
 "subject=x&subject=y&role=expert&confirm=ENROLL",
 "subject=x&role=expert&confirm=ENROLL&confirm=ENROLL"])
 assert.notEqual((await handler.fetch(submit({body}),env(db()))).status,303,body);
assert.equal((await handler.fetch(submit({token:"forged"}),env(db()))).status,403);
assert.equal((await handler.fetch(submit({headers:{Origin:"https://attacker.invalid"}}),env(db()))).status,403);
assert.equal((await handler.fetch(submit(),env(db("expert")))).status,403);
assert.equal((await handler.fetch(submit({method:"GET"}),env(db()))).status,405);
const html=renderKT125PrivatePage({section:"users",items:[]});
assert(html.includes('/kt125/admin/users/enroll'));
assert(html.includes('value="expert"')&&html.includes('value="reviewer"'));
assert(!html.includes('value="egmaster"')&&!html.includes('value="administrator"'));
console.log("PASS KT125 protected staff enrollment: manager-only, same-origin, restricted roles, confirmation, atomic journal, fail closed.");
