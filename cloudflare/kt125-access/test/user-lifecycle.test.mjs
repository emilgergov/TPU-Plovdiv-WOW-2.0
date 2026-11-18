import assert from "node:assert/strict";
import {disableKT125User} from "../src/user-lifecycle.mjs";
const now=1794891600000;
const req=new Request("https://office.example.invalid/private",{headers:{"Cf-Access-Jwt-Assertion":"verified","X-Role":"egmaster"}});
const verifier={async verify(r){return r.headers.get("Cf-Access-Jwt-Assertion")==="verified"?
 {verified:true,issuer:"https://identity.cloudflareaccess.com",subject:"admin-a"}:{verified:false}}};
const manager={user_id:"admin",organization_id:"riosv-plovdiv",role:"administrator",active:1};
let seq=0;const uuid=()=> "user-event-"+(++seq);
function fake({actor=manager,changes=[1,1],throwBatch=false}={}){
 const batches=[];
 return {batches,prepare(sql){return {bind(...params){return {
  sql,params,async first(){return actor}
 }}}},async batch(statements){
  batches.push(statements);
  assert.equal(statements.length,2);
  assert(!statements[0].sql.includes("kt125_cases"),"Owning cases must not prevent deactivation");
  assert(statements[0].sql.includes("admin.active=1"));
  assert(statements[1].sql.includes("kt125_audit"));
  assert(statements[1].sql.includes("changes()=1"));
  assert(!statements[0].params.includes("egmaster"),"Browser role must not be used");
  if(throwBatch)throw Error("Simulated DB fail");
  return changes.map(n=>({meta:{changes:n}}));
 }};
}
const base={request:req,verifier,targetUserId:"expert-b",nowMs:now,uuid};
let db=fake();let result=await disableKT125User({...base,db});
assert(result.ok&&result.disabledUserId==="expert-b");
assert.equal(db.batches.length,1);
for(const options of [
 {actor:{...manager,active:0}},
 {actor:{...manager,role:"expert"}},
 {actor:{...manager,role:"reviewer"}},
 {changes:[0,0]},
 {throwBatch:true}
]){
 db=fake(options);result=await disableKT125User({...base,db});
 assert.equal(result.ok,false,JSON.stringify(options));
}
result=await disableKT125User({...base,db:fake(),targetUserId:"admin"});
assert.equal(result.ok,false,"Administrative self-disable must fail");
result=await disableKT125User({...base,db:fake(),
 request:new Request("https://office.example.invalid/private")});
assert.equal(result.ok,false,"Unverified actor must fail");
console.log("PASS KT125 user lifecycle: verified management, no self-disable, deactivation preserves case ownership, atomic audit, denied on DB failures.");

