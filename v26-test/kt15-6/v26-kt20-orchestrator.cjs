'use strict';
// KT20: orchestration contract; renderers must return genuine PDF/DOCX bytes.
const author=require('./v26-ai-author-contract.js');
const word=require('./v26-word-author-approval.cjs');
const zip=require('./v26-final-package.cjs');
async function assemble(input,aiDraft,approval,renderers){
 const request=author.prepareRequest(input);
 if(!request.ready)return {ready:false,stage:'evidence',issues:request.issues};
 const approved=word.prepareWordPayload(request,aiDraft,approval);
 if(!approved.ready)return {ready:false,stage:'approval',issues:approved.issues};
 const slots=word.mapToWordSlots(approved);
 const required=['gisPdf','normativePdf','classicDocx','expertDocx'];
 if(!renderers||required.some(name=>typeof renderers[name]!=='function'))return {ready:false,stage:'renderers',issues:['Four document renderers required']};
 const rendered={
  'GIS_Analysis.pdf':await renderers.gisPdf(request),
  'Normative_References.pdf':await renderers.normativePdf(request),
  'Classic_Draft.docx':await renderers.classicDocx(slots.classical),
  'Expert_Draft.docx':await renderers.expertDocx(slots.expert)
 };
 const bytes=zip.buildPackage(approved,rendered);
 return {ready:true,schema:'KT20_ASSEMBLED_PACKAGE_V1',bytes,files:[...zip.REQUIRED,'README.txt'],dossierId:approved.dossierId};
}
module.exports={assemble};
