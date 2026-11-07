#!/usr/bin/env node
'use strict';
/* KT77 R06: lock original R13/GIS/Word/PDF/AI script references.
   Confirm complete PI MASTER index, important pilot profiles and reader wiring.
   All tests run against the repository's *actual published* files. */
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const root=__dirname, gis=path.join(root,'../gis-data/pi-master/browser-index');
const f=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const r05=f('V27_27_KT77_03_PI_MASTER_PILOT_R05.html');
const r06=f('V27_27_KT77_03_PI_MASTER_FULL_R06.html');
function assert(condition,message){if(!condition)throw Error('KT77 R06 QA FAILED: '+message)}
const oldMarker='<script id="kt77-03-pi-master-pilot-logic">';
const newMarker='<script src="v27-preview/kt77-pi-master-readonly-index.js?v=kt77-full-917417-r06">';
assert(r05.includes(oldMarker)&&r06.includes(newMarker),'missing source/integration seam');
assert(r05.slice(0,r05.indexOf(oldMarker))===r06.slice(0,r06.indexOf(newMarker)),'locked base/map/source scripts changed');
const sources=(html)=>[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(x=>x[1]);
const a=sources(r05),b=sources(r06);
assert(b.length===a.length+1,'script dependency count changed');
assert(JSON.stringify(b.filter(x=>!x.includes('kt77-pi-master-readonly-index.js')))===JSON.stringify(a),'original GIS/Word/PDF/AI script dependencies changed');
assert(!r06.includes('const pilot='),'12-record pilot unexpectedly active');
assert(r06.includes('window.select=function(i,keepAll)'),'R13 select not wrapped');
assert(r06.includes('original.apply(this,arguments)'),'GIS base select not preserved');
assert(r06.includes('row.category+" „"+row.name+"“'),'ZT expert-facing name/category missing');
assert(!r06.includes('text.textContent=protectedTerritory?\n   (row.internal_id'),'internal ZT code leaked');
assert(r06.includes('НЕ означава, че имотът е извън'),'missing fail-closed no-data distinction');
assert(r06.includes('Статус ЗЗ/ЗТ не се определя'),'missing fetch error fail-closed distinction');
assert(!r06.includes('dossier.new') && !r06.includes('word.generate='),'unexpected generator modification');
const manifest=JSON.parse(fs.readFileSync(path.join(gis,'manifest.json'),'utf8'));
assert(manifest.status==='VERIFIED'&&manifest.total_unique_parcels===917417&&manifest.parts.length===67,'invalid published index manifest');
function read(id) {
 const prefix=id.slice(0,2);const filename='pi-master-'+prefix+'.json.gz';
 const part=manifest.parts.find(x=>x.file===filename);assert(part,'missing prefix '+prefix);
 const list=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(gis,part.file))));
 assert(list.length===part.records,'shard record count '+filename);
 return list.find(x=>x.cadnum===id);
}
for(const [id,mun,nzz,nzt,site] of [
 ['46989.205.218','Лъки',1,1,'BG0001031'],
 ['47086.6.15','Марица',0,1,null],
 ['37277.49.53','Карлово',4,1,'BG0000494'],
 ['56784.13.102','Пловдив',0,0,null],
 ['36676.129.457','Садово',1,0,'BG0000194'],
 ['99087.40.46','Асеновград',0,1,null],
]) {
 const r=read(id);assert(r&&r.municipality===mun&&r.zz.length===nzz&&r.zt.length===nzt,'pilot mismatch '+id);
 if(site)assert(r.zz.some(x=>x.code===site),'Natura code mismatch '+id);
 console.log('PASS',id,mun,nzz,nzt);
}
const near=(a,b)=>Math.abs(a-b)<0.001;
assert(near(read('46989.205.218').zt[0].area_m2,2878.4489717876277),'Sveti Duh intersection area regressed');
assert(near(read('36676.129.457').zz[0].area_m2,16609.101037239554),'Reka Chaya intersection area regressed');
assert(near(read('47086.6.15').zt[0].area_m2,19149.02675653158),'Trakiyski Ravnec intersection area regressed');
console.log('KT77 R06 QA PASS: 67 published parts, 917417 parcels, real cases, generator script parity, fail-closed');
