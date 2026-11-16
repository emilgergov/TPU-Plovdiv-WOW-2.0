import {ROUTE_PRECONDITIONS,LEGAL_TESTS} from "./kt123-normative-scope.mjs";
/**
 * KT123 bounded, deterministic, case-neutral decision compatibility engine.
 * It NEVER establishes legal applicability by itself. It checks mutually
 * exclusive predicates and whether a proposed route contradicts its stated
 * evidence. Missing legal proof remains open for expert review.
 * Source of truth for legal applicability is exact current law + case evidence,
 * NOT four model-authored sentences. Scope: investment proposals under ZOOS
 * annexes 1/2 and OS Ordinance art.2(1)/(2); generic safety for 22 routes.
 */
export const TEST_KEYS=Object.freeze(["A1","A2","OS1","OS2"]);
export const STATUSES=Object.freeze(["ПОЛОЖИТЕЛНА","ОТРИЦАТЕЛНА","НЕОПРЕДЕЛЕНА"]);
const labels=Object.freeze({
 A1:"Приложение № 1 към ЗООС",A2:"Приложение № 2 към ЗООС",
 OS1:"чл. 2, ал. 1 Наредба за ОС",OS2:"чл. 2, ал. 2 Наредба за ОС"
});
const defs=[
 ["A1",/^\s*ПРИЛОЖЕНИЕ\s*№\s*1\s*КЪМ\s*ЗООС\s*:\s*(ПОЛОЖИТЕЛНА|ОТРИЦАТЕЛНА|НЕОПРЕДЕЛЕНА)\s*[—–-]\s*(.+)$/imu],
 ["A2",/^\s*ПРИЛОЖЕНИЕ\s*№\s*2\s*КЪМ\s*ЗООС\s*:\s*(ПОЛОЖИТЕЛНА|ОТРИЦАТЕЛНА|НЕОПРЕДЕЛЕНА)\s*[—–-]\s*(.+)$/imu],
 ["OS1",/^\s*ЧЛ\.\s*2\s*,?\s*АЛ\.\s*1\s*НАРЕДБА\s*ЗА\s*ОС\s*:\s*(ПОЛОЖИТЕЛНА|ОТРИЦАТЕЛНА|НЕОПРЕДЕЛЕНА)\s*[—–-]\s*(.+)$/imu],
 ["OS2",/^\s*ЧЛ\.\s*2\s*,?\s*АЛ\.\s*2\s*НАРЕДБА\s*ЗА\s*ОС\s*:\s*(ПОЛОЖИТЕЛНА|ОТРИЦАТЕЛНА|НЕОПРЕДЕЛЕНА)\s*[—–-]\s*(.+)$/imu]
];
export function parseDecisionText(value){
 const clean=String(value||"").replace(/\*\*/gu,"").replace(/^\s{0,3}#{1,6}\s*/gmu,"");
 const rows=Object.fromEntries(defs.map(([key,re])=>{
  const all=[...clean.matchAll(new RegExp(re.source,"gimu"))];
  const m=all[0];return [key,{status:m?.[1]||null,reason:m?.[2]?.trim()||"",count:all.length,label:labels[key]}];
 }));
 const selected=clean.match(/ИЗБРАН\s+ПАНЕЛ\s*:\s*0?(\d{1,2})\s*[—–-]?\s*([^\n]*)/iu);
 return {rows,selectedPanel:selected?Number(selected[1]):null,selectedTitle:selected?.[2]?.trim()||"",raw:clean};
}
export function evaluateDecision(input){
 const {rows={},selectedPanel=null,selectedTitle="",physicalGap=null,
  authoritativeEvidence=null,legalSourceVerified=false,procedureComplete=false}=input||{};
 const errors=[],warnings=[],checks=[];
 const status=Object.fromEntries(TEST_KEYS.map(k=>[k,rows[k]?.status||null]));
 for(const k of TEST_KEYS){
  if(!STATUSES.includes(status[k]))errors.push({code:"MISSING_LEGAL_PREDICATE",test:k,detail:labels[k]});
  if(!rows[k]?.reason||rows[k].reason.trim().length<45)
   errors.push({code:"UNSUPPORTED_NORMATIVE_REASON",test:k,detail:labels[k]});
  if(Number(rows[k]?.count||1)!==1)errors.push({code:"DUPLICATED_LEGAL_PREDICATE",test:k});
 }
 // Art 2(2) covers investment proposals outside paragraph 1, not a parallel route.
 if(status.OS1==="ПОЛОЖИТЕЛНА"&&status.OS2==="ПОЛОЖИТЕЛНА")
  errors.push({code:"OS_ART2_MUTUALLY_EXCLUSIVE",test:"OS1/OS2"});
 if(status.OS1==="НЕОПРЕДЕЛЕНА"&&status.OS2==="ПОЛОЖИТЕЛНА")
  errors.push({code:"OS_ART2_PREMATURE_EXCLUSION",test:"OS1/OS2"});
 if(status.OS1==="ПОЛОЖИТЕЛНА"&&status.OS2==="НЕОПРЕДЕЛЕНА")
  warnings.push({code:"OS_ART2_SECONDARY_NEEDS_REVIEW",test:"OS2"});
 // The burden of demonstrating lawfulness is on the analysis, not the user.
 // This engine cannot transform self-generated narrative into verified evidence.
 if(!legalSourceVerified)warnings.push({code:"EXACT_LAW_SOURCE_NEEDS_EXPERT_VERIFICATION"});
 if(!authoritativeEvidence)warnings.push({code:"FACT_TO_NORM_TRACE_REQUIRES_EXPERT_REVIEW"});
 const allNegative= status.A1==="ОТРИЦАТЕЛНА"&&status.A2==="ОТРИЦАТЕЛНА";
 const panel1Compatible=allNegative&&status.OS1==="ОТРИЦАТЕЛНА"&&status.OS2==="ПОЛОЖИТЕЛНА";
 const physicalGapProven=physicalGap&&physicalGap.established===true&&
   typeof physicalGap.factId==="string"&&physicalGap.factId.length>0&&
   typeof physicalGap.sourceId==="string"&&physicalGap.sourceId.length>0&&
   typeof physicalGap.legalCriterion==="string"&&physicalGap.legalCriterion.length>0;
 const mandatoryTests=ROUTE_PRECONDITIONS[selectedPanel]?.legalTests||[];
 if(mandatoryTests.length&&!legalSourceVerified)warnings.push({code:"ROUTE_LEGAL_SOURCE_NOT_CONFIRMED",tests:mandatoryTests});
 const validPanel=Number.isInteger(selectedPanel)&&selectedPanel>=1&&selectedPanel<=22;
 if(!validPanel)errors.push({code:"UNKNOWN_OR_UNSELECTED_ROUTE",test:"PANEL"});
 if(selectedPanel===1&&!panel1Compatible)
  errors.push({code:"PANEL_01_CONTRADICTS_LEGAL_FACTS",test:"PANEL",detail:"Не са доказани всички предпоставки за панел №01."});
 if(selectedPanel===2&&!physicalGapProven)
  errors.push({code:"PANEL_02_REQUIRES_EVIDENCED_PHYSICAL_GAP",test:"PANEL"});
 // Other catalog entries include decisions requiring independent procedural
 // preconditions not encoded by four environmental predicates.
 const decisions=new Set([6,7,8,9,11,12]);
 if(decisions.has(selectedPanel)&&!procedureComplete)
  errors.push({code:"FORMAL_ACT_REQUIRES_VERIFIED_PROCEDURAL_RECORD",test:"PANEL"});
 if(selectedPanel===15)checks.push("INDEPENDENT_GIS_ALWAYS_ACCESSIBLE");
 if(selectedPanel&&selectedPanel!==15)checks.push("EXPERT_CASE_SPECIFIC_LEGAL_REVIEW_REQUIRED");
 if(selectedTitle&&!String(selectedTitle).trim())
  errors.push({code:"EMPTY_ROUTE_TITLE"});
 // No automatic route assignment: the model can only reject, never select.
 return Object.freeze({
  status,selectedPanel,compatible:errors.length===0,errors,warnings,checks,
  modelScope:"ZOOS_A1_A2_OS_ART2_AND_22_ROUTE_SAFETY",
  decisiveEvidenceVerified:Boolean(authoritativeEvidence&&legalSourceVerified),
  canIssueAdministrativeAct:false,
  requiredLegalTests:mandatoryTests,
  availableLegalTestCount:LEGAL_TESTS.length,
  expertApprovalRequired:true
 });
}
export function evaluateDraft(value,options={}){
 const parsed=parseDecisionText(value);
 return {...parsed,decision:evaluateDecision({
  rows:parsed.rows,selectedPanel:parsed.selectedPanel,selectedTitle:parsed.selectedTitle,...options
 })};
}
