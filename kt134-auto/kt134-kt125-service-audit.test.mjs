import test from 'node:test';
import assert from 'node:assert/strict';
import {assessKt134NativeBridgeBindings as audit} from './kt134-kt125-service-audit.mjs';
const base=[
 {type:'d1',name:'DB',id:'9f977144-c6f1-4fbf-8262-5c48b818bfb1'},
 {type:'r2_bucket',name:'BUCKET',bucket_name:'kt134-isolated-r2-2026'},
 {type:'secret_text',name:'KT134_SMOKE_TOKEN'}
];
test('staging with only original isolated resources remains eligible',()=>{
 assert.equal(audit(base).eligible,true);
});
test('staging with exact native service binding remains eligible',()=>{
 const x=audit([...base,{type:'service',name:'KT125_NATIVE',
   service:'tpu-plovdiv-kt125-local-auth'}]);
 assert.equal(x.eligible,true);assert.equal(x.nativeServicePresent,true);
});
test('KT133 or unrelated service binding is never silently accepted',()=>{
 assert.equal(audit([...base,{type:'service',name:'KT125_NATIVE',
  service:'kt133-tpu-plovdiv-kt125-local-auth'}]).eligible,false);
});
test('production D1 cannot be attached to KT134 test Worker',()=>{
 assert.equal(audit([...base,{type:'d1',name:'KT125_DB',id:'real-production'}]).eligible,false);
});
