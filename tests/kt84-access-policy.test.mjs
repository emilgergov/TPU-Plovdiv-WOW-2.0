import test from 'node:test';
import assert from 'node:assert/strict';
import {authorize,validateGrant,KT84_ACTIONS as A} from '../kt84/access-policy.mjs';
const now=1794700800;
const owner={subject:'expert-a',orgId:'riosv-plovdiv',role:'expert',verifiedByGateway:true,status:'active'};
const other={...owner,subject:'expert-b'};
const admin={...owner,subject:'admin',role:'administrator'};
const reviewer={...owner,subject:'reviewer',role:'reviewer'};
const caseRecord={id:'case-001',ownerId:owner.subject,orgId:owner.orgId,status:'active',version:4};
const grant={caseId:caseRecord.id,orgId:owner.orgId,granteeId:other.subject,grantedBy:owner.subject,
 status:'active',expiresAt:now+3600,actions:[A.READ,A.EDIT]};
const check=(principal,action,extra={})=>authorize({principal,caseRecord,action,now,expectedVersion:4,...extra});
test('owner sees only own case; explicit, expiring delegation authorizes another expert',()=>{
 assert.equal(check(owner,A.READ).allowed,true);
 assert.equal(check(other,A.READ).code,'NO_CASE_GRANT');
 assert.equal(check(other,A.READ,{grants:[grant]}).allowed,true);
 assert.equal(check(other,A.READ,{grants:[{...grant,expiresAt:now}]}).allowed,false);
 assert.equal(check(other,A.READ,{grants:[{...grant,status:'revoked'}]}).allowed,false);
 assert.equal(check(other,A.EXPORT,{grants:[grant]}).allowed,false);
});
test('administrator can manage accounts but cannot secretly read private dossier',()=>{
 assert.equal(check(admin,A.ADMIN_MEMBERS).allowed,true);
 assert.equal(check(admin,A.ADMIN_GRANTS).allowed,true);
 assert.equal(check(admin,A.AUDIT_READ).allowed,true);
 assert.equal(check(admin,A.READ).allowed,false);
 assert.equal(check(admin,A.READ,{grants:[{...grant,granteeId:admin.subject}]}).allowed,true);
 assert.equal(check(reviewer,A.READ).allowed,false);
});
test('no identity from browser, inactive user or other institution may access data',()=>{
 assert.equal(check({...owner,verifiedByGateway:false},A.READ).allowed,false);
 assert.equal(check({...owner,status:'suspended'},A.READ).allowed,false);
 assert.equal(check({...owner,orgId:'other-office'},A.READ).allowed,false);
 assert.equal(check(owner,A.READ,{caseRecord:{...caseRecord,status:'archived'}}).allowed,false);
 assert.equal(check(owner,'case.erase').allowed,false);
});
test('stale versions never overwrite more recent case changes',()=>{
 assert.equal(check(owner,A.EDIT,{expectedVersion:3}).code,'VERSION_CONFLICT');
 assert.equal(check(other,A.EDIT,{grants:[grant],expectedVersion:3}).code,'VERSION_CONFLICT');
 assert.equal(check(other,A.EDIT,{grants:[grant]}).allowed,true);
});
test('only current case owner may issue bounded delegated grants',()=>{
 const input={actor:owner,caseRecord,grantee:other,actions:[A.READ,A.EDIT],
  now,expiresAt:now+86400};
 assert.equal(validateGrant(input).allowed,true);
 assert.equal(validateGrant({...input,actor:admin}).allowed,false);
 assert.equal(validateGrant({...input,actions:[A.SHARE]}).allowed,false);
 assert.equal(validateGrant({...input,grantee:{...other,orgId:'outside'}}).allowed,false);
 assert.equal(validateGrant({...input,expiresAt:now+91*86400}).allowed,false);
});
test('case ID alone and counterfeit grant metadata never give access',()=>{
 assert.equal(check(other,A.READ,{grants:[{...grant,grantedBy:'not-owner'}]}).allowed,false);
 assert.equal(check(other,A.READ,{grants:[{...grant,orgId:'outside'}]}).allowed,false);
 assert.equal(check(other,A.READ,{grants:[{...grant,caseId:'case-002'}]}).allowed,false);
 assert.equal(check(other,A.READ,{grants:[{...grant,actions:[A.READ,A.SHARE]}]}).allowed,false);
});
