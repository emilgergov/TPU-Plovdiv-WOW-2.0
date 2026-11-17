import assert from "node:assert/strict";
import {authorizeKT125,validateKT125Grant,KT125_ACTIONS} from "../src/authorization-policy.mjs";
const now=1794891600000;
const mk=(userId,roles=["expert"],organizationId="riosv-plovdiv")=>({verified:true,userId,organizationId,roles,disabled:false});
const alice=mk("expert-a"),bob=mk("expert-b"),reviewer=mk("reviewer-c",["reviewer"]);
const admin=mk("admin",["administrator"]),egmaster=mk("master",["egmaster"]);
const caseA={caseId:"case-a",organizationId:"riosv-plovdiv",ownerId:"expert-a",status:"active"};
const check=(args,expected)=>assert.equal(authorizeKT125({nowMs:now,...args}).allowed,expected,JSON.stringify(args));
for(const action of KT125_ACTIONS){
 check({principal:null,resource:caseA,action},false);
 check({principal:{...alice,verified:false},resource:caseA,action},false);
 check({principal:{...alice,disabled:true},resource:caseA,action},false);
}
for(const action of ["case.read","case.edit","case.review","case.confirm","document.generate","case.archive","case.delegate"]){
 check({principal:alice,resource:caseA,action},true);
 check({principal:bob,resource:caseA,action},false);
 check({principal:admin,resource:caseA,action},false);
 check({principal:egmaster,resource:caseA,action},false);
}
for(const action of ["users.manage","config.manage"]){
 check({principal:admin,action},true);
 check({principal:alice,action},false);
}
check({principal:admin,action:"audit.read"},false);
check({principal:egmaster,action:"audit.read"},true);
check({principal:alice,resource:{...caseA,status:"sealed"},action:"case.edit"},false);
check({principal:alice,resource:{...caseA,organizationId:"other-agency"},action:"case.read"},false);
check({principal:{...alice,roles:["expert","invented"]},resource:caseA,action:"case.read"},false);
check({principal:{...alice,userId:""},resource:caseA,action:"case.read"},false);
check({principal:alice,resource:caseA,action:"case.delete"},false);
check({principal:alice,resource:caseA,action:"case.read",nowMs:undefined},false);
const grant={
 caseId:"case-a",organizationId:"riosv-plovdiv",granteeId:"expert-b",
 grantorId:"expert-a",actions:["case.read","case.review"],active:true,revoked:false,
 notBeforeMs:now-1000,expiresAtMs:now+1000
};
check({principal:bob,resource:caseA,action:"case.read",grants:[grant]},true);
check({principal:bob,resource:caseA,action:"case.review",grants:[grant]},true);
check({principal:bob,resource:caseA,action:"case.edit",grants:[grant]},false);
check({principal:bob,resource:caseA,action:"case.delegate",grants:[grant]},false);
check({principal:bob,resource:caseA,action:"case.read",grants:[{...grant,revoked:true}]},false);
check({principal:bob,resource:caseA,action:"case.read",grants:[{...grant,active:false}]},false);
check({principal:bob,resource:caseA,action:"case.read",grants:[{...grant,expiresAtMs:now}]},false);
check({principal:bob,resource:caseA,action:"case.read",grants:[{...grant,notBeforeMs:now+1}]},false);
check({principal:bob,resource:caseA,action:"case.read",grants:[{...grant,organizationId:"other-agency"}]},false);
check({principal:bob,resource:caseA,action:"case.read",grants:[{...grant,caseId:"other-case"}]},false);
check({principal:bob,resource:caseA,action:"case.read",grants:[{...grant,actions:["case.read","case.delegate"]}]},false);
check({principal:mk("expert-b",["delegated_expert"]),resource:caseA,action:"case.read",grants:[grant]},true);
const candidate={grantor:alice,grantee:bob,resource:caseA,actions:["case.read","case.review"],
 notBeforeMs:now,expiresAtMs:now+10000,nowMs:now};
assert.equal(validateKT125Grant(candidate).allowed,true);
for(const change of [
 {grantor:bob},{grantor:admin},{grantor:egmaster},
 {grantor:{...alice,verified:false}},{grantee:mk("foreign",["expert"],"other-agency")},
 {grantee:{...bob,verified:false}},{actions:["case.read","case.delegate"]},{actions:[]},
 {actions:["case.read","case.read"]},{notBeforeMs:now-1},{expiresAtMs:now}
])assert.equal(validateKT125Grant({...candidate,...change}).allowed,false,JSON.stringify(change));
assert.equal(validateKT125Grant({...candidate,grantee:alice}).allowed,false);
console.log("PASS KT125: independent experts, case owner, management roles, cross-org isolation, sealed cases, scoped grants, expiry, revocation, forged inputs and escalation rejected.");
