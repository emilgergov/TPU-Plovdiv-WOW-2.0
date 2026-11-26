import test from 'node:test';
import assert from 'node:assert/strict';
import {assessKt134NativeBridgeBindings as audit} from './kt134-kt125-service-audit.mjs';
const base=[
 {type:'d1',name:'DB',id:'9f977144-c6f1-4fbf-8262-5c48b818bfb1'},
 {type:'r2_bucket',name:'BUCKET',bucket_name:'kt134-isolated-r2-2026'},
 {type:'secret_text',name:'KT134_SMOKE_TOKEN'}
];
test('staging with only original isolated resources remains eligible',()=>{
 assert.equal(audit(base).eligible,false);
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

test('isolated Worker permits one direct native KT125 plus one EG test service binding',()=>{
 const x=audit([...base,
  {type:'service',name:'KT125_NATIVE',service:'tpu-plovdiv-kt125-local-auth'},
  {type:'service',name:'KT134_EG_NATIVE',service:'tpu-plovdiv-kt134-eg-test'}]);
 assert.equal(x.eligible,true);assert.equal(x.egServicePresent,true);
});
test('other EG service or duplicate EG binding never qualifies',()=>{
 const native={type:'service',name:'KT125_NATIVE',service:'tpu-plovdiv-kt125-local-auth'};
 const eg={type:'service',name:'KT134_EG_NATIVE',service:'tpu-plovdiv-kt134-eg-test'};
 assert.equal(audit([...base,native,eg,{...eg}]).eligible,false);
 assert.equal(audit([...base,native,{...eg,service:'tpu-plovdiv-ai-author-v27'}]).eligible,false);
});

test('native identity RPC only accepts published LocalAuthService named entrypoint',()=>{
 const native={type:'service',name:'KT125_NATIVE',service:'tpu-plovdiv-kt125-local-auth'};
 const eg={type:'service',name:'KT134_EG_NATIVE',service:'tpu-plovdiv-kt134-eg-test'};
 const rpc={type:'service',name:'KT125_IDENTITY_RPC',
   service:'tpu-plovdiv-kt125-local-auth',entrypoint:'LocalAuthService'};
 assert.equal(audit([...base,native,eg,rpc]).eligible,true);
 assert.equal(audit([...base,native,eg,rpc]).identityRpcPresent,true);
 assert.equal(audit([...base,native,eg,{...rpc,entrypoint:'default'}]).eligible,false);
 assert.equal(audit([...base,native,eg,{...rpc,service:'kt133-tpu-plovdiv'}]).eligible,false);
});
