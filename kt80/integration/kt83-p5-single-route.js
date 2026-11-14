/* KT83 P5 — one stage, one action suggestion. Pure case-bound projection.
 * No auto confirmations, routing by GIS overlaps, or UI-driven legal claims. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.KT83P5SingleRoute=api;
})(typeof window!=='undefined'?window:null,function(){'use strict';
 const legalPhases=new Set(['normative_v11','motivated_proposal','out_draft']);
 const prompt=(step,code,text,ready=false)=>Object.freeze({step,code,text,ready});
 function next({step,caseId,generation,evidenceRevision,route,confirmedSubject,
   confirmedScope,spatialGate,spatialReceipt,verifiedLaw,hasDraft}={}){
  if(!caseId||!Number.isInteger(generation)||!Number.isInteger(evidenceRevision))
   return prompt(1,'CASE_REQUIRED','Предложение: регистрирайте или отворете преписката с уникален ИД.');
  if(!route?.valid&&step>2)
   return prompt(2,'ROUTE_RESET','Предложение: прегледайте изменените доказателства и потвърдете предмета и обхвата.');
  if(step===1)return prompt(1,'INTAKE','Предложение: прочетете преписката и преминете към предмета.');
  if(step===2){
   if(!confirmedSubject||!confirmedScope)
    return prompt(2,'SUBJECT','Предложение: потвърдете предмета и обхвата.');
   if(spatialGate?.expertConfirmed!==true)
    return prompt(2,'GIS_RELEVANCE','Предложение: преценете и потвърдете относимостта на ГИС.');
   return spatialGate.decision==='REQUIRED'
    ?prompt(3,'GIS_REQUIRED','Следва удостоверяване на ГИС и PDF1 за тази преписка.',true)
    :spatialGate.decision==='NOT_REQUIRED'
     ?prompt(4,'GIS_NOT_REQUIRED','ГИС е мотивирано неприложим; продължете към независимата нормативна оценка.',true)
     :prompt(2,'GIS_GATE_INVALID','Предложение: уточнете експертното решение за ГИС.');
  }
  if(step===3){
   if(spatialGate?.decision!=='REQUIRED'||spatialGate.expertConfirmed!==true)
    return prompt(2,'GIS_GATE_STALE','Предложение: прегледайте актуалното експертно решение за ГИС.');
   return spatialReceipt?.verified===true&&spatialReceipt?.pdf1Verified===true&&
     spatialReceipt.caseId===caseId&&spatialReceipt.generation===generation&&
     spatialReceipt.evidenceRevision===evidenceRevision
     ?prompt(4,'SPATIAL_READY','ГИС и PDF1 са доказателствено удостоверени. Следва Етап 4.',true)
     :prompt(3,'SPATIAL_PENDING','Предложение: довършете ГИС, ПИ MASTER и PDF1; пространственото пресичане само по себе си не определя процедура.');
  }
  if(step===4){
   if(!route||!legalPhases.has(route.phase))
    return prompt(4,'LEGAL_NOT_STARTED','Предложение: довършете доказателствения маршрут към нормативния MASTER V11.');
   return verifiedLaw?.ok===true&&verifiedLaw.caseId===caseId&&
     verifiedLaw.generation===generation&&verifiedLaw.evidenceRevision===evidenceRevision
     ?prompt(5,'V11_READY','Нормативната преценка е удостоверена; експертът може да потвърди мотивираното предложение.',true)
     :prompt(4,'V11_PENDING','Предложение: потвърдете приложимите разпоредби, предпоставки и компетентност от единствения MASTER V11.');
  }
  if(step===5){
   if(!route?.valid||!legalPhases.has(route.phase)||verifiedLaw?.ok!==true||
      verifiedLaw.caseId!==caseId||verifiedLaw.generation!==generation||
      verifiedLaw.evidenceRevision!==evidenceRevision)
    return prompt(4,'LEGAL_STALE','Предложение: възстановете актуалната независима нормативна преценка.');
   return hasDraft
    ?prompt(5,'OUT_DRAFT','Неподписаният OUT проект е готов за експертен преглед.')
    :prompt(5,'OUT_PREPARE','Предложение: конструирайте мотивиран OUT върху единната бланка на РИОСВ – Пловдив.');
  }
  return prompt(1,'UNKNOWN_STAGE','Предложение: отворете актуалния етап на преписката.');
 }
 return Object.freeze({next});
});
