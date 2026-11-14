/* KT83 P4: route accepted legal proposal to ONE independently registered
 * OUT template and document-specific renderer. Never use common blank as a
 * fallback, and never issue an administrative act.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.KT83P4Dispatcher=api;
})(typeof window!=='undefined'?window:null,function(){'use strict';
 const str=x=>String(x??'').trim();
 const same=(a,b)=>!!a&&!!b&&a.caseId===b.caseId&&
  a.generation===b.generation&&a.evidenceRevision===b.evidenceRevision&&
  a.confirmedSubject===b.confirmedSubject;
 const error=(code,message)=>Object.freeze({ok:false,code,message});
 function create({templates,currentCase,renderers,legalReceipt}={}){
  if(!templates?.select||!templates?.getTemplate||typeof currentCase!=='function'||
    !renderers||typeof legalReceipt!=='function')throw new Error('Липсва защитен вход за П4.');
  let serial=0;
  const invalidate=()=>{serial++};
  async function prepare({outId,expertChoice,documentData}={}){
   const generation=serial,caseNow=currentCase();
   if(!caseNow?.caseId||!Number.isInteger(caseNow?.generation)||
      !Number.isInteger(caseNow?.evidenceRevision)||!str(caseNow.confirmedSubject))
    return error('CASE_UNCONFIRMED','Няма актуален потвърден предмет и преписка.');
   // An OUT choice is made AFTER legal review, never from case type or GIS.
   if(expertChoice?.outId!==outId||expertChoice?.expertConfirmed!==true||
      expertChoice.caseId!==caseNow.caseId||
      expertChoice.generation!==caseNow.generation||
      expertChoice.evidenceRevision!==caseNow.evidenceRevision)
    return error('OUT_CHOICE_UNCONFIRMED','Не е потвърден конкретният вид изходен документ.');
   const law=legalReceipt();
   if(law?.verified!==true||law.caseId!==caseNow.caseId||
      law.generation!==caseNow.generation||law.evidenceRevision!==caseNow.evidenceRevision||
      !str(law.reasonedAssessment))
    return error('LEGAL_PROOF_MISSING','Не е удостоверена независимата нормативна преценка V11.');
   const choice=templates.select({outId,caseId:caseNow.caseId,generation:caseNow.generation,
    evidenceRevision:caseNow.evidenceRevision,expertConfirmed:true,normativeVerified:true});
   if(!choice.ok)return choice;
   const renderer=renderers[outId];
   if(typeof renderer!=='function')
    return error('OUT_RENDERER_MISSING','Няма проверен генератор за съдържанието на този OUT образец.');
   const bytes=templates.getTemplate(choice);
   if(!bytes)return error('TEMPLATE_STALE','Образецът е изменен или не е наличен.');
   let rendered;
   try{
    rendered=await renderer({templateBytes:bytes,template:choice.template,
      caseRecord:Object.freeze({...caseNow}),documentData,lawReceipt:law});
   }catch(_){return error('OUT_RENDER_FAILED','Неуспешно генериране по утвърдения образец.');}
   if(serial!==generation||!same(currentCase(),caseNow)||
      legalReceipt()!==law||templates.getTemplate(choice)===null)
    return error('OUT_STALE','Преписката, нормативната преценка или образецът се промениха.');
   if(!(rendered?.bytes instanceof Uint8Array)||!rendered.bytes.length||
      rendered.formalIssuanceAllowed!==false||rendered.signed!==false)
    return error('OUT_UNSAFE_RESULT','Резултатът не е удостоверен неподписан работен документ.');
   return Object.freeze({ok:true,status:'EXPERT_REVIEW_ONLY',outId,
    caseId:caseNow.caseId,generation:caseNow.generation,
    evidenceRevision:caseNow.evidenceRevision,templateId:choice.template.templateId,
    mediaType:rendered.mediaType,bytes:new Uint8Array(rendered.bytes),
    formalIssuanceAllowed:false,signed:false});
  }
  return Object.freeze({prepare,invalidate});
 }
 return Object.freeze({create});
});
