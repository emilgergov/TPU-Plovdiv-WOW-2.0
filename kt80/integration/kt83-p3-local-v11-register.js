/* KT83 P3 — LOCAL V11 source import, integrity and independent attestation.
 * Pure memory only; never uploads documents or saves confidential evidence.
 * Hash equality proves file identity, NOT official legal status or current validity.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.KT83P3LocalSourceRegister=api;
})(typeof window!=='undefined'?window:null,function(){'use strict';
 const tidy=x=>String(x??'').trim();
 const validFingerprint=x=>/^[a-f0-9]{64}$/.test(tidy(x).toLowerCase());
 const asBytes=x=>x instanceof Uint8Array?new Uint8Array(x):
  ArrayBuffer.isView(x)?new Uint8Array(x.buffer.slice(x.byteOffset,x.byteOffset+x.byteLength)):
  x instanceof ArrayBuffer?new Uint8Array(x.slice(0)):null;
 const hex=a=>Array.from(a,b=>b.toString(16).padStart(2,'0')).join('');
 function create({digest,reviewOfficialSource,verifyOfficialSource}={}){
  const docs=new Map();
  const capable=typeof digest==='function'&&typeof reviewOfficialSource==='function'&&
    typeof verifyOfficialSource==='function';
  async function importDocument({bytes,id,sourceUri,articles,expectedSha256,publication,validityCheckedAt}={}){
   if(!capable)return {ok:false,code:'TRUST_PROVIDER_MISSING'};
   const data=asBytes(bytes);
   if(!data?.length||!tidy(id)||!tidy(sourceUri)||!validFingerprint(expectedSha256)||
      !tidy(publication)||!tidy(validityCheckedAt)||
      !Array.isArray(articles)||!articles.length||
      !articles.every(x=>tidy(x))||new Set(articles).size!==articles.length)
    return {ok:false,code:'SOURCE_METADATA_INCOMPLETE'};
   const fingerprint=tidy(expectedSha256).toLowerCase();
   let actual;
   try{actual=hex(await digest(data));}catch(_){return {ok:false,code:'HASH_UNAVAILABLE'};}
   if(actual!==fingerprint)return {ok:false,code:'HASH_MISMATCH'};
   // Separate official-source review is required AFTER byte-level integrity.
   const draft=Object.freeze({id:tidy(id),archiveVersion:'V11',sourceUri:tidy(sourceUri),
    fingerprint,publication:tidy(publication),validityCheckedAt:tidy(validityCheckedAt),
    articles:Object.freeze(articles.map(tidy))});
   let approved;
   try{approved=await reviewOfficialSource(draft,new Uint8Array(data));}
   catch(_){return {ok:false,code:'OFFICIAL_REVIEW_FAILED'};}
   if(approved!==true)return {ok:false,code:'OFFICIAL_REVIEW_MISSING'};
   // An attestation is not itself provenance. Require independent recheck
   // before registering and again each time the source is used.
   const record=Object.freeze({...draft,officialSourceVerified:true,currentValidityChecked:true});
   let provenance=false;
   try{provenance=verifyOfficialSource(record,new Uint8Array(data))===true;}
   catch(_){provenance=false;}
   if(!provenance)return {ok:false,code:'SOURCE_PROVENANCE_UNVERIFIED'};
   if(docs.has(record.id))return {ok:false,code:'DUPLICATE_DOCUMENT_ID'};
   docs.set(record.id,{record,bytes:data});
   return Object.freeze({ok:true,code:'IMPORTED',id:record.id,fingerprint});
  }
  function getDocument(id){return docs.get(tidy(id))?.record||null;}
  function verifyDocument(record){
   const entry=docs.get(tidy(record?.id));
   if(!entry||record!==entry.record||!capable)return false;
   try{return verifyOfficialSource(entry.record,new Uint8Array(entry.bytes))===true;}
   catch(_){return false}
  }
  function status(){return Object.freeze({version:'V11',count:docs.size,
   sourceIds:Object.freeze(Array.from(docs.keys()))});}
  function clear(){docs.clear();}
  return Object.freeze({version:'V11',available:capable,importDocument,
   getDocument,verifyDocument,status,clear});
 }
 return Object.freeze({create});
});
