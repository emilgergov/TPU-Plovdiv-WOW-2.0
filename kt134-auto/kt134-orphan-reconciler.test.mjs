import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createKT134OrphanReconciler} from './kt134-orphan-reconciler.mjs';
const caseId='123e4567-e89b-42d3-a456-426614174000';
const key=h=>`kt134-auto/${caseId}/${h.repeat(64)}.docx`;
const day=86400000,now=()=>Date.parse('2026-11-25T00:00:00Z');
function setup(objects,refs=new Set(),lock=false){
 const deleted=[];
 const r2={async list(){return {objects,truncated:false}},async delete(k){deleted.push(k)}};
 const db={prepare(){return {bind(k){return {async first(){return {n:refs.has(k)?1:0}}}}}}};
 return {vault:createKT134OrphanReconciler({r2,db,now,...(lock?{withExclusiveCleanupLock:async fn=>fn()}: {})}),deleted};
}
test('dry run identifies aged orphans but deletes nothing',async()=>{
 const {vault,deleted}=setup([{key:key('a'),uploaded:new Date(now()-2*day)}]);
 const r=await vault.reconcile();assert.equal(r.candidates,1);assert.equal(r.deleted,0);assert.deepEqual(deleted,[]);
});
test('referenced blobs are never removed',async()=>{
 const k=key('a'),{vault,deleted}=setup([{key:k,uploaded:new Date(now()-2*day)}],new Set([k]));
 const r=await vault.reconcile({dryRun:false});assert.equal(r.protected,1);assert.deepEqual(deleted,[]);
});
test('young and malformed objects are protected',async()=>{
 const {vault,deleted}=setup([{key:key('a'),uploaded:new Date(now()-1000)},{key:'kt134-auto/other',uploaded:new Date(now()-2*day)}],new Set(),true);
 const r=await vault.reconcile({dryRun:false});assert.equal(r.young,1);assert.equal(r.protected,1);assert.deepEqual(deleted,[]);
});
test('aged unreferenced object can be deleted after second reference check',async()=>{
 const k=key('a'),{vault,deleted}=setup([{key:k,uploaded:new Date(now()-2*day)}]);
 const r=await vault.reconcile({dryRun:false});assert.equal(r.deleted,1);assert.deepEqual(deleted,[k]);
});
test('failure to check D1 references stops deletion',async()=>{
 const r2={list:async()=>({objects:[{key:key('a'),uploaded:new Date(now()-2*day)}],truncated:false}),delete:async()=>assert.fail('deleted')};
 const db={prepare:()=>({bind:()=>({first:async()=>{throw Error('D1 failure')}})})};
 await assert.rejects(createKT134OrphanReconciler({r2,db,now,withExclusiveCleanupLock:async fn=>fn()}).reconcile({dryRun:false}),/D1 failure/);
});

test('destructive cleanup without exclusive writer lock fails closed',async()=>{
 const k=key('a'),{vault,deleted}=setup([{key:k,uploaded:new Date(now()-2*day)}]);
 await assert.rejects(vault.reconcile({dryRun:false}),/сървърна блокировка/);
 assert.deepEqual(deleted,[]);
});
