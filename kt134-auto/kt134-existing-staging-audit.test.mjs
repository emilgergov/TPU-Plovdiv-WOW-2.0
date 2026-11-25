import test from 'node:test';
import assert from 'node:assert/strict';
import {assessExistingKT134Staging} from './kt134-existing-staging-audit.mjs';

const expectedD1='9f977144-c6f1-4fbf-8262-5c48b818bfb1';
const fixture=()=>({
 testWorker:{bindings:[
  {type:'d1',name:'DB',id:expectedD1},
  {type:'r2_bucket',name:'BUCKET',bucket_name:'kt134-isolated-r2-2026'}]},
 gateway:{bindings:[{type:'service',name:'KT125',service:'tpu-plovdiv-kt125-local-auth'}]},
 backend:{bindings:[{type:'d1',name:'DB',id:'0576260a-401e-4950-8a5c-123412341234'}]},
 d1Record:{uuid:expectedD1,name:'kt134-isolated-d1-2026'}
});
test('existing KT134 Worker DB and BUCKET is approved as persistent isolated staging only',()=>{
 const r=assessExistingKT134Staging(fixture());
 assert.equal(r.ready,true);
 assert.equal(r.mayModifyProduction,false);
 assert.equal(r.requiresLiveFunctionalGate,true);
});
test('production DB under a test name is explicitly rejected',()=>{
 const x=fixture();x.testWorker.bindings[0].id=x.backend.bindings[0].id;
 assert.equal(assessExistingKT134Staging(x).ready,false);
});
test('unexpected service to production KT125 is rejected',()=>{
 const x=fixture();x.testWorker.bindings.push({type:'service',name:'HOST',service:'tpu-plovdiv-kt125-local-auth'});
 assert.equal(assessExistingKT134Staging(x).ready,false);
});
test('unexpected secrets and extra bindings are rejected',()=>{
 const x=fixture();x.testWorker.bindings.push({type:'secret_text',name:'OPENAI_API_KEY'});
 assert.equal(assessExistingKT134Staging(x).ready,false);
});
test('wrong bucket name or missing D1 ID fails closed',()=>{
 const x=fixture();x.testWorker.bindings[1].bucket_name='user-prepiski-prod';
 assert.equal(assessExistingKT134Staging(x).ready,false);
 const y=fixture();y.d1Record.uuid='';
 assert.equal(assessExistingKT134Staging(y).ready,false);
});

test('staging diagnostic secret is allowed only by its exact KT134 name',()=>{
 const good=fixture();good.testWorker.bindings.push({type:'secret_text',name:'KT134_SMOKE_TOKEN'});
 assert.equal(assessExistingKT134Staging(good).ready,true);
 const bad=fixture();bad.testWorker.bindings.push({type:'secret_text',name:'OPENAI_API_KEY'});
 assert.equal(assessExistingKT134Staging(bad).ready,false);
});
