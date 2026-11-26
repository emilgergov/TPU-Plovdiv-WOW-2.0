import test from 'node:test';
import assert from 'node:assert/strict';
import {createKt134NativeCaseRegistration} from './kt134-native-new-case-registration.mjs';
const UUID='7d895a17-e947-4c61-9f31-7e887cef0117';
const request=(opts={})=>new Request('https://tpu-plovdiv-kt134-test.emilgergov.workers.dev/kt134/new-case/register',{
 method:'POST',headers:{origin:'https://tpu-plovdiv-kt134-test.emilgergov.workers.dev',cookie:'kt125_session=synthetic-test-cookie',...opts.headers}
});
const native=()=>new Response(JSON.stringify({record:{case_id:UUID,internal_number:'EG-2026-TEST123',revision:1}}),{
 headers:{'Content-Type':'application/json'}});
test('never allocate sequence before E1 intake was validated',async()=>{
 let calls=0;
 const create=createKt134NativeCaseRegistration({nativeFetch:async()=>{calls++;return native()}});
 await assert.rejects(create({request:request()}),/KT134_INTAKE_NOT_VALIDATED/);
 assert.equal(calls,0);
});
test('uses exclusively native KT126 create with same user session and returns native receipt',async()=>{
 let calls=0;
 const create=createKt134NativeCaseRegistration({nativeFetch:async req=>{
  calls++;assert.equal(new URL(req.url).pathname,'/kt126/registry/create');
  assert.equal(req.method,'POST');assert.equal(await req.text(),'{}');
  assert.equal(req.headers.get('cookie'),'kt125_session=synthetic-test-cookie');
  return native();
 }});
 const result=await create({request:request(),intakeValidated:true});
 assert.equal(calls,1);assert.equal(result.caseId,UUID);
 assert.equal(result.internalNumber,'EG-2026-TEST123');
 assert.equal(result.numbering,'native-only');
 assert.equal(result.storedInIsolatedWorker,false);
});
test('reject cross origin and unauthenticated requests',async()=>{
 let calls=0;
 const create=createKt134NativeCaseRegistration({nativeFetch:async()=>{calls++;return native()}});
 await assert.rejects(create({request:request({headers:{origin:'https://attacker.invalid'}}),intakeValidated:true}),/KT134_REGISTER_ORIGIN_REJECTED/);
 await assert.rejects(create({request:request({headers:{cookie:''}}),intakeValidated:true}),/KT125_LOGIN_REQUIRED/);
 assert.equal(calls,0);
});
test('reject native failures and invented numbers',async()=>{
 const bad=createKt134NativeCaseRegistration({nativeFetch:async()=>new Response(JSON.stringify({record:{case_id:UUID,revision:1}}),{headers:{'content-type':'application/json'}})});
 await assert.rejects(bad({request:request(),intakeValidated:true}),/KT126_REGISTER_UNVERIFIED_RECEIPT/);
 const blocked=createKt134NativeCaseRegistration({nativeFetch:async()=>new Response(null,{status:403})});
 await assert.rejects(blocked({request:request(),intakeValidated:true}),/KT125_CASE_CREATE_FORBIDDEN/);
});
