import test from 'node:test';
import assert from 'node:assert/strict';
import {createKT125AutoProxyGuard} from './kt134-kt125-auto-proxy-guard.mjs';
const origin='https://kt133-tpu-plovdiv-kt125-local-auth.emilgergov.workers.dev';
const caseId='11111111-1111-4111-8111-111111111111';
const requestId='22222222-2222-4222-8222-222222222222';
function fixture(overrides={}){
 const events=[];
 const guard=createKT125AutoProxyGuard({origin,
  route:async()=>{events.push('route');return new Response(JSON.stringify({caseId,status:'automatic_proposal'}),{status:200})},
  reserveOperation:async x=>{events.push('reserve');return {status:'claimed'}},
  completeOperation:async x=>{events.push('complete');return {ok:true}},
  getRevision:async()=>{events.push('recheck');return 4},
  ...overrides});
 function request(extra={}){
  const headers={'Content-Type':'application/json','Origin':origin,
   'Sec-Fetch-Site':'same-origin','X-KT126-Case':caseId,
   'X-KT126-Revision':'4','X-KT134-Request-Id':requestId,...extra.headers};
  return new Request(origin+'/kt134/auto',{method:'POST',headers,
   body:JSON.stringify({operation:'kt134.auto-dossier-analyze.v1',caseId,
    dossierVersion:'4',mode:'automatic_proposal',requireExpertApproval:true,...extra.body})});
 }
 return {guard,request,events};
}
test('case-bound same-origin request reserves, processes, rechecks and persists',async()=>{
 const x=fixture();
 const r=await x.guard(x.request());assert.equal(r.status,200);
 assert.deepEqual(x.events,['reserve','route','recheck','complete']);
});
test('cross-site origin is refused before D1 reservation',async()=>{
 const x=fixture();
 const r=await x.guard(x.request({headers:{Origin:'https://attacker.invalid'}}));
 assert.equal(r.status,403);assert.deepEqual(x.events,[]);
});
test('cross-site fetch metadata is refused even with forged Origin',async()=>{
 const x=fixture();
 const r=await x.guard(x.request({headers:{'Sec-Fetch-Site':'cross-site'}}));
 assert.equal(r.status,403);assert.deepEqual(x.events,[]);
});
test('wrong or missing technical UUID is rejected',async()=>{
 const x=fixture();const r=await x.guard(x.request({headers:{'X-KT126-Case':'EG-2026-000015'}}));
 assert.equal(r.status,400);assert.deepEqual(x.events,[]);
});
test('stale browser version is rejected before reservation',async()=>{
 const x=fixture();const r=await x.guard(x.request({headers:{'X-KT126-Revision':'3'}}));
 assert.equal(r.status,409);assert.deepEqual(x.events,[]);
});
test('different identical request ID is rejected by D1 reservation hook',async()=>{
 const x=fixture({reserveOperation:async()=>({status:'conflict'})});
 const r=await x.guard(x.request());assert.equal(r.status,409);
 assert.deepEqual(x.events,[]);
});
test('completed identical request can be replayed from authenticated persistence',async()=>{
 const x=fixture({reserveOperation:async()=>({status:'done',
  response:new Response(JSON.stringify({ok:true,caseId}),{status:200})})});
 const r=await x.guard(x.request());assert.equal(r.status,200);
 assert.deepEqual(await r.json(),{ok:true,caseId});assert.deepEqual(x.events,[]);
});
test('case changed during analysis invalidates result',async()=>{
 const x=fixture({getRevision:async()=>5});
 const r=await x.guard(x.request());assert.equal(r.status,409);
});
test('no result is reported successful if D1 persistence failed',async()=>{
 const x=fixture({completeOperation:async()=>({ok:false})});
 const r=await x.guard(x.request());assert.equal(r.status,503);
});
test('browser cannot select an arbitrary author endpoint',async()=>{
 const x=fixture();const r=await x.guard(x.request({body:{operation:'/author'}}));
 assert.equal(r.status,409);assert.deepEqual(x.events,[]);
});
