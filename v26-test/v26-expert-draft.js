/* KT13.2: one immutable, verified expert-draft model for both Word renderers.
   This module does not create administrative conclusions from missing evidence. */
(function(root){'use strict';
const clean=x=>String(x==null?'':x).trim();
const freezeList=xs=>Object.freeze(xs.map(x=>Object.freeze(x)));
function build({results,roles,determination,metadata,paragraphs,evidence}){
 if(!Array.isArray(results)||!results.length)throw Error('КТ13: липсват имоти от ГИС анализа.');
 if(!['А','Б','A','B'].includes(determination?.scenario))throw Error('КТ13: липсва доказан ГИС сценарий.');
 const scenario=determination.scenario==='A'?'А':determination.scenario==='B'?'Б':determination.scenario;
 const parcels=results.map(r=>{
  const id=clean(r.input||r.cadnum);
  if(!/^\d{5}\.\d+\.\d+$/.test(id))throw Error('КТ13: непотвърден идентификатор: '+id);
  const role=roles?.[id];
  if(!['leading','ancillary'].includes(role))throw Error('КТ13: непотвърдена роля: '+id);
  return {id,role};
 });
 if(!parcels.some(p=>p.role==='leading'))throw Error('КТ13: няма потвърден водещ имот.');
 const characterization=Array.isArray(paragraphs)?paragraphs.map(clean):[];
 if(characterization.length!==4||characterization.some(x=>!x))throw Error('КТ13: липсват четирите експертно потвърдени описания.');
 const data=Object.fromEntries(Object.entries(metadata||{}).map(([k,v])=>[k,Array.isArray(v)?Object.freeze(v.map(clean)):clean(v)]));
 if(data.parcelIds&&data.parcelIds!==parcels.map(p=>p.id).join(', '))throw Error('КТ13: несъответствие между Word и ГИС идентификаторите.');
 const zones=Object.freeze((determination.zones||[]).map(z=>clean(typeof z==='string'?z:z?.code||z?.sitecode||z?.zone_code)).filter(Boolean));
 if(scenario==='Б'&&!zones.length)throw Error('КТ13: сценарий Б без посочена защитена зона.');
 return Object.freeze({
  schema:'KT13_EXPERT_DRAFT_V1',scenario,parcels:freezeList(parcels),
  zones,metadata:Object.freeze(data),characterization:Object.freeze(characterization),
  evidence:Object.freeze({findingsCount:(evidence?.findings||[]).length,warningsCount:(evidence?.warnings||[]).length}),
  reviewRequired:true
 });
}
root.V26ExpertDraft=Object.freeze({build});
})(typeof window!=='undefined'?window:globalThis);
