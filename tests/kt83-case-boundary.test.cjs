// KT83 browser-case boundary automated unit tests (node --test tests/kt83-case-boundary.test.cjs)
// No dossier or API credentials. No external dependencies.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.resolve(__dirname,'../kt80/KT83_CASE_BOUNDARY_V01.js'),'utf8');
function instance(){
 const handlers=new Map();
 const document={
   addEventListener(name,fn){const a=handlers.get(name)||[];a.push(fn);handlers.set(name,a)},
   dispatchEvent(event){for(const fn of handlers.get(event.type)||[])fn(event)}
 };
 const crypto=require('node:crypto');
 const window={document,crypto,KT80WorkflowState:{caseCycleId:crypto.randomUUID(),generation:0}};
 vm.runInNewContext(code,{window});
 return {window,document,boundary:window.KT83CaseBoundary};
}
test('ten experts, ten independent cases and requests',()=>{
 const tabs=Array.from({length:10},instance);
 const requests=tabs.map(t=>t.boundary.begin(2));
 assert.equal(new Set(requests.map(t=>t.caseId)).size,10);
 assert.equal(new Set(requests.map(t=>t.requestId)).size,10);
 requests.forEach((request,i)=>assert.equal(tabs[i].boundary.matches(request),true));
 assert.equal(tabs[1].boundary.matches(requests[0]),false);
 requests.forEach((request,i)=>assert.equal(tabs[i].boundary.finish(request),true));
});
test('reject late replies after reset or dossier replacement',()=>{
 const t=instance();
 const a=t.boundary.begin(2);
 t.window.KT80WorkflowState.generation++;
 t.document.dispatchEvent({type:'kt80:case-reset'});
 assert.equal(t.boundary.finish(a),false);
 const b=t.boundary.begin(4);
 t.window.KT80WorkflowState.caseCycleId=require('node:crypto').randomUUID();
 t.document.dispatchEvent({type:'kt80:case-change'});
 assert.equal(t.boundary.finish(b),false);
});
test('reject replay, revision change and invalid stage',()=>{
 const t=instance();
 assert.throws(()=>t.boundary.begin(6));
 const a=t.boundary.begin(2);
 assert.equal(t.boundary.finish(a),true);
 assert.equal(t.boundary.finish(a),false);
 const b=t.boundary.begin(2);
 t.boundary.invalidate();
 assert.equal(t.boundary.finish(b),false);
});
test('fail closed without trustworthy UUID',()=>{
 const t=instance();
 t.window.KT80WorkflowState.caseCycleId='KT83-CYCLE-LOCAL-1';
 assert.throws(()=>t.boundary.begin(2));
});
