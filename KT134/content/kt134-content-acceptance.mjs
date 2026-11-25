// KT134 — isolated non-production content acceptance checks.
// This module never decides legal applicability and never vetoes a reviewer.
// It returns actionable issues for the author/reviewer rewrite cycle.
export function inspectProposal(draft,context={}){
  const s=String(draft||"");
  const issues=[];
  const add=(code,message)=>issues.push({code,message});
  if(s.trim().length<450)add("THIN_DRAFT","Изходът не съдържа достатъчно конкретно мотивирано съдържание.");
  for(const marker of ["предмет","обхват","местоположение","гис","правн","предлага"]){
    if(!s.toLocaleLowerCase("bg-BG").includes(marker))add("MISSING_"+marker.toUpperCase(),"Липсва необходим аналитичен елемент: "+marker);
  }
  if(/TEST-(?:NOTICE|TECH|GIS|PI|PDF|MASTER)|NONREAL|синтетичен тестов казус|непотвърден физически параметър/iu.test(s))
    add("TEST_METADATA_LEAK","Тестови идентификатори или диагностични етикети са попаднали в административния текст.");
  if(/(?:изходящ административен акт|категоричен процедурен извод) не се предлага/iu.test(s)
       && !/предлага се (?:проект на|изготвяне на|насочване към|провеждане на)/iu.test(s))
    add("NO_CONCRETE_NEXT_ACTION","Няма конкретно предложено последващо действие.");
  if(!Array.isArray(context.sourceDocuments)||context.sourceDocuments.length===0)
    add("DOSSIER_PROVENANCE_MISSING","Не е подаден проверим списък на документите по преписката.");
  if(!context.gisEvidence || !context.gisEvidence.sourceId)
    add("GIS_PROVENANCE_MISSING","ГИС изводът няма проверим източник.");
  if(!Array.isArray(context.legalTests)||context.legalTests.length===0)
    add("LEGAL_TESTS_MISSING","Не е подадена структурирана проверка на приложимите правни хипотези.");
  else for(const test of context.legalTests){
    if(!test.name || !test.status || !test.reason)
      add("UNREASONED_LEGAL_TEST","Правна хипотеза няма индивидуален мотив и статус.");
  }
  if(context.reviewer && (!context.reviewer.corrections || !context.reviewer.recommendation))
    add("REVIEWER_NO_CORRECTIVE_PROPOSAL","Рецензентът трябва да даде коригиран текст и предложение, не само критика.");
  return {acceptable:issues.length===0,issues, reviewerMayProceed:true,
    instruction:"Коригирай установените проблеми и предложи конкретно следващо действие. Рецензентът не блокира маршрута. Експертът одобрява единствено окончателното решение."};
}
