import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const root=new URL('../src/',import.meta.url);
const source=readFileSync(new URL('kt123-evidence-qualification.mjs',root),'utf8');
const start=source.indexOf('export function buildQualificationSources(');
const end=source.indexOf('export function validateQualification(',start);
assert.ok(start>=0&&end>start);
const build=vm.runInNewContext('('+source.slice(start,end).replace('export ','').trim()+')',{tidy:s=>String(s||'').trim()});
const spatial={spatialClass:'INTERSECTS',geometryVerified:true,pdf1Current:false,
 parcelIds:['12345.1.2'],parcels:[{id:'12345.1.2',verifiedZoneIntersections:[
 {kind:'ЗЗ',legalRegime:'ЗБР',code:'BG0000001',name:'Контролна зона – буфер',area_m2:48.5}]}],
 limitation:'Само пространствени факти; не определя приложима процедура.'};
const gis={parcelIds:['12345.1.2'],spatial:JSON.stringify(spatial),
 stage3:JSON.stringify({status:'current'}),areaContext:'Няма допълнителни данни'};
const input={subject:'Контролна сграда',scope:'Един имот',confirmed:[
 {factId:'spatial_intersection',value:'true'}],documents:[{source:'Контролен документ',text:'Едноетажна сграда'}],
 legalProvisions:[],gis};
const result=build(input);
const facts=result.facts.filter(x=>x.id.startsWith('gis:'));
assert.equal(facts.length,4);
assert.equal(facts.find(x=>x.id==='gis:spatial').text,gis.spatial);
assert.ok(facts.every(x=>x.established===false&&x.kind==='case-spatial-context'));
assert.equal(JSON.parse(facts.find(x=>x.id==='gis:spatial').text).pdf1Current,false);
assert.equal(result.facts.some(x=>x.id==='fact:spatial_intersection'),false);
assert.equal(result.facts.some(x=>x.status||x.selectedPanel),false);
assert.deepEqual(JSON.parse(JSON.stringify(build({...input,gis:null}).facts)),
 JSON.parse(JSON.stringify(result.facts.filter(x=>!x.id.startsWith('gis:')))));
for(const value of [null,undefined,[],true,'foreign text',{}]){
 assert.equal(build({...input,gis:value}).facts.some(x=>x.id.startsWith('gis:')),false);
}
const uncertain={...gis,spatial:JSON.stringify({...spatial,geometryVerified:false,spatialClass:'UNDETERMINED'})};
assert.equal(JSON.parse(build({...input,gis:uncertain}).facts.find(x=>x.id==='gis:spatial').text).geometryVerified,false);
const worker=readFileSync(new URL('worker.js',root),'utf8');
assert.ok(worker.includes('gis:context.gisAnalysis'));
assert.ok(worker.includes('gisAnalysis:detail.gis||null'));
assert.ok(worker.includes('gisEvidence:detail.gis||null'));
assert.ok(worker.includes('Не променяй четирите статуса, не избирай нов панел'));
console.log('KT130 GIS qualification parity: identical spatial source, uncertainty preserved, no legal promotion or provider calls');
