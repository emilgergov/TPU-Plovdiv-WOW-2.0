'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const gate=require(path.join(__dirname,'KT134_SPATIAL_GATE_CONSISTENCY.js'));
const id='99999.999.999';
const input=()=>({caseId:'CASE_01',generation:1,evidenceRevision:1,gisDecision:'REQUIRED',ids:[id],invalidIds:[],uncertainIds:[],live:{ids:[id],results:[{input:id,status:'Намерен',geojson:{features:[{geometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,0]]]}}]},verified_zone_intersections:[],intersection_verified_outside:true}]},pi:{ids:[id],items:[{status:'FOUND',profile:{}}]},zones:Array.from({length:32},()=>({}))});
const cases=[
 ['confirmed outside',[],true,true],
 ['confirmed overlap',['BG0000001'],false,true],
 ['contradictory overlap',['BG0000001'],true,false],
 ['unknown empty',[],false,false],
 ['empty zone code',[''],false,false],
 ['duplicate zone code',['BG0000001','BG0000001'],false,false],
 ['valid object code',[{sitecode:'BG0000001'}],false,true],
 ['invalid object code',[{}],false,false]
];
for(const [name,intersections,outside,expected] of cases){
 const x=input();x.live.results[0].verified_zone_intersections=intersections;x.live.results[0].intersection_verified_outside=outside;
 assert.equal(gate.check(x).ok,expected,name);
 console.log('PASS: '+name);
}
console.log('KT134: Stage3 gate 8/8');
