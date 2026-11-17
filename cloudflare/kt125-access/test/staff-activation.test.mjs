import assert from "node:assert/strict";
import {activateKT125Staff} from "../src/staff-activation.mjs";
const request=new Request("https://office.example.invalid/kt125/enrollment/activate",{
 headers:{"Cf-Access-Jwt-Assertion":"signed"}});
const verified={async verify(r){return r.headers.get("Cf-Access-Jwt-Assertion")==="signed"?
 {verified:true,issuer:"https://testing.cloudflareaccess.com",subject:"employee-sub"}:{verified:false};}};
const pending={user_id:"employee-1",organization_id:"riosv-plovdiv",
 role:"expert",active:0,activation_pending:1};
let seq=0;const uuid=()=>"event-"+(++seq);
function db({row=pending,changes=[1,1],fail=false}={}){
 const queries=[],batches=[];
 return {queries,batches,prepare(sql){return {bind(...args){queries.push({sql,args});
 return {sql,args,async first(){return args[0]==="https://testing.cloudflareaccess.com"&&args[1]==="employee-sub"?row:null;}};}};},
 async batch(stmts){batches.push(stmts);if(fail)throw Error("transaction failed");
 return changes.map(n=>({meta:{changes:n}}));}};
}
const args={request,verifier:verified,nowMs:1794891600000,uuid};
const good=db();const result=await activateKT125Staff({...args,db:good});
assert.equal(result.ok,true);
assert.equal(result.userId,"employee-1");
assert.equal(good.batches.length,1);
assert(good.queries[0].args.includes("employee-sub"));
assert(good.batches[0][0].sql.includes("activation_pending=1"));
assert(good.batches[0][0].sql.includes("active=0"));
assert(good.batches[0][1].sql.includes("'users.activate'"));
assert(good.batches[0][1].sql.includes("changes()=1"));
for(const row of [null,{...pending,active:1,activation_pending:0},
 {...pending,activation_pending:0},{...pending,role:"egmaster"},
 {...pending,role:"administrator"},{...pending,organization_id:"bad space"}]){
 assert.equal((await activateKT125Staff({...args,db:db({row})})).ok,false);
}
for(const options of [{request:new Request(request.url)},{verifier:{verify:async()=>({verified:true,issuer:"other",subject:"another"})}},
 {db:db({changes:[0,0]})},{db:db({fail:true})}]){
 const output=await activateKT125Staff({...args,db:db(),...options});
 if(options.verifier){assert.notDeepEqual(output.ok,true);}else assert.equal(output.ok,false);
}
console.log("PASS KT125: pending only, verified subject binding, no reactivation, atomic journal.");
