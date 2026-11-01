/* V27.1 P7 — evidence-enriched AI author payload. Deterministic and fail-closed. */
(function(root){'use strict';
const txt=(v,n=3000)=>String(v==null?'':v).trim().slice(0,n);
function build({legacyPayload,results,roles,normativeRegister,evidence,confirmedSubject}={}){
 if(legacyPayload?.mode!=='expert'||!legacyPayload.facts)throw Error('Missing expert author payload');
 if(!confirmedSubject||!txt(confirmedSubject))throw Error('Expert subject not confirmed');
 const spatial=root.V27VerifiedContext.gis(results,roles);
 if(!spatial.allVerified)throw Error('GIS requires expert review; AI legal conclusions blocked');
 const law=root.V27VerifiedContext.legal(normativeRegister);
 const grounded=Array.isArray(evidence?.facts)?evidence.facts.filter(f=>f.status==='source_matched'):[];
 const facts={...legacyPayload.facts,subject:txt(confirmedSubject,1200),gisFindings:spatial.parcels.map(p=>p.id+': '+(p.classification==='intersects'?'пресича '+p.zones.join(', '):'потвърдено извън защитени зони')).join('; ').slice(0,3000),legalReferences:law.sources.map(s=>s.title+' — '+(s.verification==='article_verified'?'проверен текст на разпоредба':'само каталожна справка')).join('; ').slice(0,2800),evidenceNotes:'Проверените документални факти са с източници; непроверените твърдения не са доказателства. Сценарий '+spatial.scenario+'. Експертната проверка остава задължителна.',dossierExcerpts:grounded.slice(0,25).map(f=>({file:txt(f.file,180),excerpt:txt(f.quote||f.value,1400)})),legalSources:law.sources.slice(0,12).map(s=>({id:s.id,title:s.title,source:s.source,verification:s.verification,version:s.version,provisionText:s.provisionText})),verifiedContext:{scenario:spatial.scenario,parcels:spatial.parcels.map(p=>({id:p.id,role:p.role,classification:p.classification,zones:p.zones})),documentFacts:grounded.slice(0,30).map(f=>({id:f.id,kind:f.kind,value:txt(f.value,500),file:f.file,page:f.page})),legalVerification:law.sources.map(s=>({id:s.id,status:s.verification}))}};
 return {mode:'expert',facts,reviewRequired:true};
}
root.V27ExpertEvidence=Object.freeze({build});
})(typeof window!=='undefined'?window:globalThis);
