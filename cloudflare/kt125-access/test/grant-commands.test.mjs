import assert from "node:assert/strict";
import {issueKT125Grant,revokeKT125Grant} from "../src/grant-commands.mjs";
const now=1794891600000;
const request=new Request("https://private.example.invalid/",{
 headers:{"X-User-Id":"other","X-Role":"egmaster","Cf-Access-Jwt-Assertion":"signed"}});
const verifier={async verify(req){return req.headers.get("Cf-Access-Jwt-Assertion")==="signed"?
 {verified:true,issuer:"https://team.cloudflareaccess.com",subject:"real-expert"}:{verified:false}}};
const user={user_id:"alice",organization_id:"riosv-plovdiv",role:"expert",active:1};
const grantee={user_id:"bob",organization_id:"riosv-plovdiv",role:"delegated_expert",active:1};
const resource={case_id:"case-a",organization_id:"riosv-plovdiv",owner_id:"alice",status:"active"};
let seq=0;
const uuid=()=> "generated-id-"+(++seq);
function db({actor=user,caseRow=resource,target=grantee,changes=[1,1],fail=false}={}){
 const calls=[],batches=[];
 return {calls,batches,prepare(sql){return {bind(...args){calls.push({sql,args});
  return {async first(){
   if(sql.includes("FROM kt125_users WHERE identity_provider"))return actor;
   if(sql.includes("FROM kt125_cases WHERE case_id"))return caseRow;
   if(sql.includes("FROM kt125_users WHERE user_id"))return target;
   throw Error("Unknown select");
  },async all(){return {results:[]}},sql,args};
 }}},async batch(stmts){
  batches.push(stmts);
  if(fail)throw Error("SQLite transaction failed");
  assert.equal(stmts.length,2);
  assert(/kt125_grants/.test(stmts[0].sql));
  assert(/kt125_audit/.test(stmts[1].sql));
  assert(/owner_id/.test(stmts[0].sql),"The insert or revoke must recheck owner inside SQL");
  assert(/created|revoked/.test(stmts[1].sql));
  return changes.map(n=>({meta:{changes:n}}));
 }};
}
const issue={
 request,verifier,caseId:"case-a",granteeId:"bob",actions:["case.read","case.review"],
 notBeforeMs:now,expiresAtMs:now+1000,nowMs:now,uuid
};
const good=db();let x=await issueKT125Grant({...issue,db:good});
assert(x.ok&&x.grantId.startsWith("generated-id"));
assert.equal(good.batches.length,1);
assert(good.batches[0][0].args.includes("alice"));
assert(!good.batches[0][0].args.includes("other"));
for(const override of [
 {db:db({actor:{...user,active:0}})},
 {db:db({actor:{...user,role:"administrator"}})},
 {db:db({caseRow:{...resource,owner_id:"other"}})},
 {db:db({target:{...grantee,active:0}})},
 {db:db({target:{...grantee,organization_id:"foreign"}})},
 {db:db({changes:[0,0]})},
 {db:db({fail:true})},
 {db:db(),actions:["case.read","case.delegate"]},
 {db:db(),expiresAtMs:now-1}
]){
  x=await issueKT125Grant({...issue,...override});
  assert.equal(x.ok,false,JSON.stringify(override));
}
x=await issueKT125Grant({...issue,db:db(),request:new Request(request.url)});
assert.equal(x.ok,false);
const revoke={request,verifier,caseId:"case-a",grantId:"grant-a",nowMs:now,uuid};
const goodRev=db();x=await revokeKT125Grant({...revoke,db:goodRev});
assert(x.ok&&x.revoked);
assert(goodRev.batches[0][0].args.includes("alice"));
for(const override of [
 {db:db({actor:{...user,role:"administrator"}})},
 {db:db({actor:{...user,active:0}})},
 {db:db({changes:[0,0]})},
 {db:db({fail:true})}
]){
 x=await revokeKT125Grant({...revoke,...override});
 assert.equal(x.ok,false,JSON.stringify(override));
}
console.log("PASS KT125 commands: verified actor, scoped grant/revoke, owner SQL recheck, atomic D1 audit batch, fail-closed errors.");
