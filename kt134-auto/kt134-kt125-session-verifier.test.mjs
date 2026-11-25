import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createKt134Kt125SessionVerifier} from './kt134-kt125-session-verifier.mjs';
const cookie='wow_test_session',value='A'.repeat(64);
const row={token_hash:'',session_credential_version:3,user_updated_at_ms:100,
  expires_at_ms:2100000000000,account_id:'a1',user_id:'expert-1',organization_id:'riosv',
  account_state:'approved',activated_at_ms:100,account_credential_version:3,
  role:'expert',active:1,updated_at_ms:100,user_organization_id:'riosv'};
function create(overrides={}){
 const db={prepare(){return{bind(d){this.d=d;return this},
   async first(){return this.d===overrides.expectedHash?{...row,...overrides.row}:null}}}};
 return createKt134Kt125SessionVerifier({db,cookieName:cookie,clock:()=>2000000000000});
}
test('session validates SHA-256 cookie digest against trusted D1, not client user fields',async()=>{
 const data=new TextEncoder().encode(value);
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',data))]
  .map(b=>b.toString(16).padStart(2,'0')).join('');
 const verifier=create({expectedHash:hash});
 const req=new Request('https://kt134.example/kt134/session',{headers:{cookie:cookie+'='+value}});
 const session=await verifier.resolveKt125Session(req);
 assert.equal(session?.principal.userId,'expert-1');
 assert.equal(session?.sessionId,hash);
 assert.equal((await verifier.resolvePrincipal(hash))?.userId,'expert-1');
});
test('expired or inactive user denied',async()=>{
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))]
  .map(b=>b.toString(16).padStart(2,'0')).join('');
 const req=new Request('https://kt134.example/',{headers:{cookie:cookie+'='+value}});
 assert.equal(await create({expectedHash:hash,row:{expires_at_ms:1}}).resolveKt125Session(req),null);
 assert.equal(await create({expectedHash:hash,row:{active:0}}).resolveKt125Session(req),null);
});
test('duplicate cookies and forged user headers never authenticate',async()=>{
 const v=create({expectedHash:'a'.repeat(64)});
 const req=new Request('https://kt134.example/',{headers:{
  cookie:cookie+'='+value+'; '+cookie+'='+value,'X-KT125-User':'expert-1'}});
 assert.equal(await v.resolveKt125Session(req),null);
});
