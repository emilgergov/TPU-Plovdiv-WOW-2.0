import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptKt134NativeGis as adapt} from './kt134-native-gis-evidence.mjs';
const doc=[{sourceId:'original-file',text:'Съществуващо инвестиционно предложение.'}];
const base={status:'Намерен',input:'56789.22.1',cadnum:'56789.22.1',
 geojson:{features:[{geometry:{type:'Polygon'}}]},
 verified_zone_intersections:[{name:'BG0000123'}],intersection_verified_outside:false};
test('legacy GIS verified:false does not veto genuine per-parcel overlay verification',()=>{
 const result=adapt({state:{},documents:doc,globals:{KT80FreeGISResults:{
  verified:false,ids:['56789.22.1'],results:[base]}}});
 assert.equal(result.mode,'spatial_review');
 assert.equal(result.gis.protectedZones[0].name,'BG0000123');
 assert.equal(result.gis.pdf1Ref,'');
 assert.equal(result.pdf1Verified,false);
});
test('no parcels -> reviewer contextual proposal; no fake negative intersection',()=>{
 const result=adapt({state:{intake:{}},documents:doc,globals:{}});
 assert.equal(result.mode,'contextual_review');
 assert.deepEqual(result.gis.protectedZones,[]);
 assert.equal(result.gis.analysisMode,'contextual_unverified');
 assert.match(result.reason,/Няма потвърдени/);
});
test('incomplete GIS verification produces contextual uncertainty rather than false result',()=>{
 const result=adapt({state:{},documents:doc,globals:{KT80FreeGISResults:{
  ids:['56789.22.1'],results:[{...base,verified_zone_intersections:undefined}]}}});
 assert.equal(result.mode,'contextual_review');
 assert.ok(result.issues.includes('DO_NOT_INFER_PROTECTED_ZONE_INTERSECTIONS'));
});
test('explicit KT125 confirmed complaint skip retains the existing contract',()=>{
 const result=adapt({state:{gisSkipConfirmed:true,
  gisSkipReason:'Възражение без инвестиционно предложение'},globals:{},documents:doc});
 assert.equal(result.mode,'contextual_skip');
 assert.equal(result.reason,'Възражение без инвестиционно предложение');
});
test('no geometry cannot masquerade as verified overlays',()=>{
 const r=adapt({state:{},globals:{KT80FreeGISResults:{
  ids:['56789.22.1'],results:[{...base,geojson:{features:[]}}]}}});
 assert.equal(r.mode,'contextual_review');
});
test('GIS overlap missing even one parcel cannot be declared complete',()=>{
 const r=adapt({state:{},globals:{KT80FreeGISResults:{
  ids:['56789.22.1','56789.22.2'],results:[base]}}});
 assert.equal(r.mode,'contextual_review');
});

test('document parcels survive a partial saved GIS list without becoming verified',()=>{
 const identifier='56789.22.2';
 const state={intake:{all_parcels:[{identifier},'56789.22.3']}};
 const result=adapt({state,globals:{KT80FreeGISResults:{
  ids:[base.input],results:[base]}}});
 assert.deepEqual(result.parcels.map(row=>row.identifier),
  [identifier,'56789.22.3',base.input]);
 assert.equal(result.parcels[0].evidenceStatus,'DOCUMENT_CANDIDATE_NOT_EXPERT_CONFIRMED');
 assert.deepEqual(result.gis.verifiedParcelIds,[base.input]);
});
