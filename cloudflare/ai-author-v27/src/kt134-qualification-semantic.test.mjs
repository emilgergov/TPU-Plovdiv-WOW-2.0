import assert from "node:assert/strict";
import {test} from "node:test";
import {buildQualificationSources,validateQualification} from "./kt123-evidence-qualification.mjs";
const subject="Вътрешно преустройство на съществуващо складово помещение.";
const legalProvisions=[
 {reference:"Приложение № 1 към ЗООС",act:"ЗООС",fullLegalText:"Приложение № 1 към ЗООС посочва определени категории инвестиционни предложения.",quotationFromArchive:true},
 {reference:"Приложение № 2 към ЗООС",act:"ЗООС",fullLegalText:"Приложение № 2 към ЗООС посочва категории инвестиционни предложения и условия.",quotationFromArchive:true},
 {reference:"чл. 2",act:"Наредба за ОС",fullLegalText:"Чл. 2, ал. 1 от Наредбата за ОС съдържа приложими предпоставки за предложения.",quotationFromArchive:true},
 {reference:"чл. 2",act:"Наредба за ОС",fullLegalText:"Чл. 2, ал. 2 от Наредбата за ОС съдържа самостоятелна хипотеза за предложения.",quotationFromArchive:true}
];
const sources=buildQualificationSources({subject,scope:"Вътрешна реконструкция.",legalProvisions});
function fixture(){
 return {tests:["A1","A2","OS1","OS2"].map((key,i)=>({
  key,status:"НЕОПРЕДЕЛЕНА",legalReference:"law:"+i,legalQuote:"law:"+i+"#0",
  caseSource:"subject",caseQuote:"subject#0",
  criterion:"Не е потвърдено съответствие с конкретно приложим правен критерий от действителната категория.",
  reason:"Не е установен достатъчно конкретен физически факт, който да позволи сигурно заключение по тази нормативна хипотеза.",
  comparedCategories:[]
 })),selectedPanel:13,
 routeReason:"Предлага се експертна справка с конкретна съпоставка на фактите и нормативните източници, без формално решение.",
 missingFact:{fact:"",source:"",legalCriterion:""}};
}
test("indeterminate annex claim cannot assert categorical non-applicability",()=>{
 const q=fixture();
 q.tests[0].criterion="Предложението не попада в приложимите категории на приложение номер едно към закона.";
 q.tests[0].reason="Не попада в категориите по приложение номер едно и не се налага извършването на екологична оценка, защото няма ново строителство.";
 const r=validateQualification(q,sources);
 assert.ok(r.errors.includes("UNDETERMINED_STATUS_ASSERTS_EXCLUSION:A1"),r.errors.join(", "));
});
test("missing expert legal opinion is not missing physical IP fact",()=>{
 const q=fixture();q.selectedPanel=2;
 q.missingFact={
  fact:"Липсва експертно становище и доказателство за правната категоризация",
  source:"subject",legalCriterion:"Изисква се проверка на съответния законов критерий"};
 const r=validateQualification(q,sources);
 assert.ok(r.errors.includes("MISSING_FACT_NOT_PHYSICAL"),r.errors.join(", "));
});
test("genuine missing technological capacity may support an interim request for information",()=>{
 const q=fixture();q.selectedPanel=2;
 q.missingFact={fact:"Вид и капацитет на действително предвиденото технологично оборудване",
 source:"subject",legalCriterion:"Съпоставка с конкретни характеристики на избрана законова категория"};
 const r=validateQualification(q,sources);
 assert.ok(!r.errors.includes("MISSING_FACT_NOT_PHYSICAL"),r.errors.join(", "));
 assert.ok(!r.errors.includes("PANEL_02_REQUIRES_EVIDENCED_PHYSICAL_GAP"),r.errors.join(", "));
});

test("broad request for all technical parameters cannot qualify as one missing physical fact",()=>{
 const q=fixture();q.selectedPanel=2;
 q.missingFact={
   fact:"Данни за капацитет, технология, застроена площ, използвани материали, емисии и отпадъци",
   source:"subject",legalCriterion:"Необходимост от данни по приложения № 1 и 2 към ЗООС и чл. 2 от Наредбата за ОС"};
 const r=validateQualification(q,sources);
 assert.ok(r.errors.includes("MISSING_FACT_TOO_BROAD"),r.errors.join(", "));
 assert.ok(r.errors.includes("MISSING_FACT_NO_SPECIFIC_CRITERION"),r.errors.join(", "));
});
