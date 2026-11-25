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
 const osExclusionClaim=/(?:не\s+се\s+(?:изисква|налага|прилага|провежда)[^.!?\n]{0,75}(?:ОС|оценка\s+за\s+съвместимост)|(?:процедура|оценка)\s+по\s+Наредбата\s+за\s+ОС[^.!?\n]{0,90}(?:неприложима|не\s+се\s+налага)|не\s+подлежи\s+на\s+(?:процедура|оценка)[^.!?\n]{0,55}съвместимост|няма\s+основания[^.!?\n]{0,105}(?:ОВОС|ОС)|не\s+подлежи[^.!?\n]{0,65}(?:ОВОС|ОС))/iu.test(body);
 const statusOS2=disposition.rows?.OS2?.status;
 const panel01Proven=disposition.qualificationValidated&&disposition.annexNegative&&
  disposition.rows?.OS1?.status==="ОТРИЦАТЕЛНА"&&statusOS2==="ПОЛОЖИТЕЛНА";
 const definiteLetterArt2=/(?:да\s+се\s+издаде|предлага\s+се\s+издаване|следва\s+издаване|следва\s+да\s+се\s+приложи)[^.!?\n]{0,120}(?:писмо|чл\.?\s*2\s*,?\s*ал\.?\s*2)|(?:писмо\s+по\s+чл\.?\s*2\s*,?\s*ал\.?\s*2)[^.!?\n]{0,100}(?:да\s+се\s+издаде|да\s+уведоми|не\s+подлежи)/iu.test(body);
 if(osExclusionClaim&&!panel01Proven)errors.push("UNSUPPORTED_OS_EXCLUSION");
 if(definiteLetterArt2&&!panel01Proven)errors.push("UNSUPPORTED_OS_ART2_2_LETTER");
 const screeningMandatory=/(?:следва\s+да\s+се\s+(?:проведе|стартира|инициира)|(?:необходима|задължителна)\s+е)[^.!?\n]{0,125}(?:преценка\s+(?:за|на)\s+необходимостта\s+от\s+ОВОС|процедура\s+по\s+чл\.?\s*93)|(?:преценка\s+по\s+чл\.?\s*93)[^.!?\n]{0,100}(?:е\s+задължителна|следва\s+да\s+се\s+проведе)/iu.test(body);
 if(screeningMandatory&&!disposition.annexPositive)errors.push("UNSUPPORTED_MANDATORY_EIA_SCREENING");
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
 const title=String(subject||"").replace(/[„“"]/gu,"").replace(/[.!?]+$/u,"").trim();
 const docs=Array.isArray(caseContext.documents)?caseContext.documents:[];
 const established=Array.isArray(caseContext.confirmedFacts)?caseContext.confirmedFacts:[];
 const factual=established.slice(0,10).filter(x=>x?.value&&x?.sourceId)
  .map(x=>"- "+String(x.value).slice(0,350)+" (източник: "+String(x.sourceId)+").");
 const gap=disposition.physicalGap;
 const sources=docs.map(d=>({
  source:String(d?.source||"").trim(),
  lines:String(d?.text||"").split(/[.!?\n]+/u).map(x=>x.trim()).filter(Boolean)
 }));
 // Quote only deficits explicitly identified by the supplied dossier source;
 // a missing fact is not a proof of absence or a legal category.
 const mentionedGaps=sources.flatMap(d=>d.lines.filter(t=>
  /(?:липсват\s+(?:данни|потвърдени\s+данни)|не\s+са\s+представени\s+данни|няма\s+(?:проектни|представени)\s+данни|не\s+е\s+уточнен)/iu.test(t))
  .slice(0,2).map(t=>({source:d.source,text:t.slice(0,280)}))).slice(0,3);
 const labels={
  A1:"Приложение № 1 към ЗООС",A2:"Приложение № 2 към ЗООС",
  OS1:"чл. 2, ал. 1 от Наредбата за ОС",OS2:"чл. 2, ал. 2 от Наредбата за ОС"
 };
 const analysis=disposition.qualificationValidated?
  keys.map(k=>{
   const row=disposition.rows[k];
   return labels[k]+": "+row.status+
    (row.criterion?" — правнорелевантен критерий: "+row.criterion:"")+
    (row.reason?" Мотиви: "+row.reason:"")+
    ". Нормативна основа: местният MASTER V11.";
  }):[
   "По представените материали не е установена достатъчно обоснована съпоставка на дейността с приложения № 1 и № 2 към ЗООС и с отделните хипотези на чл. 2, ал. 1 и 2 от Наредбата за ОС.",
   "Нито непресичането със защитени зони, нито липсата на описание на отделни технически параметри доказват сами по себе си приложимост или неприложимост на процедура."
  ];
 const exactGap=gap?[
   "Непотвърден физически факт по материалите на преписката: "+gap.fact+".",
   "Значение за изследвания нормативен критерий: "+gap.legalCriterion+"."
  ]:[];
 const action=gap?
  "Рецензентът предлага проект на писмо за уточняване на точно посочения физически факт, необходим за проверката на посочения нормативен критерий. Правната квалификация на дейността се извършва от компетентния орган, а не се изисква от възложителя.":
  mentionedGaps.length?
   "Рецензентът предлага проект на конкретизирано писмо за фактическо уточняване САМО на посочените в материалите непредставени характеристики на предвижданата дейност, доколкото те са относими към условията на проверяваните нормативни категории. Не се изисква възложителят сам да определя приложимата процедура.":
   "Рецензентът предлага проект на мотивирано писмо по текущата преписка с изложение на установените факти и източниковата нормативна съпоставка, без преждевременно издаване на формален акт или категорично определяне на неприложимост.";
 const gis=caseContext.gis;
 return [
  "Относно: „"+title+"“",
  "Фактически констатации",
  String(scope||""),
  ...factual,
  gis?.pdf1Ref?"Приложеният пространствен анализ е отразен в PDF1: "+String(gis.pdf1Ref)+".":null,
  "Правни предпоставки",
  ...analysis,
  ...mentionedGaps.map(g=>"Според представения документ "+g.source+
    " липсва или не е уточнено: „"+g.text+"“ (непотвърден физически параметър)."),
  ...exactGap,
  "Мотивирано предложение",
  action,
  "Рецензентският избор на направление №"+String(disposition.proposedPanel??"—")+
   " остава проектна възможност, докато не бъдат установени необходимите законови и процедурни предпоставки. Не се предлага формално решение по тази непотвърдена квалификация.",
  "Заключение и следващо действие",
  "Предлага се горепосоченото конкретно административно действие да бъде предоставено като проект за окончателна преценка от компетентния експерт. Не се предлага издаване на решение по чл. 93 ЗООС без установени предпоставки и надлежно проведена процедура."
 ].filter(x=>typeof x==="string"&&x.trim()).join("\n");
}
