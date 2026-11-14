/* KT83 / P4 — each OUT uses its OWN verified template.
 * The institutional letterhead is not a substitute for an OUT-specific form.
 * No guessed route, no generic DOCX fallback, no final act or signature.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.KT83P4TemplateContract=api;
})(typeof window!=='undefined'?window:null,function(){'use strict';
 const norm=x=>String(x??'').trim();
 const validHash=x=>/^[a-f0-9]{64}$/.test(norm(x));
 const result=(ok,code,message,extra={})=>Object.freeze({ok,code,message,...extra});
 const ids=new Set(Array.from({length:22},(_,i)=>String(i+1).padStart(2,'0')));
 function create(){
  const entries=new Map(),snapshots=new Map();
  let epoch=0;
  function register({outId,templateId,expectedSha256,sourceDescription,bytes,verified=false}={}){
   if(!ids.has(outId)||!norm(templateId)||!validHash(expectedSha256)||
      !norm(sourceDescription)||!(bytes instanceof Uint8Array)||bytes.length<1000)
    return result(false,'MISSING_APPROVED_OUT_TEMPLATE','Предложение: приложете утвърден образец за този конкретен OUT.');
   if(verified!==true)return result(false,'TEMPLATE_NOT_ATTESTED','Предложение: удостоверете източника и одобрението на образеца.');
   if(entries.has(outId))return result(false,'DUPLICATE_OUT_TEMPLATE','За този OUT вече има образец; проверете версията и сменете контролирано.');
   if([...entries.values()].some(v=>v.templateId===templateId))
    return result(false,'TEMPLATE_REUSED_FOR_DIFFERENT_OUT','Един и същ образец не може да подмени отделен OUT.');
   const stored=Object.freeze({outId,templateId,expectedSha256,sourceDescription});
   entries.set(outId,stored);snapshots.set(outId,new Uint8Array(bytes));epoch++;
   return result(true,'REGISTERED','Одобреният образец е регистриран само за този OUT.',{outId,templateId});
  }
  function select({outId,caseId,generation,evidenceRevision,expertConfirmed=false,normativeVerified=false}={}){
   if(!ids.has(outId))return result(false,'UNKNOWN_OUT','Предложение: уточнете вида на изходния документ.');
   if(!norm(caseId)||!Number.isInteger(generation)||!Number.isInteger(evidenceRevision)||
      expertConfirmed!==true||normativeVerified!==true)
    return result(false,'OUT_NOT_AUTHORIZED','Предложение: завършете независимата нормативна оценка и потвърдете вида OUT.');
   const template=entries.get(outId);
   if(!template)return result(false,'OUT_TEMPLATE_MISSING','Предложение: заредете и удостоверете утвърдения образец за OUT '+outId+'.');
   return result(true,'READY_FOR_TEMPLATE_RENDER','Има определен образец за неподписан проект.',{
    outId,caseId,generation,evidenceRevision,template,
    unsigned:true,formalIssuanceAllowed:false,sessionEpoch:epoch
   });
  }
  function getTemplate(selection){
   if(!selection?.ok||selection.code!=='READY_FOR_TEMPLATE_RENDER'||
      selection.sessionEpoch!==epoch||entries.get(selection.outId)!==selection.template)
    return null;
   return new Uint8Array(snapshots.get(selection.outId));
  }
  function clear(){entries.clear();snapshots.clear();epoch++}
  const status=()=>Object.freeze({registered:entries.size,remaining:ids.size-entries.size,
    outIds:Object.freeze([...entries.keys()]),epoch});
  return Object.freeze({register,select,getTemplate,clear,status});
 }
 return Object.freeze({create,expectedOutIds:Object.freeze([...ids])});
});
