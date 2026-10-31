'use strict';
const contract=require('./v26-ai-author-contract.js');
function prepareWordPayload(request,draft,approval){
 const check=contract.validateDraft(request,draft);
 if(!check.valid)return {ready:false,issues:check.issues};
 if(!approval||approval.approved!==true||approval.dossierId!==request.dossierId||!String(approval.reviewer||'').trim())return {ready:false,issues:['Explicit expert approval required']};
 if(!draft.editorialTitle||!contract.editorialTitleReview(request,draft).valid)return {ready:false,issues:['Verified subject and heading required']};
 return {ready:true,schema:'KT19_7_WORD_PAYLOAD_V1',dossierId:request.dossierId,
  subject:draft.editorialTitle.subject,heading:draft.editorialTitle.heading,
  classical:{...draft.classical},expert:{text:draft.expert.text},
  claims:draft.claims,approvedBy:approval.reviewer.trim()};
}
function mapToWordSlots(payload){
 if(!payload||payload.ready!==true||payload.schema!=='KT19_7_WORD_PAYLOAD_V1')throw Error('Unapproved Word payload');
 const common=Object.freeze({subject:payload.subject,heading:payload.heading,dossierId:payload.dossierId});
 return Object.freeze({
  classical:Object.freeze({...common,characteristic:Object.freeze({
   construction:payload.classical.construction,electricity:payload.classical.electricity,
   water_supply:payload.classical.water_supply,wastewater:payload.classical.wastewater
  }),templatePolicy:'PRESERVE_ORIGINAL_A_B'}),
  expert:Object.freeze({...common,reasonedText:payload.expert.text,overviewMapPolicy:'USE_CONFIRMED_GIS_MAP_ONLY'}),
  review:Object.freeze({approvedBy:payload.approvedBy,claims:payload.claims})
 });
}
module.exports={prepareWordPayload,mapToWordSlots};
