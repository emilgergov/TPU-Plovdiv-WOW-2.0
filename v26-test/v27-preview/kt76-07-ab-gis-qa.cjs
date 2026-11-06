'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const base='v26-test/v27-preview/';
const code=fs.readFileSync(base+'kt76-07-gis-evidence-audit.js','utf8');
const page=fs.readFileSync(base+'KT76_07_AB_GIS_INTEGRATION_TEST.html','utf8');
const before=fs.readFileSync(base+'KT76_06_WORD_INTEGRATION_TEST.html','utf8');
assert(page.includes('kt76-07-gis-evidence-audit.js?v=kt76-07-1'));
assert(page.includes('KT7607GISEvidence.audit({scenario:kt60.scenario,results:found,zoneFeatures,parcelIds:ids,gisClass:kt7603.relation||null})'));
assert(page.includes('KT7605UnifiedQA.verify(kt7606.blob'));
assert(!before.includes('KT7607GISEvidence'));
for(const [i,m] of [...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].entries())
 if(m[1].trim())new vm.Script(m[1],{filename:'inline-'+i});
const ctx={window:{},console,Error};vm.createContext(ctx);vm.runInContext(code,ctx);
const audit=ctx.window.KT7607GISEvidence.audit;
const poly=(a,b)=>({type:'Polygon',coordinates:[[[a,0],[b,0],[b,1],[a,1],[a,0]]]});
const feat=(geom,code)=>({type:'Feature',geometry:geom,properties:{SITECODE:code}});
const zones=Array.from({length:32},(_,i)=>feat(poly(i+5,i+6),'BG'+String(i+1000000)));
function b(half){
 return {
 scenario:'Б',parcelIds:['36676.129.457'],gisClass:half?'попада частично':'попада',
 results:[{input:'36676.129.457',verified_zone_intersections:['BG0000194'],geojson:{features:[feat(poly(0,1))]},overlap_geojson:{features:[feat(poly(0,half?.5:1),'BG0000194')]}}]
 };
}
function a(){
 return {scenario:'А',parcelIds:['56784.13.102','56784.13.105'],zoneFeatures:zones,results:['56784.13.102','56784.13.105'].map(input=>({input,intersection_verified_outside:true,verified_zone_intersections:[],geojson:{features:[feat(poly(0,1))]}}))};
}
let x=audit(a());assert.equal(x.classification,'извън защитените зони');assert.equal(x.checkedZones,32);console.log('KT76-07 A PASS: 2 parcels, 32 verified zones, no intersections');
for(const half of [false,true]){
 const q=audit(b(half));assert.equal(q.classification,half?'попада частично':'попада');
 assert.equal(q.areaSharePercent,half?50:100);
 console.log('KT76-07 B '+(half?'PARTIAL':'FULL')+' PASS: area share '+q.areaSharePercent+'%');
}
assert.throws(()=>audit({...b(true),gisClass:'попада'}),/различен ГИС извод/);
assert.throws(()=>audit({...b(false),results:[{...b(false).results[0],overlap_geojson:{features:[]}}]}),/липсва пълна геометрия/);
assert.throws(()=>audit({...a(),zoneFeatures:zones.slice(0,31)}),/пълният набор 32 зони/);
assert.throws(()=>audit({...a(),results:[{...a().results[0],verified_zone_intersections:['BG0000194']},a().results[1]]}),/потвърдено или положително пресичане/);
console.log('KT76-07 COMPLETE PASS — two A parcels, full/partial B, contradictory GIS and incomplete data fail closed');
