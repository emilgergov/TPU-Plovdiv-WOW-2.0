/* V27.1 P3 — deterministic local consolidation of dossier batches.
   Does not infer facts or make AI calls; preserves document-level provenance. */
(function(root){'use strict';
function consolidate(prepared,requests){
 if(prepared?.schema!=='V27_DOSSIER_BATCHES_V1'||!Array.isArray(prepared.manifest)||!Array.isArray(prepared.batches))throw Error('Invalid dossier batches');
 if(!Array.isArray(requests))throw Error('Missing batch request plan');
 const expected=prepared.batches;
 const seen=new Set(),received=[];
 for(const group of requests){
  if(!Array.isArray(group))throw Error('Invalid batch group');
  for(const item of group){
   if(!item||!Number.isInteger(item.documentIndex)||!Number.isInteger(item.part))throw Error('Missing batch provenance');
   const key=item.documentIndex+':'+item.part;
   if(seen.has(key))throw Error('Duplicate dossier chunk: '+key);
   seen.add(key);received.push(item);
  }
 }
 if(received.length!==expected.length)throw Error('Missing dossier chunks');
 const byKey=new Map(expected.map(x=>[x.documentIndex+':'+x.part,x]));
 for(const item of received){
  const original=byKey.get(item.documentIndex+':'+item.part);
  if(!original||original.file!==item.file||original.start!==item.start||original.end!==item.end||original.text!==item.text)throw Error('Dossier chunk mismatch');
 }
 const documents=[];
 for(const entry of prepared.manifest){
  const parts=expected.filter(x=>x.documentIndex===entry.documentIndex).sort((a,b)=>a.part-b.part);
  if(entry.status!=='prepared'){
   if(parts.length)throw Error('Omitted document has chunks');
   documents.push({documentIndex:entry.documentIndex,file:entry.file,status:entry.status,reason:entry.reason||'',text:null});continue;
  }
  if(parts.length!==entry.chunks)throw Error('Incomplete document chunks');
  let cursor=0;
  for(let j=0;j<parts.length;j++){
   const p=parts[j];
   if(p.part!==j+1||p.start!==cursor||p.end!==p.start+p.text.length)throw Error('Discontinuous dossier text');
   cursor=p.end;
  }
  if(cursor!==entry.characters)throw Error('Incomplete document text');
  documents.push({documentIndex:entry.documentIndex,file:entry.file,status:'prepared',text:parts.map(p=>p.text).join('')});
 }
 const complete=prepared.complete&&documents.every(d=>d.status==='prepared');
 return Object.freeze({schema:'V27_DOSSIER_CONSOLIDATED_V1',documents,complete,reviewRequired:true,omitted:documents.filter(d=>d.status!=='prepared').map(d=>({documentIndex:d.documentIndex,file:d.file,reason:d.reason,status:d.status}))});
}
root.V27DossierConsolidation=Object.freeze({consolidate});
})(typeof window!=='undefined'?window:globalThis);
