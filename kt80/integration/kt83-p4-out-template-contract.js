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
 // Existing 22-item catalogue: 13-16 are internal tools, not outgoing documents.
 const ids=new Set([...Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0')),...Array.from({length:6},(_,i)=>String(i+17))]);
 function create({digest,verifyApproval}={}){
  const entries=new Map(),snapshots=new Map();
  let epoch=0;
  const key=(outId,variant)=>outId+'::'+variant;
  async function register({outId,variant='DEFAULT',templateId,expectedSha256,sourceDescription,bytes}={}){
   if(!ids.has(outId)||!norm(variant)||!norm(templateId)||!validHash(expectedSha256)||
      !norm(sourceDescription)||!(bytes instanceof Uint8Array)||bytes.length<1000)
    return result(false,'MISSING_APPROVED_OUT_TEMPLATE','Предложение: приложете утвърден образец за този конкретен OUT.');
   if(typeof digest!=='function'||typeof verifyApproval!=='function')
    return result(false,'INDEPENDENT_VERIFIER_REQUIRED','Предложение: свържете проверяващия механизъм на утвърдените OUT образци.');
   let actual,approved=false;
   try{
    actual=await digest(new Uint8Array(bytes));
    approved=await verifyApproval({outId,variant,templateId,expectedSha256,sourceDescription},new Uint8Array(bytes))===true;
   }catch(_){return result(false,'TEMPLATE_VERIFICATION_FAILED','Неуспешна проверка на образеца.');}
   if(actual!==expectedSha256)return result(false,'TEMPLATE_HASH_MISMATCH','Образецът не съвпада с утвърдения файл.');
   if(!approved)return result(false,'TEMPLATE_NOT_ATTESTED','Предложение: удостоверете източника и одобрението на образеца.');
   if(entries.has(key(outId,variant)))return result(false,'DUPLICATE_OUT_TEMPLATE','За този OUT вече има образец; проверете версията и сменете контролирано.');
   if([...entries.values()].some(v=>v.templateId===templateId))
    return result(false,'TEMPLATE_REUSED_FOR_DIFFERENT_OUT','Един и същ образец не може да подмени отделен OUT.');
   const stored=Object.freeze({outId,variant,templateId,expectedSha256,sourceDescription});
   entries.set(key(outId,variant),stored);snapshots.set(key(outId,variant),new Uint8Array(bytes));epoch++;
   return result(true,'REGISTERED','Одобреният образец е регистриран само за този OUT и вариант.',{outId,variant,templateId});
  }
  function select({outId,variant='DEFAULT',caseId,generation,evidenceRevision,expertConfirmed=false,normativeVerified=false}={}){
   if(!ids.has(outId))return result(false,'UNKNOWN_OUT','Предложение: уточнете вида на изходния документ.');
   if(!norm(caseId)||!Number.isInteger(generation)||!Number.isInteger(evidenceRevision)||
      expertConfirmed!==true||normativeVerified!==true)
    return result(false,'OUT_NOT_AUTHORIZED','Предложение: завършете независимата нормативна оценка и потвърдете вида OUT.');
   const template=entries.get(key(outId,variant));
   if(!template)return result(false,'OUT_TEMPLATE_MISSING','Предложение: заредете и удостоверете утвърдения образец за OUT '+outId+'.');
   return result(true,'READY_FOR_TEMPLATE_RENDER','Има определен образец за неподписан проект.',{
    outId,variant,caseId,generation,evidenceRevision,template,
    unsigned:true,formalIssuanceAllowed:false,sessionEpoch:epoch
   });
  }
  function getTemplate(selection){
   if(!selection?.ok||selection.code!=='READY_FOR_TEMPLATE_RENDER'||
      selection.sessionEpoch!==epoch||entries.get(key(selection.outId,selection.variant))!==selection.template)
    return null;
   return new Uint8Array(snapshots.get(key(selection.outId,selection.variant)));
  }
  function clear(){entries.clear();snapshots.clear();epoch++}
  const status=()=>Object.freeze({registered:entries.size,
    remaining:ids.size-new Set([...entries.values()].map(v=>v.outId)).size,
    outIds:Object.freeze([...new Set([...entries.values()].map(v=>v.outId))]),epoch});
  return Object.freeze({register,select,getTemplate,clear,status});
 }
 return Object.freeze({create,expectedOutIds:Object.freeze([...ids])});
});
