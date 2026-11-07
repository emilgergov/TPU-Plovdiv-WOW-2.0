#!/usr/bin/env node
/* KT77-03: fail-closed verification of a NEW PI MASTER browser export.
   Existing parcelgeom_*.json.gz are NOT this export. Never assume that they are.
   Contract: 67 gzip JSON arrays of {cadnum, settlement, municipality, province,
   locality?, area_m2, zz:[], zt:[]}, declared in manifest.json.
   Identifiers of ZT are accepted for lookup but not required in display.
*/
'use strict';
const fs=require('node:fs'), path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const fail=(msg)=>{throw Error('KT77 PI MASTER INDEX BLOCKED: '+msg)};
function verify(root) {
 const manifestPath=path.join(root,'manifest.json');
 if(!fs.existsSync(manifestPath))fail('missing manifest.json');
 const m=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 if(m.schema!=='kt77-pi-master-browser-v1')fail('unknown schema');
 if(!Array.isArray(m.parts)||m.parts.length!==67)fail('expected exactly 67 PI MASTER parts');
 if(m.total_unique_parcels!==917417||m.zz_pairs!==176553||m.zt_pairs!==2746)fail('unexpected declared totals');
 if(m.ekatte_codes!==212)fail('unexpected EKATTE scope');
 const names=new Set(), ids=new Set();let zz=0,zt=0;
 for(const part of m.parts) {
  if(!part||typeof part.file!=='string'||!/^pi-master-[0-9]{2}\.json\.gz$/.test(part.file))fail('invalid part filename');
  if(names.has(part.file))fail('duplicate part filename '+part.file);names.add(part.file);
  if(!/^[a-f0-9]{64}$/.test(part.sha256||''))fail('missing SHA256 for '+part.file);
  const file=path.join(root,part.file);if(!fs.existsSync(file))fail('missing '+part.file);
  const bytes=fs.readFileSync(file);
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==part.sha256)fail('checksum mismatch '+part.file);
  let rows;try{rows=JSON.parse(zlib.gunzipSync(bytes).toString('utf8'))}catch(e){fail('invalid gzip/JSON '+part.file)}
  if(!Array.isArray(rows)||rows.length!==part.records)fail('row count mismatch '+part.file);
  for(const r of rows){
   if(!r||typeof r.cadnum!=='string'||!/^\d{5}\.\d+\.\d+$/.test(r.cadnum)||ids.has(r.cadnum))fail('invalid/duplicate cadnum '+r?.cadnum);
   if(typeof r.settlement!=='string'||!r.settlement.trim()||typeof r.municipality!=='string'||!r.municipality.trim()||r.province!=='Пловдив')fail('incomplete administrative profile '+r.cadnum);
   if(!Number.isFinite(r.area_m2)||r.area_m2<=0||!Array.isArray(r.zz)||!Array.isArray(r.zt))fail('invalid spatial profile '+r.cadnum);
   if(r.zz.some(x=>!x||typeof x.code!=='string'||!/^BG\d{7}$/.test(x.code)||!Number.isFinite(x.area_m2)||!Number.isFinite(x.percent)))fail('invalid ZZ '+r.cadnum);
   if(r.zt.some(x=>!x||typeof x.name!=='string'||typeof x.category!=='string'||!Number.isFinite(x.area_m2)||!Number.isFinite(x.percent)))fail('invalid ZT '+r.cadnum);
   ids.add(r.cadnum);zz+=r.zz.length;zt+=r.zt.length;
  }
 }
 if(ids.size!==m.total_unique_parcels||zz!==m.zz_pairs||zt!==m.zt_pairs)fail('aggregate reconciliation failed: parcels='+ids.size+', ZZ='+zz+', ZT='+zt);
 return {status:'PASS',parcels:ids.size,zz_pairs:zz,zt_pairs:zt,parts:names.size};
}
if(require.main===module){try{console.log(JSON.stringify(verify(process.argv[2]||path.join(__dirname,'browser-index'))))}catch(e){console.error(e.message);process.exitCode=1}}
module.exports={verify};
