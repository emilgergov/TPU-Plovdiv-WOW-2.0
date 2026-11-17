import assert from "node:assert/strict";
import {
 buildQualificationSources,qualificationEvidenceOptions,validateQualification
} from "../src/kt123-evidence-qualification.mjs";

// Synthetic facts isolate the normative guard; they do NOT establish the
// applicability of the actual ZOOS annexes in the user's dossier.
const subject="Предвижда се инсталация за производство на електрическа енергия от въглища";
const laws=[
 {act:"ЗООС",reference:"Приложение № 1 към ЗООС",
  fullLegalText:"Приложение № 1 към ЗООС\nИнсталации за производство на електрическа енергия от въглища",
  quotationFromArchive:true},
 {act:"ЗООС",reference:"Приложение № 2 към ЗООС",
  fullLegalText:"Приложение № 2 към ЗООС\nДруги категории инвестиционни предложения за конкретна оценка",
  quotationFromArchive:true},
 {act:"Наредба за ОС",reference:"чл. 2",
  fullLegalText:"Чл. 2. (1) Предпоставки за съвместимост. (2) Самостоятелно приложим ред към предложения.",
  quotationFromArchive:true}
];
const confirmed=[{factId:"description",value:subject}];
const sources=buildQualificationSources({subject,scope:subject,confirmed,documents:[
 {source:"unconfirmed.pdf",text:"Предвижда се инсталация за производство на електрическа енергия от въглища"}
],legalProvisions:laws});
const excerpts=qualificationEvidenceOptions(sources);
const lawFor=k=>excerpts.laws.find(x=>x.reference===(k==="A1"?"Приложение № 1 към ЗООС":k==="A2"?"Приложение № 2 към ЗООС":"чл. 2"));
const reason="Текстът на конкретния нормативен критерий е съпоставен с установения описан предмет и с отделните проверени документи по преписката.";
const tests=["A1","A2","OS1","OS2"].map(key=>{
 const law=lawFor(key);
 return {
  key,status:key==="A1"?"ПОЛОЖИТЕЛНА":"ОТРИЦАТЕЛНА",
  legalReference:law.id,legalQuote:law.excerpts[0].id,
  caseSource:"subject",caseQuote:excerpts.facts.find(x=>x.id==="subject").excerpts[0].id,
  criterion:"Проверка на конкретния установен технологичен предмет срещу правния критерий в приложението",
  reason,comparedCategories:key==="A1"?["Инсталации за производство на електрическа енергия от въглища"]:
   key==="A2"?["Друга проверена категория от приложение № 2"]:[]
 };
});
const qualification={tests,selectedPanel:4,routeReason:
 "Изборът е само за експертно разглеждане и не означава, че е доказана процедура без самостоятелно сравнение на законовия критерий и установените параметри.",
 missingFact:{fact:"",source:"",legalCriterion:""}};
const validate=(change=()=>{})=>{
 const q=structuredClone(qualification);change(q);
 return validateQualification(q,sources);
};
const good=validate();assert.equal(good.ok,true,JSON.stringify(good.errors));
const unverifiedCategory=validate(q=>q.tests[0].comparedCategories=["Складова база за стоки и офиси"]);
assert(unverifiedCategory.errors.includes("POSITIVE_ANNEX_CATEGORY_NOT_IN_LAW:A1"));
const noCaseMatch=validate(q=>{q.tests[0].caseSource="fact:description";});
assert.equal(noCaseMatch.ok,true,"A second established source with the same specific facts should work");
const unknownCase=validate(q=>{q.tests[0].caseSource="doc:0";q.tests[0].caseQuote=excerpts.facts.find(x=>x.id==="doc:0").excerpts[0].id;});
assert(unknownCase.errors.includes("POSITIVE_ANNEX_UNCONFIRMED_CASE_SOURCE:A1"));
const mismatchedCase=buildQualificationSources({subject:"Складове за промишлени стоки и офиси",
 scope:"Складова дейност в урбанизиран имот",legalProvisions:laws});
const mismatchQ=structuredClone(qualification);
mismatchQ.tests=mismatchQ.tests.map(t=>({...t,caseSource:"subject",caseQuote:"subject#0"}));
const mismatchResult=validateQualification(mismatchQ,mismatchedCase);
assert(mismatchResult.errors.includes("POSITIVE_ANNEX_CATEGORY_FACT_MISMATCH:A1"),
 JSON.stringify(mismatchResult.errors));
const mismatchedPanel=validate(q=>{q.selectedPanel=1;});
assert(mismatchedPanel.errors.includes("PANEL_01_CONTRADICTS_LEGAL_FACTS"));
console.log("PASS KT124-R9: positive annex requires exact law category + confirmed case evidence + category-to-fact link; false category and simulated source rejected; no forced panel selection.");
