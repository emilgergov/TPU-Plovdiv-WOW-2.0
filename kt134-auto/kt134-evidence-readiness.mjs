/**
 * KT134 independent evidence readiness — cannot be inferred from an author narrative.
 * Read-only, no new infrastructure. A provider receipt is not a substitute for
 * genuine GIS/legal evidence: both source identity and verified evidence are required.
 */
const str=x=>String(x??'').trim();
function accepted(result,type,caseId){
 if(!result||result.verified!==true||str(result.caseId)!==str(caseId))return false;
 const evidence=Array.isArray(result.evidence)?result.evidence:[];
 if(!evidence.length)return false;
 return evidence.some(e=>e?.verification==='verified'&&
   str(e.sourceId)&&str(e.sourceLocation)&&e.sourceType===type);
}
export function assessKT134EvidenceReadiness({caseId,spatial,normative}={}){
 const spatialVerified=accepted(spatial,'gis',caseId);
 const normativeVerified=accepted(normative,'legal',caseId);
 const missing=[];
 if(!spatialVerified)missing.push('Липсва независим проверен ГИС резултат за конкретната преписка');
 if(!normativeVerified)missing.push('Липсва независим проверен нормативен резултат за конкретната преписка');
 return Object.freeze({
  caseId:str(caseId),
  spatialVerified,normativeVerified,
  proceduralConclusionVerified:spatialVerified&&normativeVerified,
  proposalStatus:spatialVerified&&normativeVerified?'verification_ready':'provisional_unverified',
  missing:Object.freeze(missing)
 });
}
