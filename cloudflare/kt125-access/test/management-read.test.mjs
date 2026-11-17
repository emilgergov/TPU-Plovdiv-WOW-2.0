import assert from "node:assert/strict";
import {readKT125Management,readKT125CaseGrants} from "../src/management-read.mjs";
const req=new Request("https://private.example.invalid/kt125/admin");
const verify={async verify(){return {verified:true,issuer:"trusted-idp",subject:"person-1"}}};
function database({role="egmaster",userId="boss",org="riosv-plovdiv",owner="expert-a",active=1,missing=false,throwing=false}={}){
 const calls=[];
 const db={calls,prepare(sql){
   return {bind(...args){calls.push({sql,args});return {
    async first(){
      if(throwing)throw Error("db not available");
      if(sql.includes("identity_provider"))return {user_id:userId,organization_id:org,role,active};
      if(sql.includes("FROM kt125_cases"))return missing?null:{
       case_id:"case-a",organization_id:org,owner_id:owner,status:"active"};
      throw Error("Unexpected first");
    },
    async all(){
      if(throwing)throw Error("db not available");
      if(sql.includes("FROM kt125_users"))return {results:[{
       user_id:"expert-a",role:"expert",active:1,created_at_ms:1,updated_at_ms:2,
       password:"NEVER_RETURN",dossier_text:"PRIVATE"}]};
      if(sql.includes("FROM kt125_cases"))return {results:[{
       case_id:"case-a",owner_id:"expert-a",status:"active",
       created_at_ms:1,updated_at_ms:2,legal_text:"PRIVATE"}]};
      if(sql.includes("FROM kt125_audit"))return {results:[{
       event_id:"audit-1",case_id:"case-a",actor_id:"expert-a",action:"case.delegate",
       outcome:"created",timestamp_ms:3,request_id:"request-a",details_json:"PRIVATE"}]};
      if(sql.includes("FROM kt125_grants"))return {results:[{
       grant_id:"grant-a",grantee_id:"expert-b",grantor_id:"expert-a",
       actions_json:'["case.read","case.review"]',not_before_ms:1,expires_at_ms:100,
       revoked_at_ms:null,secret:"PRIVATE"}]};
      throw Error("Unexpected SQL query");
    }
   }}};
 }};
 return db;
}
for(const section of ["users","cases","audit"]){
 const db=database();
 const r=await readKT125Management({request:req,verifier:verify,db,section});
 assert.equal(r.ok,true);
 assert.equal(r.data.section,section);
 assert.equal(r.data.items.length,1);
 assert(!JSON.stringify(r).includes("PRIVATE"));
 assert(db.calls.some(c=>c.args[0]==="riosv-plovdiv"),
  "All management reads scoped to authenticated organization");
 assert(db.calls.every(c=>!c.args.includes("other-org")));
}
const admin=database({role:"administrator"});
assert.equal((await readKT125Management({request:req,verifier:verify,db:admin,section:"users"})).ok,true);
assert.equal((await readKT125Management({request:req,verifier:verify,db:admin,section:"cases"})).ok,true);
assert.equal((await readKT125Management({request:req,verifier:verify,db:admin,section:"audit"})).ok,false);
for(const role of ["expert","reviewer","delegated_expert"]){
 const db=database({role});
 for(const section of ["users","cases","audit"]){
  assert.equal((await readKT125Management({request:req,verifier:verify,db,section})).ok,false);
 }
}
const grants=await readKT125CaseGrants({request:req,verifier:verify,
 db:database({role:"expert",userId:"expert-a"}),caseId:"case-a"});
assert.equal(grants.ok,true);
assert.deepEqual(grants.data.items[0].actions,["case.read","case.review"]);
assert(!JSON.stringify(grants).includes("PRIVATE"));
assert.equal((await readKT125CaseGrants({request:req,verifier:verify,
 db:database({role:"expert",userId:"other-expert"}),caseId:"case-a"})).ok,false);
assert.equal((await readKT125CaseGrants({request:req,verifier:verify,
 db:database({role:"reviewer"}),caseId:"case-a"})).ok,false);
assert.equal((await readKT125CaseGrants({request:req,verifier:verify,
 db:database({role:"administrator"}),caseId:"case-a"})).ok,true);
assert.equal((await readKT125CaseGrants({request:req,verifier:verify,
 db:database({role:"egmaster",missing:true}),caseId:"case-a"})).ok,false);
assert.equal((await readKT125Management({request:req,verifier:verify,
 db:database({active:0}),section:"users"})).ok,false);
assert.equal((await readKT125Management({request:req,verifier:{verify:async()=>({verified:false})},
 db:database(),section:"users"})).ok,false);
assert.equal((await readKT125Management({request:req,verifier:verify,
 db:database({throwing:true}),section:"users"})).ok,false);
assert.equal((await readKT125Management({request:req,verifier:verify,
 db:database(),section:"somethingElse"})).ok,false);
console.log("PASS KT125-VT02: users/cases/audit role gates, own-case grants, organization scoping, strict field whitelist, unknown/unverified denied.");
