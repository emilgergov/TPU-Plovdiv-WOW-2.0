/* KT84-Б: independent security/continuity checks for RAM-only EG credential.
  Simulated network responses; no real credentials or external service calls. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
const src=fs.readFileSync(path.resolve('kt80/KT80_EG_ACCESS_SESSION_V01.js'),'utf8');

function harness(){
 const events=new Map(),calls=[];
 const state={generation:7,caseCycleId:'case-7',routeConfirmed:null};
 let behavior='network-error';
 const document={addEventListener(name,fn){events.set(name,fn)}};
 const window={KT80WorkflowState:state,addEventListener(name,fn){events.set(name,fn)}};
 async function fetch(url,options){
  calls.push({url,auth:options.headers.Authorization,body:options.body});
  if(behavior==='network-error')throw Error('Failed to fetch');
  return {ok:behavior==='ok',status:behavior==='ok'?200:behavior==='unauthorized'?401:403};
 }
 vm.runInNewContext(src,{window,document,fetch,console});
 return {api:window.KT80EGSession,state,calls,events,mode:v=>behavior=v};
}

test('EG: a transient network failure retains one-case RAM password without claiming verified login',async()=>{
 const h=harness(),url='https://example.invalid/scope-improve';
 assert.equal(h.api.hasAccess(),false);
 await assert.rejects(()=>h.api.request(url,'{}','TEST_ONLY_PASSWORD'),/Failed to fetch/);
 assert.equal(h.api.hasAccess(),true);
 h.mode('ok');
 const response=await h.api.request(url,'{"scope":"draft"}');
 assert.equal(response.status,200);
 assert.equal(h.calls.length,2);
 assert.equal(h.calls[0].auth,'Bearer TEST_ONLY_PASSWORD');
 assert.equal(h.calls[1].auth,'Bearer TEST_ONLY_PASSWORD');
});

test('EG: unauthorized response clears the password and blocks reuse',async()=>{
 const h=harness();
 h.mode('unauthorized');
 const response=await h.api.request('https://example.invalid','{}','FAKE_SECRET');
 assert.equal(response.status,401);
 assert.equal(h.api.hasAccess(),false);
 await assert.rejects(()=>h.api.request('https://example.invalid','{}'),/еднократно/);
});

test('EG: new case/reset/procedure confirmation and generation changes discard RAM credential',async()=>{
 for(const event of ['kt80:case-change','kt80:case-reset','kt80:procedure-confirmed','pagehide']){
  const h=harness();
  h.mode('ok');
  await h.api.request('https://example.invalid','{}','FAKE_SECRET');
  assert.equal(h.api.hasAccess(),true);
  h.events.get(event)();
  assert.equal(h.api.hasAccess(),false, event);
 }
 const h=harness();
 h.mode('ok');
 await h.api.request('https://example.invalid','{}','FAKE_SECRET');
 h.state.generation=8;
 assert.equal(h.api.hasAccess(),false);
});

test('EG: credential never leaks via JSON-exposed API or browser storage',async()=>{
 const h=harness();
 h.mode('ok');
 await h.api.request('https://example.invalid','{}','FAKE_SECRET');
 const exposed=JSON.stringify(Object.keys(h.api));
 assert.ok(!/FAKE_SECRET|credential|password|token/.test(exposed));
 assert.deepEqual(Object.keys(h.api).sort(),['clear','hasAccess','request']);
});
