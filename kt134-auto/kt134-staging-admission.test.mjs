import test from 'node:test';
import assert from 'node:assert/strict';
import {assessKT134Staging} from './kt134-staging-admission.mjs';
const base={testWorker:'kt134-staging-isolated',testD1:'11111111-1111-4111-8111-111111111111',
 testR2:'kt134-private-stage',gatewayWorker:'kt133-live-entry',
 backendWorker:'kt125-live-backend',backendD1:'22222222-2222-4222-8222-222222222222',
 workerHttp:200,d1Http:200,r2Http:200,r2IsolationAttested:true};
test('all independently proven staging resources are required',()=>{
 const x=assessKT134Staging(base);
 assert.equal(x.ready,true);
 assert.equal(x.noDeploymentAllowed,false);
});
test('missing staging resources fail closed by default',()=>{
 const x=assessKT134Staging();
 assert.equal(x.ready,false);
 assert.equal(x.noDeploymentAllowed,true);
 assert.equal(x.checks.filter(c=>!c.ok).length,7);
});
test('production Worker must never be admitted as KT134 test Worker',()=>{
 for(const value of ['kt133-live-entry','kt125-live-backend']){
  assert.equal(assessKT134Staging({...base,testWorker:value}).ready,false);
 }
});
test('production D1 must never be admitted for synthetic tests',()=>{
 assert.equal(assessKT134Staging({...base,testD1:base.backendD1}).ready,false);
});
test('unknown or unauthorized R2 cannot be considered safe',()=>{
 assert.equal(assessKT134Staging({...base,r2Http:403}).ready,false);
 assert.equal(assessKT134Staging({...base,r2IsolationAttested:false}).ready,false);
});
test('unverified resources cannot be treated as present',()=>{
 assert.equal(assessKT134Staging({...base,workerHttp:404}).ready,false);
 assert.equal(assessKT134Staging({...base,d1Http:403}).ready,false);
});
test('unconfigured test environment remains blocked',()=>{
 assert.equal(assessKT134Staging({...base,testWorker:''}).ready,false);
 assert.equal(assessKT134Staging({...base,testD1:''}).ready,false);
 assert.equal(assessKT134Staging({...base,testR2:''}).ready,false);
});

test('cannot certify isolation if actual protected backend identity is unknown',()=>{
 assert.equal(assessKT134Staging({...base,backendWorker:''}).ready,false);
 assert.equal(assessKT134Staging({...base,backendD1:''}).ready,false);
});
test('malformed D1 identifiers never bypass production protection',()=>{
 assert.equal(assessKT134Staging({...base,testD1:'test-database'}).ready,false);
});
