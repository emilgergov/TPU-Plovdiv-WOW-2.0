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
module.exports={prepareWordPayload};
