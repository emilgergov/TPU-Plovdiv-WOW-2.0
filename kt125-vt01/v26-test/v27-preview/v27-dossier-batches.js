/* V27.1 P3: loss-aware batching of locally extracted dossier text. No network calls. */
(function(root){'use strict';
const tidy=x=>String(x==null?'':x);
function prepare(preview,{chunkChars=5000,maxTotalChars=400000}={}){
 if(!Number.isInteger(chunkChars)||chunkChars<1000||chunkChars>16000)throw Error('Invalid chunkChars');
 const source=Array.isArray(preview?.files)?preview.files:[];
 const batches=[],manifest=[];let total=0;
 for(let i=0;i<source.length;i++){
  const f=source[i],file=tidy(f.path||f.file||'Документ '+(i+1)).slice(0,220),content=typeof f.text==='string'?f.text:'';
  const error=tidy(f.error||'');
  if(error||!content.trim()){manifest.push({file,documentIndex:i,status:'unreadable',reason:error||'Няма извлекаем текст',characters:0,chunks:0});continue;}
  if(total+content.length>maxTotalChars){manifest.push({file,documentIndex:i,status:'over_budget',reason:'Лимит на общия текст; необходимо е отделно обработване',characters:content.length,chunks:0});continue;}
  total+=content.length;
  let chunks=0;
  for(let pos=0;pos<content.length;pos+=chunkChars){
   batches.push({file,documentIndex:i,part:++chunks,start:pos,end:Math.min(pos+chunkChars,content.length),text:content.slice(pos,pos+chunkChars)});
  }
  manifest.push({file,documentIndex:i,status:'prepared',characters:content.length,chunks});
 }
 const omitted=manifest.filter(x=>x.status!=='prepared');
 return Object.freeze({schema:'V27_DOSSIER_BATCHES_V1',manifest,batches,complete:omitted.length===0,omittedCount:omitted.length,sourceCount:source.length});
}
function toRequests(prepared,{maxRequestChars=22000}={}){
 if(prepared?.schema!=='V27_DOSSIER_BATCHES_V1')throw Error('Invalid dossier batch schema');
 if(!Number.isInteger(maxRequestChars)||maxRequestChars<6000)throw Error('Invalid request budget');
 const requests=[];let current=[],used=0;
 for(const batch of prepared.batches){
  const cost=JSON.stringify(batch).length+2;
  if(cost>maxRequestChars)throw Error('Single document chunk exceeds request budget');
  if(used+cost>maxRequestChars&&current.length){requests.push(current);current=[];used=0;}
  current.push(batch);used+=cost;
 }
 if(current.length)requests.push(current);
 return {requests,manifest:prepared.manifest,complete:prepared.complete};
}
root.V27DossierBatches=Object.freeze({prepare,toRequests});
})(typeof window!=='undefined'?window:globalThis);
