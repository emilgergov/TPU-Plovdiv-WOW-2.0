import assert from "node:assert/strict";
import {evaluateDecision,evaluateDraft,STATUSES,TEST_KEYS} from "../src/kt123-decision-model.mjs";
const positive="ПОЛОЖИТЕЛНА",negative="ОТРИЦАТЕЛНА",unknown="НЕОПРЕДЕЛЕНА";
let runs=0,positiveBoth=0,unknownFirst=0,panelOneBlocked=0;
const description="Проверено по независими доказателства и относим нормативен текст; подлежи на експертно установяване преди произнасяне.";
for(const A1 of STATUSES)for(const A2 of STATUSES)for(const OS1 of STATUSES)for(const OS2 of STATUSES){
 const rows={A1,A2,OS1,OS2};const mapped=Object.fromEntries(TEST_KEYS.map(k=>[k,{status:rows[k],reason:description,count:1}]));
 for(let panel=1;panel<=22;panel++){
  const out=evaluateDecision({rows:mapped,selectedPanel:panel,procedureComplete:false});
  runs++;
  assert.equal(out.canIssueAdministrativeAct,false);
  assert.equal(out.expertApprovalRequired,true);
  assert.equal(out.selectedPanel,panel);
  if(OS1===positive&&OS2===positive){positiveBoth++;assert(out.errors.some(x=>x.code==="OS_ART2_MUTUALLY_EXCLUSIVE"))}
  if(OS1===unknown&&OS2===positive){unknownFirst++;assert(out.errors.some(x=>x.code==="OS_ART2_PREMATURE_EXCLUSION"))}
  if(panel===1){
   const allowed=A1===negative&&A2===negative&&OS1===negative&&OS2===positive;
   if(!allowed){panelOneBlocked++;assert(out.errors.some(x=>x.code==="PANEL_01_CONTRADICTS_LEGAL_FACTS"))}
   else assert.equal(out.errors.some(x=>x.code==="PANEL_01_CONTRADICTS_LEGAL_FACTS"),false);
  }
  if(panel===2)assert(out.errors.some(x=>x.code==="PANEL_02_REQUIRES_EVIDENCED_PHYSICAL_GAP"));
  if([6,7,8,9,11,12].includes(panel))assert(out.errors.some(x=>x.code==="FORMAL_ACT_REQUIRES_VERIFIED_PROCEDURAL_RECORD"));
  if(panel===15)assert(out.checks.includes("INDEPENDENT_GIS_ALWAYS_ACCESSIBLE"));
 }
}
assert.equal(runs,81*22);
assert.equal(positiveBoth,9*22);
assert.equal(unknownFirst,9*22);
assert.equal(panelOneBlocked,80);
const sample=[
 "ПРИЛОЖЕНИЕ № 1 КЪМ ЗООС: ОТРИЦАТЕЛНА — "+description,
 "ПРИЛОЖЕНИЕ № 2 КЪМ ЗООС: ОТРИЦАТЕЛНА — "+description,
 "ЧЛ. 2, АЛ. 1 НАРЕДБА ЗА ОС: ОТРИЦАТЕЛНА — "+description,
 "ЧЛ. 2, АЛ. 2 НАРЕДБА ЗА ОС: ПОЛОЖИТЕЛНА — "+description,
 "ВОДЕЩО ПРЕДЛОЖЕНИЕ: Писмо за обоснования ред.",
 "ИЗБРАН ПАНЕЛ: 01 — Писмо по чл. 2, ал. 2 от Наредбата за ОС"
].join("\n");
const parsed=evaluateDraft(sample);
assert.equal(parsed.decision.compatible,true);
assert.equal(parsed.decision.decisiveEvidenceVerified,false);
assert.equal(parsed.decision.canIssueAdministrativeAct,false);
assert.equal(evaluateDraft(sample.replace("ЧЛ. 2, АЛ. 1 НАРЕДБА ЗА ОС: ОТРИЦАТЕЛНА","ЧЛ. 2, АЛ. 1 НАРЕДБА ЗА ОС: НЕОПРЕДЕЛЕНА")).decision.compatible,false);
assert(evaluateDraft(sample.replace("ЧЛ. 2, АЛ. 1 НАРЕДБА ЗА ОС: ОТРИЦАТЕЛНА","ЧЛ. 2, АЛ. 1 НАРЕДБА ЗА ОС: ПОЛОЖИТЕЛНА")).decision.errors.some(x=>x.code==="OS_ART2_MUTUALLY_EXCLUSIVE"));
console.log("PASS KT123: "+runs+" of 1782 legal state/route combinations, OS exclusion, gap evidence, formal-act safeguards, independent GIS and no automatic legal approval.");
