import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createKt134ProtectedHttpHandler} from './kt134-protected-http-integration.mjs';

const cfg=(overrides={})=>({
 resolveKt125Session:async()=>null,
 loadProtectedContext:async()=>{throw Error('MUST_NOT_LOAD_CASE')},
 loadEvidenceBundle:async()=>{throw Error('MUST_NOT_LOAD_EVIDENCE')},
 buildDraftWord:async()=>{throw Error('MUST_NOT_BUILD_WORD')},
 egWorkerBase:'https://test.invalid',egAccessToken:'only-server-secret',
 fetchImpl:async()=>{throw Error('MUST_NOT_CALL_AI')},...overrides
});
const req=(method='POST',body={caseId:'EG-2026-000004'},origin)=>
 new Request('https://kt134.example/kt134/automatic/draft',{
  method,headers:{'content-type':'application/json',...(origin?{origin}:{})},
  ...(method==='POST'?{body:JSON.stringify(body)}:{})
 });
test('unauthenticated browser cannot run real EG model',async()=>{
 const h=createKt134ProtectedHttpHandler(cfg());
 const r=await h(req());assert.equal(r.status,401);
 assert.equal((await r.json()).error,'KT125_AUTH_REQUIRED');
});
test('cross-origin browser request rejected before session',async()=>{
 const h=createKt134ProtectedHttpHandler(cfg());
 const r=await h(req('POST',{},'https://evil.example'));
 assert.equal(r.status,403);
});
test('browser cannot inject trusted facts, user identity or access policy',async()=>{
 const h=createKt134ProtectedHttpHandler(cfg({
  resolveKt125Session:async()=>({authenticated:true,sessionId:'server-session'})
 }));
 const r=await h(req('POST',{caseId:'EG-2026-000004',principal:{roles:['expert']}}));
 assert.equal(r.status,400);assert.equal((await r.json()).error,'CASE_ID_REQUIRED');
});
test('invalid case id does not reach protected adapters',async()=>{
 const h=createKt134ProtectedHttpHandler(cfg({
  resolveKt125Session:async()=>({authenticated:true,sessionId:'server-session'})
 }));
 const r=await h(req('POST',{caseId:'../other-case'}));
 assert.equal(r.status,400);
});
test('no unauthenticated GET execution or evidence access',async()=>{
 const h=createKt134ProtectedHttpHandler(cfg());
 const r=await h(req('GET'));assert.equal(r.status,405);
});
