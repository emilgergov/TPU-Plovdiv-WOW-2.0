// KT134 isolated, advisory only. No legal decision, no reviewer veto.
const text=v=>String(v??"");
export function kt134DraftDiagnostics(draft,{stage,sourceTexts=[],gis=null,legalTexts=[],reviewFindings=[]}={}){
 const value=text(draft),low=value.toLocaleLowerCase("bg");
 const findings=[];
 const warn=(code,reason)=>findings.push({code,reason});
 if(value.trim().length<420)warn("SHORT_UNREASONED_DRAFT","Недостатъчна аргументация в проекта.");
 if(/TEST-(?:NOTICE|TECH|GIS|PI|PDF|MASTER)|NONREAL|синтетичен тестов казус|непотвърден физически параметър/iu.test(value))
  warn("TEST_METADATA_IN_ADMINISTRATIVE_TEXT","В документа са попаднали тестови или диагностични означения.");
 if(/(?:изходящ административен акт|категоричен процедурен извод) не се предлага/iu.test(value)
  && !/(?:предлага се (?:проект на|изготвяне на|насочване към|провеждане на)|избран панел\s*:)/iu.test(value))
  warn("MISSING_ACTIONABLE_PROPOSAL","Не се вижда конкретно следващо административно действие.");
 // Do not confuse a requested factual clarification with legal qualification:
 // an evidence gap requires a named physical fact, a cited source, and a specific legal test.
 if(/(?:не е установена достатъчно обоснована съпоставка|не са установени правните и фактическите предпоставки)/iu.test(value)
     && !/(?:който липсва в|която липсва в|съгласно приложеното|точно в документа|решаващ(?:ия|ият) (?:факт|параметър))/iu.test(value))
  warn("GENERIC_LEGAL_UNCERTAINTY","Правната неяснота е описана общо, без доказана решаваща фактическа липса.");
 if(/(?:да се уточни дали|не е ясно дали)[^.!?]{0,240}(?:дейност|оборудване|мощност|капацитет|технология)/iu.test(value)
     && !/(?:липсва в|не е посочен(?:а|о)? в|противоречи на)[^.!?]{0,180}(?:уведомлени|описани|приложени|документ)/iu.test(value))
  warn("UNPROVEN_PHYSICAL_GAP","Искане за технически факт без установено отсъствие или противоречие в конкретен документ.");
 if(stage===4){
  if(!/ИЗБРАН\s+ПАНЕЛ\s*:\s*0?\d{1,2}/iu.test(value))
   warn("NO_SELECTED_PANEL","Няма конкретно предложен панел.");
  if(!Array.isArray(sourceTexts)||!sourceTexts.length)warn("NO_DOSSIER_TEXT","Липсват текстове от преписката във входния контекст.");
  if(!gis)warn("NO_GIS_CONTEXT","Няма ГИС контекст; може да е допустимо за преписка без пространствен анализ.");
  if(!Array.isArray(legalTexts)||!legalTexts.length)warn("NO_EXACT_LAW_TEXT","Не са предоставени точните нормативни текстове.");
  if(!Array.isArray(reviewFindings)||!reviewFindings.length)warn("NO_REVIEW_GROUNDS","Рецензентът не е посочил самостоятелни мотиви.");
 }
 if(stage===5){
  if(!/относно\s*:/iu.test(low))warn("NO_SUBJECT","Липсва предмет на документа.");
  if(!/(?:ви уведомявам|изисквам|моля да|предоставете|на основание)/iu.test(low))
   warn("NO_INSTITUTIONAL_DISPOSITION","Липсва ясен административен диспозитив.");
 }
 return {stage,findings,advisoryOnly:true,reviewerMayCorrect:true,expertFinalApprovalRequired:true};
}
