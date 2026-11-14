import test from 'node:test';
import assert from 'node:assert/strict';
import {createCaseSession,createProtectedTransport} from '../kt84/expert-case-session.mjs';
import {installProtectedWorkflow} from '../kt84/protected-workflow-adapter.mjs';
import {readFileSync} from 'node:fs';
const CYCLE='11111111-1111-4111-8111-111111111111';
const CASE='22222222-2222-4222-8222-222222222222';
const actor={id:'expert-a',orgId:'riosv-plovdiv',role:'expert'};
function setup(){
 const local={cycleId:CYCLE,generation:3,evidenceRevision:7};
 const data={caseId:CASE,version:4,revoked:false,principal:actor,created:0,aborts:0};
 const calls=[];
 const transport=async({method='GET',path,body})=>{
  calls.push({method,path,body});
  if(path==='/v1/me')return {ok:true,status:200,data:{ok:true,user:data.principal}};
  if(path==='/v1/cases'&&method==='POST'){
   data.created++;
   return {ok:true,status:201,data:{ok:true,id:CASE,version:data.version}};
  }
  if(path==='/v1/cases/'+CASE&&method==='GET')
   return data.revoked?{ok:false,status:404,data:{ok:false}}:
    {ok:true,status:200,data:{ok:true,case:{id:CASE,orgId:actor.orgId,
      ownerId:actor.id,status:'active',version:data.version}}};
  if(path==='/v1/cases/'+CASE&&method==='PATCH'){
   if(body.version!==data.version)return {ok:false,status:409,data:{ok:false}};
   data.version++;return {ok:true,status:200,data:{ok:true,id:CASE,version:data.version}};
  }
  throw Error('Unexpected route '+method+' '+path);
 };
 const client=createCaseSession({transport,local:()=>local,abortPending:()=>data.aborts++});
 return {client,transport,local,data,calls};
}
test('KT84 binds an authenticated expert to a permanent server case and one local cycle',async()=>{
 const x=setup();
 assert.equal((await x.client.attach(CASE)).code,'SESSION_OR_CASE_INVALID');
 assert.equal((await x.client.login()).ok,true);
 const bound=await x.client.attach(CASE);
 assert.equal(bound.ok,true);
 assert.equal(bound.case.id,CASE);
 assert.equal(bound.case.localCycleId,CYCLE);
 assert.equal((await x.client.check()).ok,true);
 assert.equal(x.client.identity().id,'expert-a');
});
test('KT84 independently rejects revoked grants, foreign sessions and stale revisions',async()=>{
 const x=setup();await x.client.login();await x.client.attach(CASE);
 x.data.revoked=true;
 assert.equal((await x.client.check()).code,'ACCESS_REVOKED_OR_CASE_GONE');
 assert.equal(x.client.bound(),null);
 x.data.revoked=false;await x.client.attach(CASE);
 x.data.version++;
 assert.equal((await x.client.check()).code,'REMOTE_VERSION_CHANGED');
 assert.equal(x.client.bound(),null);
 await x.client.attach(CASE);
 x.local.evidenceRevision++;
 assert.equal((await x.client.check()).code,'CASE_OR_CYCLE_CHANGED');
});
test('KT84 never publishes stale async case results after a case change',async()=>{
 const x=setup();await x.client.login();await x.client.attach(CASE);
 let finish;
 const pending=x.client.authorizedReadWork(async()=>new Promise(resolve=>finish=resolve));
 await new Promise(resolve=>setImmediate(resolve));
 x.local.cycleId='33333333-3333-4333-8333-333333333333';
 finish('do not apply this result');
 assert.equal((await pending).ok,false);
});
test('KT84 pessimistically rejects edit conflicts, never overwriting a second expert',async()=>{
 const x=setup();await x.client.login();await x.client.attach(CASE);
 assert.equal((await x.client.updateSubject('Актуален предмет')).case.version,5);
 x.data.version++;
 const conflict=await x.client.updateSubject('Остарял предмет');
 assert.equal(conflict.code,'VERSION_CONFLICT');
 assert.equal(x.client.bound(),null);
});
test('KT84 creates case only after a server-verified expert session',async()=>{
 const x=setup();
 assert.equal((await x.client.create('ИП пример')).ok,false);
 await x.client.login();
 const created=await x.client.create('ИП пример');
 assert.equal(created.ok,true);assert.equal(x.data.created,1);
 assert.equal(created.case.id,CASE);
});
test('KT84 private transport never sends credentials to an external host',async()=>{
 const requests=[];
 const transport=createProtectedTransport({origin:'https://private.example',
  fetcher:async(url,init)=>{requests.push({url,init});return {
    ok:true,status:200,json:async()=>({ok:true,user:actor})};}});
 await transport({path:'/v1/me'});
 assert.equal(requests[0].url,'https://private.example/v1/me');
 assert.equal(requests[0].init.credentials,'same-origin');
 assert.equal(requests[0].init.redirect,'error');
 assert.equal(requests[0].init.cache,'no-store');
 assert.throws(()=>transport({path:'https://evil.example/v1/me'}),/Невалиден маршрут/);
 assert.throws(()=>createProtectedTransport({origin:'http://private.example',fetcher:()=>{}}),/HTTPS/);
});
test('KT84 protected workflow prevents direct stage clicks and rechecks the same case',async()=>{
 const x=setup();
 const listeners=new Map();
 let stages=[],canceled=0,clearedEG=0;
 const root={KT80WorkflowState:{caseCycleId:CYCLE,generation:3},
  KT82EvidenceInvalidation:{getRevision:()=>x.local.evidenceRevision},
  KT83CaseBoundary:{invalidate:()=>canceled++},
  KT80EGSession:{clear:()=>clearedEG++},
  KT83RouteAccess:{canOpenStage:()=>false},
  KT80WorkflowGo:step=>{stages.push(step);return true},
  document:{addEventListener:(type,fn)=>{
   const a=listeners.get(type)||[];a.push(fn);listeners.set(type,a)}},
  addEventListener(){}};
 const api=installProtectedWorkflow({
  root,apiOrigin:'https://private.example',
  fetcher:async(url,init)=>{
   const path=new URL(url).pathname;
   const response=await x.transport({path,method:init.method,
    body:init.body?JSON.parse(init.body):undefined});
   return {ok:response.ok,status:response.status,json:async()=>response.data};
  }});
 assert.equal(api.canUseStage(1),false);
 await api.login();await api.openExistingCase(CASE);
 const prepared=await api.prepareStage(2);
 assert.equal(prepared.ok,true);
 assert.equal(api.canUseStage(2),true);
 assert.equal((await api.openStage(5)).code,'V11_REVIEW_REQUIRED');
 assert.deepEqual(stages,[]);
 const opened=await api.openStage(3);
 assert.equal(opened.ok,true);
 assert.deepEqual(stages,[3]);
 for(const fn of listeners.get('kt80:case-reset'))fn();
 assert.equal(api.canUseStage(3),false);
 assert.equal(api.getCase(),null);
 assert.ok(canceled>0&&clearedEG>0);
});
test('KT84 remains opt-in; public WOW requires a private shell before protection is activated',()=>{
 const workflow=readFileSync(new URL('../kt80/KT83_WORKFLOW_CASE_V591.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../kt80/KT83_VT01_P1_AUTOMATIC_ROUTE_TEST.html',import.meta.url),'utf8');
 assert.match(workflow,/if\(root\.KT84ProtectedWorkflow&&/);
 assert.doesNotMatch(html,/kt84\/expert-case-session|kt84\/protected-workflow-adapter/);
 const adapter=readFileSync(new URL('../kt84/protected-workflow-adapter.mjs',import.meta.url),'utf8');
 assert.match(adapter,/SERVER_SIDE_EG_CASE_GATE_REQUIRED/);
});
