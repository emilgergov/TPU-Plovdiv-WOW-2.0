'use strict';
// KT20.5: server-only author preparation; never exposes credentials or auto-approves AI text.
const contract=require('./v26-ai-author-contract.js');
const prompt=require('./v26-ai-author-prompt.js');
async function prepareInvisibleDraft(input,generate){
 const request=contract.prepareRequest(input);
 if(!request.ready)return {ready:false,stage:'evidence',issues:request.issues};
 if(typeof generate!=='function')return {ready:false,stage:'provider',issues:['AI услуга не е конфигурирана']};
 let draft;
 try{draft=await generate(prompt.messages(request),{dossierId:request.dossierId});}
 catch(_){return {ready:false,stage:'provider',issues:['AI услугата не върна валиден резултат']};}
 const validation=contract.validateDraft(request,draft);
 if(!validation.valid)return {ready:false,stage:'validation',issues:validation.issues};
 const editorial=contract.editorialTitleReview(request,draft);
 if(!editorial.present||!editorial.valid)return {ready:false,stage:'title',issues:editorial.issues.length?editorial.issues:['Липсва редактирано заглавие']};
 return {ready:true,stage:'expert-review',dossierId:request.dossierId,draft,requiresExpertApproval:true};
}
module.exports={prepareInvisibleDraft};
