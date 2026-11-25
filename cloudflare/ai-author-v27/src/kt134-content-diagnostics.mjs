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
