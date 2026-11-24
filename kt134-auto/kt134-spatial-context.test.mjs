import test from 'node:test';
import assert from 'node:assert/strict';
import {createKT134SpatialContext} from './kt134-spatial-context.mjs';
const caseId='11111111-1111-4111-8111-111111111111';
const input={caseId,context:{caseId,documents:[]}};
test('real GIS failure preserves historical PI context but never pretends geometry verification',async()=>{
 const read=createKT134SpatialContext({
  readSpatial:async()=>{throw Error('Сървърът за геометрия е недостъпен')},
  readParcelIndex:async()=>({caseId,verified:false,parcels:[{cadnum:'56784.13.102',area_m2:3434.7131219906,zz:[],zt:[]} ]})
 });
 const out=await read(input);
 assert.equal(out.verified,false);
 assert.equal(out.geometryVerified,false);
 assert.equal(out.historicalPIMaster.parcels.length,1);
 assert.equal(out.actualGIS,null);
 assert.equal(out.evidence.length,0);
});
test('actual GIS evidence remains available next to non-decisive historical PI data',async()=>{
 const gisEvidence={factId:'intersection',sourceType:'gis',sourceId:'MASTER-2026',sourceLocation:'PDF1-1',verification:'verified'};
 const read=createKT134SpatialContext({
  readSpatial:async()=>({caseId,verified:true,geometryVerified:true,evidence:[gisEvidence]}),
  readParcelIndex:async()=>({caseId,verified:false,parcels:[{cadnum:'56784.13.102'}]})
 });
 const out=await read(input);
 assert.equal(out.verified,true);
 assert.equal(out.geometryVerified,true);
 assert.deepEqual(out.evidence,[gisEvidence]);
 assert.equal(out.historicalPIMaster.verified,false);
});
test('wrong-case GIS results cannot verify current case',async()=>{
 const read=createKT134SpatialContext({
  readSpatial:async()=>({caseId:'other',verified:true,geometryVerified:true,evidence:[]}),
  readParcelIndex:async()=>({caseId,verified:false,parcels:[]})
 });
 const out=await read(input);
 assert.equal(out.verified,false);
 assert.equal(out.actualGIS,null);
});
test('missing PI MASTER is a visible gap but does not veto a genuine GIS result',async()=>{
 const read=createKT134SpatialContext({
  readSpatial:async()=>({caseId,verified:true,geometryVerified:true,evidence:[]}),
  readParcelIndex:async()=>{throw Error('Архивът липсва')}
 });
 const out=await read(input);
 assert.equal(out.verified,true);
 assert.equal(out.historicalPIMaster,null);
 assert.ok(out.gaps.some(s=>s.includes('ПИ MASTER')));
});
