import assert from "node:assert/strict";
import {authorizeKT125CaseRequest,kt125PublicDenialResponse} from "../src/server-guard.mjs";
const now=1794891600000;
const request=new Request("https://private.example.invalid/cases/case-1",{
 headers:{"X-User-Id":"admin","X-Role":"egmaster","X-Organization":"other"}});
function database({user,resource,grants=[]}={}){
 const calls=[];
 return {calls,prepare(sql){
  assert(!/X-User-Id|X-Role|X-Organization/.test(sql));
  return {bind(...params){
   calls.push({sql,params});
   return {async first(){
    if(sql.includes("kt125_users"))return user??null;
    if(sql.includes("kt125_cases"))return resource??null;
    throw Error("Unexpected table");
   },async all(){return {results:grants}}};
  }};
 }};
}
const user=(id,role="expert")=>({user_id:id,organization_id:"riosv-plovdiv",role,active:1});
const resource={case_id:"case-1",organization_id:"riosv-plovdiv",owner_id:"alice",status:"active"};
const validVerifier={async verify(){return {verified:true,issuer:"institution-idp",subject:"account-alice"}}};
async function check(db,verifier=validVerifier,action="case.read"){
 return authorizeKT125CaseRequest({request,db,identityVerifier:verifier,action,caseId:"case-1",nowMs:now});
}
assert.equal((await check(null)).allowed,false);
assert.equal((await check(database({user:user("alice"),resource}),null)).allowed,false);
assert.equal((await check(database({user:user("alice"),resource}),{
 async verify(){return {verified:false,issuer:"institution-idp",subject:"account-alice"}}
})).allowed,false);
const ownDb=database({user:user("alice"),resource});
assert.equal((await check(ownDb)).allowed,true);
assert.equal(ownDb.calls[0].params[0],"institution-idp");
assert.equal(ownDb.calls[0].params[1],"account-alice");
assert.equal(ownDb.calls[1].params[0],"case-1");
assert.equal((await check(database({user:user("bob"),resource}))).allowed,false);
assert.equal((await check(database({user:user("admin","administrator"),resource}))).allowed,false);
assert.equal((await check(database({user:{...user("alice"),active:0},resource}))).allowed,false);
assert.equal((await check(database({user:user("alice")}))).allowed,false);
const grant={case_id:"case-1",organization_id:"riosv-plovdiv",grantor_id:"alice",
 grantee_id:"bob",actions_json:JSON.stringify(["case.read"]),not_before_ms:now-1000,
 expires_at_ms:now+1000,revoked_at_ms:null};
assert.equal((await check(database({user:user("bob"),resource,grants:[grant]}))).allowed,true);
assert.equal((await check(database({user:user("bob"),resource,grants:[grant]}),validVerifier,"case.edit")).allowed,false);
assert.equal((await check(database({user:user("bob"),resource,grants:[{...grant,revoked_at_ms:now}]}))).allowed,false);
assert.equal((await check(database({user:user("bob"),resource,grants:[{...grant,actions_json:"{bad"}]}))).allowed,false);
const forbidden=kt125PublicDenialResponse();assert.equal(forbidden.status,403);
assert(!JSON.stringify(await forbidden.json()).includes("alice"));
assert.equal(forbidden.headers.get("cache-control"),"no-store");
console.log("PASS KT125 guard: identity provider asserted subject bound to private registered user; forged HTTP identity ignored, DB rights checked, no case information leaked on denial.");
