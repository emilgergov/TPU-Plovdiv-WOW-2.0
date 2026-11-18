import assert from "node:assert/strict";
import {createKT125PrivateHandler} from "../src/private-worker.mjs";
const origin="https://office.example.invalid";
const team="https://testing.cloudflareaccess.com";
const now=1794891600000;
const verifier={async verify(r){return r.headers.get("Cf-Access-Jwt-Assertion")==="verified"?
 {verified:true,issuer:team,subject:"manager-sub"}:{verified:false}}};
let counter=0;
const uuid=()=> "uid-"+(++counter);
function mockDB({role="administrator",active=1,changes=[1,1],throwBatch=false}={}){
 const mutations=[];
 return {mutations,prepare(sql){
  return {bind(...args){return {
   sql,args,async first(){
    if(sql.includes("identity_provider"))return {
     user_id:"admin-a",organization_id:"riosv-plovdiv",role,active};
    return null;
   },async all(){return {results:[]}}
  }}};
 },async batch(stmts){
  mutations.push(stmts);
  if(throwBatch)throw Error("Denied DB write");
  assert(stmts[0].sql.includes("admin.organization_id=kt125_users.organization_id"));
  assert(stmts[0].sql.includes("admin.active=1"));
  assert(!stmts[0].sql.includes("kt125_cases"));
  assert(stmts[1].sql.includes("kt125_audit"));
  return changes.map(x=>({meta:{changes:x}}));
 }};
}
function req({token="verified",headers={},body="confirm=DEACTIVATE",method="POST"}={}){
 return new Request(origin+"/kt125/admin/users/expert-a/disable",{
 method,headers:{"Origin":origin,"Sec-Fetch-Site":"same-origin",
  "Cf-Access-Jwt-Assertion":token,"Content-Type":"application/x-www-form-urlencoded",
  ...headers},body:method==="POST"?body:undefined
 });
}
const handler=createKT125PrivateHandler({getVerifier:()=>verifier,
 clock:()=>now,uuid,auditEvent:async()=>true});
const env=db=>({KT125_DB:db,KT125_ACCESS_TEAM_DOMAIN:team,
 KT125_ACCESS_AUD:"app-audience-kt125-private",KT125_PRIVATE_ORIGIN:origin});
let db=mockDB();
let r=await handler.fetch(req(),env(db));
assert.equal(r.status,303);
assert.equal(r.headers.get("location"),"/kt125/admin/panel/users");
assert.equal(db.mutations.length,1);
assert.equal((await handler.fetch(req({body:""}),env(mockDB()))).status,400);
assert.equal((await handler.fetch(req({body:"confirm=wrong"}),env(mockDB()))).status,400);
assert.equal((await handler.fetch(req({body:"confirm=DEACTIVATE&role=egmaster"}),env(mockDB()))).status,400);
assert.equal((await handler.fetch(req({headers:{Origin:"https://attacker.invalid"}}),env(mockDB()))).status,403);
assert.equal((await handler.fetch(req({headers:{"Sec-Fetch-Site":"cross-site"}}),env(mockDB()))).status,403);
assert.equal((await handler.fetch(req({token:"forged"}),env(mockDB()))).status,403);
assert.equal((await handler.fetch(req(),env(mockDB({role:"expert"})))).status,403);
assert.equal((await handler.fetch(req(),env(mockDB({active:0})))).status,403);
assert.equal((await handler.fetch(req(),env(mockDB({changes:[0,0]})))).status,403);
assert.equal((await handler.fetch(req(),env(mockDB({throwBatch:true})))).status,403);
assert.equal((await handler.fetch(req({method:"GET"}),env(mockDB()))).status,405);
console.log("PASS KT125-VT02: admin deactivation requires verified manager, same-origin confirmed form, atomic audit, preserved case ownership, rejects unverified and forged requests.");

