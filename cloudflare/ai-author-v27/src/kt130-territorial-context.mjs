import {documents as BG0001493} from './territorial-archive/BG0001493.mjs';
// Data coverage is explicit. New archived zones can be added without route logic.
const catalog=new Map([['BG0001493',BG0001493]]),cache=new Map();
export async function territorialContext(codes){
 const sources=[],missing=[];
 for(const code of [...new Set(codes)].slice(0,12)){
  const docs=catalog.get(code);
  if(!docs){missing.push({code,reason:'Няма включен първичен териториален източник в този сървърен архив.'});continue;}
  for(const doc of docs){
   let full=cache.get(doc.textSHA256);
   if(!full){
    const bytes=Uint8Array.from(atob(doc.gzipBase64),c=>c.charCodeAt(0));
    const plain=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',plain)),x=>x.toString(16).padStart(2,'0')).join('');
    if(sha!==doc.textSHA256)throw Error('TERRITORIAL_SOURCE_INTEGRITY_ERROR');
    full=new TextDecoder().decode(plain);cache.set(doc.textSHA256,full);
   }
   const {gzipBase64,...metadata}=doc;
   let passages=[{offset:0,text:full}],selectionLimited=false;
   if(doc.id==='objectives'){
    // Include overview and balanced passages related to infrastructure/construction.
    // This is retrieval, not proof that a habitat/species occurs at the property.
    passages=[{offset:0,text:full.slice(0,5000)}];let remaining=13000;
    for(const m of full.matchAll(/строителств|урбаниз|отпадъчн|канализац|електро|Dicranum viride|Hamatocaulis vernicosus/giu)){
     const start=Math.max(0,m.index-300),end=Math.min(full.length,m.index+1200);
     if(remaining<=0)break;
     if(passages.some(p=>start<p.offset+p.text.length&&end>p.offset))continue;
     const text=full.slice(start,Math.min(end,start+remaining));remaining-=text.length;
     passages.push({offset:start,text});
    }
    selectionLimited=true;
   }
   sources.push({...metadata,passages,selectionLimited,sourceIntegrityVerified:true,
    applicabilityVerified:false,currentVersionCertified:false});
  }
 }
 return {sources,missing,coverage:'Само кодовете от проверените пространствени пресичания. Източникът не удостоверява допустимост или липса на въздействие.'};
}
