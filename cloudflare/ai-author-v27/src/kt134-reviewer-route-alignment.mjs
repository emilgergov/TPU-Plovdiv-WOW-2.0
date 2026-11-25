import {KT109_ROUTE_BY_ID} from "./kt109-route-catalog.mjs";
/**
 * KT134 — deterministic evidence consistency check, NOT a route chooser.
 * The independent reviewer alone selects a route after seeing these findings.
 */
export function kt134ReviewerRouteIssues({panelId,qualification=null,
 qualificationValidated=false,procedureEvidence=[],caseDocuments=[]}={}){
 const errors=[];
 const id=Number(panelId);
 const tests=qualificationValidated&&Array.isArray(qualification?.tests)?
  Object.fromEntries(qualification.tests.map(x=>[x.key,x.status])):{};
 const proven=qualificationValidated===true;
 const records=Array.isArray(procedureEvidence)?procedureEvidence:[];
 const verified=name=>records.some(x=>x?.verified===true&&x?.kind===name&&x?.sourceId);
 if(!KT109_ROUTE_BY_ID.has(id))return ["KT134_UNKNOWN_REVIEWER_PANEL"];
 if(id===1&&!(proven&&tests.A1==="ОТРИЦАТЕЛНА"&&tests.A2==="ОТРИЦАТЕЛНА"&&
  tests.OS1==="ОТРИЦАТЕЛНА"&&tests.OS2==="ПОЛОЖИТЕЛНА"))
  errors.push("KT134_PANEL_01_LACKS_QUALIFIED_OS_ART2_FACTS");
 if(id===2){
  const gap=qualification?.missingFact;
  if(!proven||!gap?.fact||!gap?.source||!gap?.legalCriterion)
   errors.push("KT134_PANEL_02_NEEDS_CONCRETE_SOURCED_PHYSICAL_FACT");
 }
 if(id===4&&!(proven&&(tests.A1==="ПОЛОЖИТЕЛНА"||tests.A2==="ПОЛОЖИТЕЛНА")))
  errors.push("KT134_PANEL_04_EIA_APPLICABILITY_NOT_PROVEN");
 if(id===5&&!(proven&&(tests.OS1==="ПОЛОЖИТЕЛНА"||tests.OS2==="ПОЛОЖИТЕЛНА")))
  errors.push("KT134_PANEL_05_OS_APPLICABILITY_NOT_PROVEN");
 if(id===6&&!verified("os_screening_complete"))
  errors.push("KT134_PANEL_06_OS_PROCEDURE_NOT_COMPLETED");
 if(id===7&&!(proven&&(tests.A1==="ПОЛОЖИТЕЛНА"||tests.A2==="ПОЛОЖИТЕЛНА")&&
  verified("eia_screening_complete")))
  errors.push("KT134_PANEL_07_EIA_PROCEDURE_NOT_COMPLETED");
 if(id===8&&!verified("eia_full_procedure_complete"))
  errors.push("KT134_PANEL_08_FULL_EIA_NOT_COMPLETED");
 if(id===9&&!(verified("active_procedure")&&verified("termination_legal_basis")))
  errors.push("KT134_PANEL_09_NO_ACTIVE_PROCEDURE_AND_TERMINATION_BASIS");
 if(id===11&&!verified("sea_screening_complete"))
  errors.push("KT134_PANEL_11_SEA_SCREENING_NOT_COMPLETED");
 if(id===12&&!verified("sea_full_procedure_complete"))
  errors.push("KT134_PANEL_12_SEA_PROCEDURE_NOT_COMPLETED");
 if(id===17&&!Array.isArray(caseDocuments))errors.push("KT134_PANEL_17_CASE_DOCUMENTS_UNKNOWN");
 return errors;
}
export function kt134ReviewerActionMatch({panelId,documentTitle,action,legalReadiness}={}){
 const id=Number(panelId),txt=String(action||"").toLocaleLowerCase("bg");
 if(!KT109_ROUTE_BY_ID.has(id)||!txt.trim())return false;
 const title=KT109_ROUTE_BY_ID.get(id).title;
 if(documentTitle&&String(documentTitle).trim()!==title)return false;
 const patterns={
  1:/писмо|уведомяван/iu,2:/писмо|допълнителна\s+информация|уточняван/iu,
  3:/становище|институци/iu,4:/писмо|указания|овоc|овос/iu,
  5:/писмо|указания|ос|съвместимост/iu,6:/решение/iu,7:/решение/iu,
  8:/решение/iu,9:/прекратяван/iu,10:/писмо|ео/iu,11:/решение/iu,
  12:/становище/iu,13:/експертна\s+справка/iu,14:/проверка\s+на\s+преписк/iu,
  15:/справка|гис|имот/iu,16:/архив/iu,17:/отговор|жалба/iu,
  18:/отговор|сигнал/iu,19:/възражени|произнасян/iu,
  20:/препращан/iu,21:/уведомяван|резултат/iu,22:/предложени|произнасян/iu
 };
 if(!patterns[id]?.test(txt))return false;
 if(legalReadiness?.length&&[1,4,5,6,7,8,9,11,12].includes(id))return false;
 return true;
}
