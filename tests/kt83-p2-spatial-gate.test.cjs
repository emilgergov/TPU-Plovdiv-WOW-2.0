'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {check,pdfReceiptMatches}=require('../kt80/integration/kt83-p2-spatial-gate.js');
function fixture(){
 const ids=['56784.13.102','56784.13.105'];
 const results=ids.map(id=>({input:id,status:'Намерен',
  geojson:{features:[{geometry:{type:'Polygon',coordinates:[[[0,0],[0,1],[1,1],[0,0]]]}}]},
  verified_zone_intersections:[],intersection_verified_outside:true}));
 const live={ids:[...ids],results};
 const pi={ids:[...ids],items:ids.map(()=>({status:'FOUND',profile:{ekatte:'56784',area_m2:1000}}))};
 return {caseId:'case-a',generation:1,evidenceRevision:3,gisDecision:'REQUIRED',
  ids,live,pi,zones:Array.from({length:32},()=>({type:'Feature'}))};
}
test('P2 full ready is proof-bound and not a legal conclusion',()=>{
 const x=fixture(),r=check(x);
 assert.equal(r.ok,true);assert.equal(r.code,'READY');
 assert.equal(pdfReceiptMatches(x,{caseId:x.caseId,generation:x.generation,
 evidenceRevision:x.evidenceRevision,source:x.live,ids:[...x.ids],bytes:23242}),true);
});
test('P2 never misstates archive overlap or GIS exemption as geometry',()=>{
 let x=fixture(); x.gisDecision='NOT_REQUIRED';
 assert.equal(check(x).code,'GIS_NOT_REQUIRED');
 x=fixture();x.live.results[0].geojson.features=[];
 x.live.results[0].archival_overlap=true;
 assert.equal(check(x).code,'GEOMETRY_UNVERIFIED');
});
test('P2 checks all intersections, PI MASTER records and 32 boundaries',()=>{
 let x=fixture();delete x.live.results[1].intersection_verified_outside;
 assert.equal(check(x).code,'INTERSECTIONS_UNVERIFIED');
 x=fixture();x.live.results[1].intersection_verified_outside=false;
 assert.equal(check(x).code,'INTERSECTIONS_UNVERIFIED');
 x=fixture();x.pi.items[1].status='MISSING';
 assert.equal(check(x).code,'PI_MASTER_INCOMPLETE');
 x=fixture();x.zones.pop();
 assert.equal(check(x).code,'ZONE_BOUNDARIES_INCOMPLETE');
});
test('P2 rejects uncertain identifiers rather than silently dropping them',()=>{
 const x=fixture();x.uncertainIds=['неуточнен имот'];
 assert.equal(check(x).code,'IDS_UNCERTAIN');
});
test('P2 rejects mismatches and stale PDF1 receipts',()=>{
 const x=fixture(),receipt={caseId:x.caseId,generation:x.generation,
 evidenceRevision:x.evidenceRevision,source:x.live,ids:[...x.ids],bytes:100};
 assert.equal(pdfReceiptMatches(x,{...receipt,caseId:'another-case'}),false);
 assert.equal(pdfReceiptMatches(x,{...receipt,evidenceRevision:2}),false);
 assert.equal(pdfReceiptMatches(x,{...receipt,source:{...x.live}}),false);
 assert.equal(pdfReceiptMatches(x,{...receipt,bytes:0}),false);
 const y=fixture();y.live.results.reverse();
 assert.equal(check(y).code,'GEOMETRY_UNVERIFIED');
});
test('P2 integration uses approved original PDF1 and active case boundary',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const base=path.join(__dirname,'..','kt80');
 const browser=fs.readFileSync(path.join(base,'integration/kt83-p2-automatic-pdf1.js'),'utf8');
 const gis=fs.readFileSync(path.join(base,'KT82_A_FREE_GIS_V603.js'),'utf8');
 const bridge=fs.readFileSync(path.join(base,'KT82_STAGE4_V11_SOURCE_GATE_V610.js'),'utf8');
 const pdfSource=fs.readFileSync(path.join(base,'KT82_A_PDF1_V600.js'),'utf8');
 assert.match(browser,/KT80PDF1Bridge\.makePDF\(\)/);
 assert.match(browser,/issued===check\.key/);
 assert.match(browser,/kt82:pdf1-completed/);
 assert.match(browser,/pdfReceiptMatches\(x,e\.detail\)/);
 assert.match(browser,/serial\+\+/);
 assert.match(browser,/event\.detail/);
 assert.match(gis,/kt83:gis-intersections-checked/);
 assert.match(bridge,/bytes:receipt\.bytes/);
 assert.match(pdfSource,/evidenceRevision===\(root\.KT82EvidenceInvalidation/);
 assert.match(pdfSource,/source:live,evidenceRevision:evidenceRevision,bytes:blob\.size/);
 assert.match(pdfSource,/document\.addEventListener\('kt82:evidence-invalidated',reset\)/);
});

test('P2 browser integration calls approved PDF1 once per case revision',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
 const code=fs.readFileSync(path.join(__dirname,'../kt80/integration/kt83-p2-automatic-pdf1.js'),'utf8');
 const source=fixture(), listeners=new Map();
 const doc={
  readyState:'complete',
  getElementById:id=>id==='kt80ParcelInput'?{value:source.ids.join('; ')}:
    id==='kt83P1RouteText'?{textContent:''}:null,
  addEventListener:(name,fn)=>{if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn);}
 };
 const emit=(name,detail)=>{for(const fn of listeners.get(name)||[])fn({detail});};
 let generated=0;
 const window={
  KT83P2SpatialGate:{check,pdfReceiptMatches},
  KT80WorkflowState:{step:3,caseCycleId:source.caseId,generation:source.generation,
    normativeGate:{expertConfirmed:true,decision:'REQUIRED'}},
  KT82EvidenceInvalidation:{getRevision:()=>source.evidenceRevision},
  V26ParcelEditor:{normalize:()=>({ids:[...source.ids],invalid:[],uncertain:[]})},
  KT80FreeGISResults:source.live,
  KT80PIMaster:{getResult:()=>source.pi},
  KT80FreeGIS:{getMap:()=>({zones:source.zones})},
  setTimeout:fn=>fn()
 };
 window.KT80PDF1Bridge={makePDF:()=>{
  generated++;
  emit('kt82:pdf1-completed',{caseId:source.caseId,generation:source.generation,
    evidenceRevision:source.evidenceRevision,source:source.live,ids:source.ids,bytes:3000});
 }};
 vm.runInNewContext(code,{window,document:doc,Promise});
 emit('kt80:stage-open',{step:3});
 emit('kt80:stage-open',{step:3});
 assert.equal(generated,1,'must not make duplicate PDF1 for same proof');
 emit('kt80:case-reset',{});
 source.evidenceRevision++;
 emit('kt80:stage-open',{step:3});
 assert.equal(generated,2,'new evidence revision permits new PDF1');
});

test('KT84 FINAL: failed PDF1 generation releases its reservation for a genuine retry',async()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const source=fixture(),listeners=new Map(),pending=[];
 const doc={readyState:'complete',
  getElementById:id=>id==='kt80ParcelInput'?{value:source.ids.join('; ')}:
    id==='kt83P1RouteText'?{textContent:''}:null,
  addEventListener:(name,fn)=>{if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn)}};
 const root={
  KT83P2SpatialGate:{check,pdfReceiptMatches},
  KT80WorkflowState:{step:3,caseCycleId:source.caseId,generation:source.generation,
   normativeGate:{expertConfirmed:true,decision:'REQUIRED'}},
  KT82EvidenceInvalidation:{getRevision:()=>source.evidenceRevision},
  V26ParcelEditor:{normalize:()=>({ids:source.ids,invalid:[],uncertain:[]})},
  KT80FreeGISResults:source.live,KT80PIMaster:{getResult:()=>source.pi},
  KT80FreeGIS:{getMap:()=>({zones:source.zones})},
  setTimeout:()=>{throw Error('Unexpected spatial polling')}
 };
 root.KT80PDF1Bridge={makePDF:()=>new Promise((resolve,reject)=>pending.push({resolve,reject}))};
 vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../kt80/integration/kt83-p2-automatic-pdf1.js'),'utf8'),
  {window:root,document:doc,Promise});
 const begin=()=>root.KT83P2Automatic.begin();
 begin();begin();
 assert.equal(pending.length,1,'one in-flight PDF1 per case and revision');
 pending[0].reject(Error('Temporary renderer outage'));
 await new Promise(resolve=>setImmediate(resolve));
 begin();
 assert.equal(pending.length,2,'failed attempt can be retried in the same case');
 begin();
 assert.equal(pending.length,2,'second in-flight generation cannot be duplicated');
 pending[1].resolve();
 await new Promise(resolve=>setImmediate(resolve));
});
test('KT84 FINAL: delayed failure from prior case does not clear the new case PDF1 receipt',async()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const source=fixture(),listeners=new Map(),pending=[];
 const doc={readyState:'complete',
  getElementById:id=>id==='kt80ParcelInput'?{value:source.ids.join('; ')}:
    id==='kt83P1RouteText'?{textContent:''}:null,
  addEventListener:(name,fn)=>{if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn)}};
 const root={
  KT83P2SpatialGate:{check,pdfReceiptMatches},
  KT80WorkflowState:{step:3,caseCycleId:source.caseId,generation:source.generation,
   normativeGate:{expertConfirmed:true,decision:'REQUIRED'}},
  KT82EvidenceInvalidation:{getRevision:()=>source.evidenceRevision},
  V26ParcelEditor:{normalize:()=>({ids:source.ids,invalid:[],uncertain:[]})},
  KT80FreeGISResults:source.live,KT80PIMaster:{getResult:()=>source.pi},
  KT80FreeGIS:{getMap:()=>({zones:source.zones})},setTimeout:()=>{}
 };
 root.KT80PDF1Bridge={makePDF:()=>new Promise((resolve,reject)=>pending.push({resolve,reject}))};
 vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../kt80/integration/kt83-p2-automatic-pdf1.js'),'utf8'),
  {window:root,document:doc,Promise});
 root.KT83P2Automatic.begin();
 root.KT80WorkflowState.caseCycleId='case-next';
 for(const fn of listeners.get('kt80:case-change')||[])fn({});
 root.KT83P2Automatic.begin();
 assert.equal(pending.length,2);
 pending[0].reject(Error('Old dossier failed'));
 await new Promise(resolve=>setImmediate(resolve));
 root.KT83P2Automatic.begin();
 assert.equal(pending.length,2,'late old failure cannot restart or duplicate new-case PDF1');
 pending[1].resolve();
 await new Promise(resolve=>setImmediate(resolve));
});
