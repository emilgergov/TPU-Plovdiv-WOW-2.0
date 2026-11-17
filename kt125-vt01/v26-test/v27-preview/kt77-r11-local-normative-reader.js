/* KT77 R11: read only the user's OWN versioned normative archive.
   No outside-site fetches during dossier use. SHA-256 check before returning bytes.
   Records are reference material, not automatic legal conclusions.
*/
(function(scope){
"use strict";
const BASE=new URL("normative/offline/",document.baseURI);
let active=null;
function cleanId(id){return typeof id==="string"&&/^(C\d{3}|R-[A-Za-z0-9_-]{1,20})$/.test(id)?id:null;}
function allowedPath(path){return typeof path==="string"&&/^normative\/offline\/assets\/[0-9a-f]{24}\.(?:pdf|txt)$/.test(path);}
async function digest(bytes){
 if(!scope.crypto?.subtle)throw Error("SHA-256 capability not available");
 const hash=await scope.crypto.subtle.digest("SHA-256",bytes);
 return Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,"0")).join("");
}
async function initialize(){
 const response=await fetch(new URL("archive-manifest.json",BASE),{cache:"no-store"});
 if(!response.ok)throw Error("Internal normative archive missing: HTTP "+response.status);
 const manifest=await response.json();
 if(manifest.schema!=="kt77-r11-local-normative-archive-v1"||!Array.isArray(manifest.sources)||
   manifest.total_registry_entries!==manifest.sources.length||
   manifest.archived_entries+manifest.missing_entries!==manifest.sources.length||
   manifest.rules?.all_dossier_reads_local_only!==true||
   manifest.rules?.generator_integration_approved!==false)
   throw Error("Internal normative manifest invalid or unsafe");
 const byId=new Map();
 for(const r of manifest.sources){
  if(!cleanId(r.id)||byId.has(r.id))throw Error("Normative archive duplicate/invalid ID");
  if(r.archived&&(!allowedPath(r.local_path)||!/^([a-f0-9]{64})$/.test(r.sha256)))throw Error("Invalid local file manifest entry");
  if(!r.archived&&!r.error)throw Error("Missing archive record without explanation");
  byId.set(r.id,Object.freeze({...r}));
 }
 const result=Object.freeze({manifest:Object.freeze(manifest),byId});
 active=result;
 return {ready:true,total:manifest.sources.length,archived:manifest.archived_entries,missing:manifest.missing_entries,complete:manifest.complete};
}
async function get(id){
 if(!active)await initialize();
 const rec=active.byId.get(cleanId(id));
 if(!rec)throw Error("No such normative record");
 return rec;
}
async function readBytes(id){
 const entry=await get(id);
 if(!entry.archived)throw Error("No local copy for "+id+": "+entry.error);
 const root=new URL("../../",BASE);
 const url=new URL(entry.local_path,root);
 if(url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname+"assets/"))throw Error("Normative source path escaped its archive");
 const response=await fetch(url,{cache:"no-store"});
 if(!response.ok)throw Error("Local normative copy missing: "+id);
 const bytes=await response.arrayBuffer();
 if(await digest(bytes)!==entry.sha256)throw Error("Normative archive checksum mismatch: "+id);
 return Object.freeze({id,kind:entry.kind,bytes,mime:entry.kind==="pdf"?"application/pdf":"text/plain;charset=utf-8",source_revision_verified:false});
}
function list(){
 if(!active)return [];
 return Array.from(active.byId.values(),r=>({id:r.id,title:r.title,archived:r.archived,kind:r.kind||null,error:r.error||null}));
}
scope.KT77LocalNormativeArchive=Object.freeze({initialize,get,readBytes,list});
})(window);