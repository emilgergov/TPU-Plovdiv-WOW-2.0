/**
 * KT134 — evidence-to-procedure bridge.
 * It never establishes applicability, picks a panel, or blocks the reviewer.
 * It expresses what a proposed act may and may NOT claim from the confirmed
 * four-part qualification and from documented procedural completion.
 */
const statuses=new Set(["ПОЛОЖИТЕЛНА","ОТРИЦАТЕЛНА","НЕОПРЕДЕЛЕНА"]);
const keys=["A1","A2","OS1","OS2"];
const formalActs=new Set([6,7,8,9,11,12]);
export function deriveKt134LegalDisposition({
  qualification=null,qualificationValidated=false,reviewerPanelId=null,
  procedureCompleted=false
}={}){
 const checked=qualificationValidated===true&&Array.isArray(qualification?.tests)&&
  keys.every(k=>qualification.tests.some(t=>t.key===k&&statuses.has(t.status)));
 const rows=checked?Object.fromEntries(keys.map(k=>{
  const t=qualification.tests.find(x=>x.key===k);
  return [k,{status:t.status,criterion:String(t.criterion||""),reason:String(t.reason||""),
   legalReference:String(t.legalReference||""),caseSource:String(t.caseSource||"")}];
 })):{};
 const annexPositive=checked&&["A1","A2"].some(k=>rows[k].status==="ПОЛОЖИТЕЛНА");
 const annexNegative=checked&&["A1","A2"].every(k=>rows[k].status==="ОТРИЦАТЕЛНА");
 const proposedPanel=Number(reviewerPanelId)||null;
 const formalAct=formalActs.has(proposedPanel);
 const physicalGap=checked&&qualification.missingFact?.fact&&qualification.missingFact?.source&&
  qualification.missingFact?.legalCriterion?{
    fact:String(qualification.missingFact.fact),
    source:String(qualification.missingFact.source),
    legalCriterion:String(qualification.missingFact.legalCriterion)
  }:null;
 const formalDecisionReady=Boolean(formalAct&&procedureCompleted===true&&checked&&
  (proposedPanel!==7||annexPositive));
 let recommendation;
 if(formalAct&&!formalDecisionReady)
  recommendation="Посоченият панел за решение е непотвърдена работна възможност, НЕ готов административен акт. Рецензентът трябва да предложи конкретно допустимо предходно действие въз основа на установените факти.";
 else if(!checked)
  recommendation="Четирите нормативни предпоставки все още нямат пълна доказателствено потвърдена квалификация. Изготви конкретно мотивирано предложение за следващо действие, без положителен или отрицателен окончателен процедурен извод.";
 else if(annexPositive)
  recommendation="Налице е източниково проверена положителна квалификация по поне едно приложение; все още провери всички процедурни действия преди проект на решение.";
 else if(annexNegative)
  recommendation="Отрицателните изводи за приложенията не доказват сами по себе си неприложимост на ОС; разгледай самостоятелно двете алинеи на чл. 2.";
 else recommendation="При неопределени категории не избирай нито процедура по чл. 93, нито категорична неприложимост само от липсващи данни.";
 return Object.freeze({
  qualificationValidated:checked,
  rows,annexPositive,annexNegative,proposedPanel,
  formalAct,procedureCompleted:procedureCompleted===true,
  formalDecisionReady,
  physicalGap,
  recommendedNextStep:recommendation,
  legalApplicabilityCertified:false,
  expertFinalDecisionRequired:true
 });
}
export function kt134DispositionTextIssues(text,disposition){
 const body=String(text||"");
 const errors=[];
 const claimsFormal93=/(?:да\s+се\s+издад[еа]|предлага\s+се\s+издаване|следва\s+издаване)[^.!?\n]{0,120}(?:решение\s+по\s+чл\.?\s*93|решение\s+за\s+преценяване\s+необходимостта\s+от\s+ОВОС)|(?:решение\s+по\s+чл\.?\s*93)[^.!?\n]{0,120}(?:да\s+се\s+издад[еа]|следва\s+да\s+се\s+издаде)/iu.test(body);
 if(claimsFormal93&&!disposition.formalDecisionReady)errors.push("UNSUPPORTED_FORMAL_DECISION_93");
 const claimsEIAExcluded=/(?:не\s+се\s+(?:изисква|налага|прилага|провежда)[^.!?\n]{0,75}(?:ОВОС|преценка)|(?:ОВОС|преценка\s+за\s+ОВОС)[^.!?\n]{0,55}не\s+се\s+(?:изисква|налага)|процедур(?:ите|а)[^.!?\n]{0,55}по\s+ЗООС[^.!?\n]{0,60}(?:неприложими|не\s+са\s+приложими))/iu.test(body);
 if(claimsEIAExcluded&&!disposition.annexNegative)errors.push("UNSUPPORTED_EIA_EXCLUSION");
 const claimsOSExcluded=/(?:не\s+се\s+(?:изисква|налага|прилага|провежда)[^.!?\n]{0,60}(?:ОС|оценка\s+за\s+съвместимост)|(?:процедура|оценка)\s+по\s+Наредбата\s+за\s+ОС[^.!?\n]{0,75}(?:неприложима|не\s+се\s+налага))/iu.test(body);
 if(claimsOSExcluded&&!disposition.qualificationValidated)errors.push("UNSUPPORTED_OS_EXCLUSION");
 if(/(?:\bMISSING_[A-Z_]+\b|\bPANEL_\d\d_[A-Z_]+\b|\bUNSUPPORTED_[A-Z_]+\b)/u.test(body))
  errors.push("TECHNICAL_CODE_IN_DOCUMENT");
 return errors;
}
/**
 * If the reviewer has not delivered a defensible legal conclusion, it still
 * makes one clear proposal. This draft is not an act and does not silently
 * assign a new panel or claim facts not in the dossier.
 */
export function composeKt134GroundedReviewerAlternative({
  subject,scope,disposition,reviewedText,caseContext={}
}={}){
 const title=String(subject||"").replace(/[„“"]/gu,"").trim();
 const docs=Array.isArray(caseContext.documents)?caseContext.documents:[];
 const established=Array.isArray(caseContext.confirmedFacts)?caseContext.confirmedFacts:[];
 const factual=established.slice(0,10).filter(x=>x?.value&&x?.sourceId)
  .map(x=>"- "+String(x.value).slice(0,350)+" (източник: "+String(x.sourceId)+").");
 const gap=disposition.physicalGap;
 const gapText=gap?[
  "Конкретен непотвърден физически факт: "+gap.fact+".",
  "Свързан източник: "+gap.source+".",
  "Нормативен критерий, за чието изследване е необходим: "+gap.legalCriterion+"."
 ]:[];
 const next=gap?
  "Предлага се проект на мотивирано писмо за уточняване единствено на посочения физически факт, след което компетентният орган сам да извърши нормативната квалификация.":
  "Предлага се мотивирано експертно произнасяне по установените факти с отделна преценка за приложимите категории и процесуални предпоставки; изборът на формален акт не е доказан от наличните материали.";
 const gis=caseContext.gis;
 return [
  "Относно: „"+title+"“",
  "Фактически констатации",
  String(scope||""),
  ...factual,
  gis?.pdf1Ref?"По преписката вече е наличен пространствен анализ PDF1: "+String(gis.pdf1Ref)+".":" ",
  "Правни предпоставки",
  ...keys.map(k=>{
    const row=disposition.rows[k];
    return k+": "+(row?row.status+" — "+row.criterion+". Източник: "+row.legalReference+", факт: "+row.caseSource+".":"Не е установена достатъчно обоснована източникова квалификация.") ;
  }),
  ...gapText,
  "Мотивирано предложение",
  next,
  "Предложеното от рецензента направление №"+String(disposition.proposedPanel??"—")+
  " остава проектна възможност, докато не бъдат установени законовите и процесуалните му предпоставки.",
  "Заключение и следващо действие",
  "Проектът се предоставя на компетентния експерт за окончателна преценка. Не се предлага издаване на решение по чл. 93 ЗООС без установена приложимост и проведен изискуем процедурен ред."
 ].filter(Boolean).join("\n");
}
