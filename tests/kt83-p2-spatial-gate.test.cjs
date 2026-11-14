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
 assert.match(browser,/KT80PDF1Bridge\.makePDF\(\)/);
 assert.match(browser,/issued===check\.key/);
 assert.match(browser,/event\.detail/);
 assert.match(gis,/kt83:gis-intersections-checked/);
 assert.match(bridge,/bytes:receipt\.bytes/);
});
