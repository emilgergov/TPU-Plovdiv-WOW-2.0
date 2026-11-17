import assert from "node:assert/strict";
import {enrollKT125Staff} from "../src/staff-enrollment.mjs";
const now=1794891600000;
const request=new Request("https://private.example.invalid/",{
 headers:{"Cf-Access-Jwt-Assertion":"signed","X-Role":"egmaster"}});
const verifier={async verify(req){return req.headers.get("Cf-Access-Jwt-Assertion")==="signed"?
 {verified:true,issuer:"https://test.cloudflareaccess.com",subject:"manager-sub"}:{verified:false}}};
const manager={user_id:"manager",organization_id:"riosv-plovdiv",role:"administrator",active:1};
let counter=0;const uuid=()=> "registered-"+(++counter);
function database({actor=manager,changes=[1,1],batchFail=false}={}){
 const calls=[],batches=[];
 return {calls,batches,prepare(sql){
  return {bind(...args){calls.push({sql,args});return {sql,args,async first(){return actor}}}};
 },async batch(statements){
  batches.push(statements);
  assert.equal(statements.length,2);
  assert(statements[0].sql.includes("NOT EXISTS"));
  assert(statements[0].sql.includes("a.active=1"));
  assert(statements[0].sql.includes("a.role IN ('egmaster','administrator')"));
  assert(statements[1].sql.includes("kt125_audit"));
  assert(statements[1].sql.includes("changes()=1"));
  if(batchFail)throw Error("Simulated DB outage");
  return changes.map(n=>({meta:{changes:n}}));
 }};
}
const base={request,verifier,providerSubject:"new-employee-sub",role:"expert",nowMs:now,uuid};
let db=database();let r=await enrollKT125Staff({...base,db});
assert.equal(r.ok,true);
assert.equal(r.role,"expert");
assert.equal(db.batches.length,1);
assert(db.batches[0][0].args.includes("new-employee-sub"));
assert(db.batches[0][0].args.includes("https://test.cloudflareaccess.com"));
assert(!db.batches[0][0].args.includes("egmaster"));
for(const role of ["reviewer","delegated_expert"]){
 assert.equal((await enrollKT125Staff({...base,db:database(),role})).ok,true);
}
for(const options of [
 {role:"egmaster"},{role:"administrator"},{role:"unknown"},
 {providerSubject:"manager-sub"},{providerSubject:"\"invalid\n"},
 {providerSubject:""}, {providerSubject:"x".repeat(201)},
 {db:database({actor:{...manager,role:"expert"}})},
 {db:database({actor:{...manager,active:0}})},
 {db:database({actor:null})},
 {db:database({changes:[0,0]})},
 {db:database({batchFail:true})}
]){
 const result=await enrollKT125Staff({...base,db:database(),...options});
 assert.equal(result.ok,false,JSON.stringify(options));
}
assert.equal((await enrollKT125Staff({...base,db:database(),request:new Request(request.url)})).ok,false);
assert.equal((await enrollKT125Staff({...base,db:database(),verifier:{verify:async()=>{throw Error("no");}}})).ok,false);
console.log("PASS KT125 enrollment: only verified manager, role whitelist, provider subject uniqueness, no self/EGMASTER/admin creation, transactional audit.");
