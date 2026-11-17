import assert from "node:assert/strict";
import {createKT125PrivateHandler} from "../src/private-worker.mjs";
const origin="https://office.example.invalid",team="https://testing.cloudflareaccess.com";
const row={user_id:"expert-a",organization_id:"riosv",role:"expert",active:0,activation_pending:1};
let sequence=0;
const uuid=()=>"unique-"+(++sequence);
const verifier={async verify(req){return req.headers.get("Cf-Access-Jwt-Assertion")==="staff"?
 {verified:true,issuer:team,subject:"worker-sub"}:{verified:false};}};
const handler=createKT125PrivateHandler({getVerifier:()=>verifier,uuid,clock:()=>1794891600000});
const db=()=>({prepare(sql){return {bind(...args){return {sql,args,async first(){return row;}};}};},
 async batch(){return [{meta:{changes:1}},{meta:{changes:1}}];}});
const env={KT125_DB:db(),KT125_ACCESS_TEAM_DOMAIN:team,KT125_ACCESS_AUD:"testing-audience",
 KT125_PRIVATE_ORIGIN:origin};
function req({body="confirm=ACTIVATE",token="staff",headers={},method="POST"}={}){
 return new Request(origin+"/kt125/enrollment/activate",{method,headers:{
 "Origin":origin,"Sec-Fetch-Site":"same-origin",
 "Cf-Access-Jwt-Assertion":token,"Content-Type":"application/x-www-form-urlencoded",...headers
 },body:method==="POST"?body:undefined});
}
const good=await handler.fetch(req(),env);
assert.equal(good.status,200);
assert((await good.text()).includes("профил е активиран"));
for(const body of ["","confirm=BAD","confirm=ACTIVATE&confirm=ACTIVATE","confirm=ACTIVATE&role=egmaster"]){
 assert.equal((await handler.fetch(req({body}),env)).status,400,body);
}
assert.equal((await handler.fetch(req({headers:{Origin:"https://attacker.invalid"}}),env)).status,403);
assert.equal((await handler.fetch(req({token:"forged"}),env)).status,403);
const screen=await handler.fetch(req({method:"GET"}),env);
assert.equal(screen.status,200);
assert.equal(screen.headers.get("referrer-policy"),"same-origin");
assert((await screen.text()).includes("Активирай моя профил"));
assert.equal((await handler.fetch(req({method:"DELETE"}),env)).status,405);
console.log("PASS KT125 staff activation route: identity, same origin, confirmation and no unsafe method.");

