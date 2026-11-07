/* KT77-03 — read-only PI MASTER browser lookup (NOT activated until complete validated export).
   Fail closed: a missing or invalid shard NEVER means parcel outside protected areas.
   This file does not alter the original R13 GIS/map/document generators. */
(function(scope){
"use strict";
const manifestName="manifest.json";
const sha=async bytes=>{
 if(!scope.crypto?.subtle)throw Error("SHA-256 verification unavailable");
 const h=new Uint8Array(await scope.crypto.subtle.digest("SHA-256",bytes));
 return Array.from(h,b=>b.toString(16).padStart(2,"0")).join("");
};
async function unzip(bytes){
 if(typeof scope.DecompressionStream!=="function")throw Error("Gzip decompression unavailable");
 const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
 return JSON.parse(await new Response(stream).text());
}
function create(base){
 const baseURL=new URL(base,scope.location?.href||"https://invalid.example/").href.replace(/\/?$/,"/");
 let manifest=null, lastPrefix=null,lastRows=null;
 async function readJSON(name){
  const response=await fetch(new URL(name,baseURL),{cache:"no-store"});
  if(!response.ok)throw Error("PI MASTER incomplete: "+name+" HTTP "+response.status);
  return response.json();
 }
 async function init(){
  const m=await readJSON(manifestName);
  if(m.schema!=="kt77-pi-master-browser-v1"||m.status!=="VERIFIED"||m.parts?.length!==67||m.total_unique_parcels!==917417||m.zz_pairs!==176553||m.zt_pairs!==2746)throw Error("PI MASTER manifest not verified");
  if(m.parts.some(p=>!/^pi-master-[0-9]{2}\.json\.gz$/.test(p.file)||!/^([a-f0-9]{64})$/.test(p.sha256)||!Number.isInteger(p.records)))throw Error("PI MASTER manifest has invalid parts");
  manifest=m;return {available:true,parcels:m.total_unique_parcels};
 }
 async function lookup(cadnum){
  if(!manifest)await init();
  if(typeof cadnum!=="string"||!/^\d{5}\.\d+\.\d+$/.test(cadnum))throw Error("Invalid cadastral identifier");
  const prefix=cadnum.slice(0,2);
  const part=manifest.parts.find(p=>p.file==="pi-master-"+prefix+".json.gz");
  if(!part)throw Error("PI MASTER missing prefix "+prefix);
  if(prefix!==lastPrefix){
   const response=await fetch(new URL(part.file,baseURL),{cache:"no-store"});
   if(!response.ok)throw Error("PI MASTER missing part "+part.file);
   const bytes=await response.arrayBuffer();
   if(await sha(bytes)!==part.sha256)throw Error("PI MASTER checksum mismatch "+part.file);
   const rows=await unzip(bytes);
   if(!Array.isArray(rows)||rows.length!==part.records)throw Error("PI MASTER count mismatch "+part.file);
   lastRows=new Map();
   for(const row of rows){
    if(!row||typeof row.cadnum!=="string"||lastRows.has(row.cadnum)||!Array.isArray(row.zz)||!Array.isArray(row.zt))throw Error("PI MASTER part malformed");
    lastRows.set(row.cadnum,row);
   }
   lastPrefix=prefix;
  }
  const row=lastRows.get(cadnum);
  if(!row)return {status:"NOT_IN_VALIDATED_CADASTRE",cadnum};
  return {status:"FOUND",profile:row};
 }
 return Object.freeze({init,lookup});
}
scope.KT77PiMasterIndex=Object.freeze({create});
})(window);
