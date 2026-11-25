import assert from "node:assert/strict";
import {test} from "node:test";
import {deriveKt134LegalDisposition,kt134DispositionTextIssues,composeKt134GroundedReviewerAlternative} from "./kt134-legal-disposition.mjs";
const q=()=>({
 tests:[
  {key:"A1",status:"НЕОПРЕДЕЛЕНА",criterion:"Неизвестна технологична категория",legalReference:"law:1",caseSource:"fact:1"},
  {key:"A2",status:"НЕОПРЕДЕЛЕНА",criterion:"Няма данни за технология и капацитет",legalReference:"law:2",caseSource:"fact:2"},
  {key:"OS1",status:"НЕОПРЕДЕЛЕНА",criterion:"Липсва квалификация по чл. 2, ал. 1",legalReference:"law:3",caseSource:"fact:3"},
  {key:"OS2",status:"НЕОПРЕДЕЛЕНА",criterion:"Няма положително основание за ал. 2",legalReference:"law:4",caseSource:"fact:4"}
 ],missingFact:{fact:"Технологичен капацитет",source:"doc:1",legalCriterion:"Дейност по приложение №2"}
});
test("unqualified panel 7 never authorizes an issued art. 93 decision",()=>{
 const d=deriveKt134LegalDisposition({qualification:q(),qualificationValidated:false,reviewerPanelId:7});
 assert.equal(d.formalDecisionReady,false);
 assert.equal(d.qualificationValidated,false);
 assert.ok(kt134DispositionTextIssues("Предлага се да се издаде решение по чл. 93 ЗООС.",d).includes("UNSUPPORTED_FORMAL_DECISION_93"));
});
test("four verified source-anchored statuses alone never establish completed art. 93 procedure",()=>{
 const qq=q();qq.tests[1].status="ПОЛОЖИТЕЛНА";
 const d=deriveKt134LegalDisposition({qualification:qq,qualificationValidated:true,reviewerPanelId:7});
 assert.equal(d.annexPositive,true);
 assert.equal(d.formalDecisionReady,false);
});
test("formal decision may only be considered after matching confirmed qualification AND completed procedure",()=>{
 const qq=q();qq.tests[1].status="ПОЛОЖИТЕЛНА";
 const d=deriveKt134LegalDisposition({qualification:qq,qualificationValidated:true,reviewerPanelId:7,procedureCompleted:true});
 assert.equal(d.formalDecisionReady,true);
});
test("uncertain annexes do not certify EIA or OS exclusion",()=>{
 const d=deriveKt134LegalDisposition({qualification:q(),qualificationValidated:true,reviewerPanelId:2});
 assert.equal(d.annexNegative,false);
 assert.ok(kt134DispositionTextIssues("ОВОС не се изисква и оценка за съвместимост не се налага.",d).includes("UNSUPPORTED_EIA_EXCLUSION"));
});
test("alternative is a proposal containing actual confirmed facts and precise missing legal parameter",()=>{
 const d=deriveKt134LegalDisposition({qualification:q(),qualificationValidated:true,reviewerPanelId:7});
 const txt=composeKt134GroundedReviewerAlternative({subject:"Вътрешно преустройство",scope:"Съществуваща складова сграда.",
  disposition:d,caseContext:{confirmedFacts:[{value:"ПИ 99999.999.999, площ 1500 кв. м",sourceId:"pi-1"}],
    documents:[{source:"doc-1"}],gis:{pdf1Ref:"PDF1-test"}}});
 assert.match(txt,/Технологичен капацитет/);
 assert.match(txt,/99999.999.999/);
 assert.match(txt,/PDF1-test/);
 assert.equal(kt134DispositionTextIssues(txt,d).length,0);
});
test("not enough qualification sources never silently fabricates a physical gap or picks a new panel",()=>{
 const d=deriveKt134LegalDisposition({qualification:null,qualificationValidated:false,reviewerPanelId:5});
 const txt=composeKt134GroundedReviewerAlternative({subject:"Възражение",scope:"Случай по преписка",disposition:d});
 assert.equal(d.proposedPanel,5);
 assert.equal(d.physicalGap,null);
 assert.ok(txt.includes("Мотивирано предложение"));
 assert.ok(!txt.includes("Рецензентският избор на направление"));
 assert.ok(!txt.includes("№5"));
 assert.ok(!txt.includes("Технологичен капацитет"));
});

test("art.2(2) OS letter cannot follow from spatial non-intersection and absent legal categories",()=>{
 const d=deriveKt134LegalDisposition({qualification:null,qualificationValidated:false,reviewerPanelId:1});
 const doc="Следва да се приложи чл. 2, ал. 2 от Наредбата за ОС и да се издаде писмо, с което да се уведоми, че ИП не подлежи на оценка за съвместимост.";
 const issues=kt134DispositionTextIssues(doc,d);
 assert.ok(issues.includes("UNSUPPORTED_OS_EXCLUSION"));
 assert.ok(issues.includes("UNSUPPORTED_OS_ART2_2_LETTER"));
});
test("uncertain annex evidence does not justify mandatory screening under art. 93 ZOOS",()=>{
 const d=deriveKt134LegalDisposition({qualification:q(),qualificationValidated:true,reviewerPanelId:4});
 assert.ok(kt134DispositionTextIssues("Следва да се проведе преценка на необходимостта от ОВОС по чл. 93.",d).includes("UNSUPPORTED_MANDATORY_EIA_SCREENING"));
});

test("actual live draft saying 'no grounds' and issuing art.2(2) notice is not evidence-grounded",()=>{
 const disposition=deriveKt134LegalDisposition({qualification:null,qualificationValidated:false,reviewerPanelId:1});
 const text="Поради вътрешно преустройство и липса на ново строителство не са налице условия за стартиране на процедура по оценка за съвместимост. Предлага се издаване на уведомително писмо съгласно чл. 2, ал. 2 от Наредбата за ОС, че не е необходимо провеждане на процедура.";
 const errors=kt134DispositionTextIssues(text,disposition);
 assert.ok(errors.includes("UNPROVEN_NEGATIVE_PROCEDURAL_CONCLUSION"));
 assert.ok(errors.includes("UNPROVEN_ART2_2_NOTIFICATION"));
});

test("fallback aligns with selected expert-reference panel 13, not a procedural letter",()=>{
 const d=deriveKt134LegalDisposition({qualification:null,qualificationValidated:false,reviewerPanelId:13});
 const txt=composeKt134GroundedReviewerAlternative({subject:"ИП",scope:"Преустройство",disposition:d,
   caseContext:{documents:[{source:"Техническо описание",text:"Липсват потвърдени данни за капацитет."}]}});
 assert.match(txt,/изготвяне на експертна справка/u);
 assert.equal(kt134DispositionTextIssues(txt,d).length,0);
 assert.ok(!txt.includes("Рецензентът"));
});

test("actual full Word bullets proposing motivated art.93 decision are flagged when procedure is not ready",()=>{
 const d=deriveKt134LegalDisposition({qualification:null,qualificationValidated:false,reviewerPanelId:7});
 const doc="Мотивирано предложение:\nПредвид непълните данни следва да се издаде мотивирано решение за преценяване на необходимостта от ОВОС по чл. 93, ал. 1 ЗООС.\n- Издаване на мотивирано решение по чл. 93 ЗООС за преценка необходимостта от ОВОС.";
 const problems=kt134DispositionTextIssues(doc,d);
 assert.ok(problems.includes("UNPROVEN_FORMAL_ACT_OR_PROCEDURE_93"));
});
test("express exclusion of premature art.93 act is not mistaken for a positive proposal",()=>{
 const d=deriveKt134LegalDisposition({qualification:null,qualificationValidated:false,reviewerPanelId:13});
 assert.equal(kt134DispositionTextIssues("Не се предлага издаване на решение по чл. 93 ЗООС без доказани предпоставки.",d).length,0);
});

test("actual synthetic panel02 letter asks a precise physical question, not applicant legal categorization",()=>{
 const d=deriveKt134LegalDisposition({qualification:null,qualificationValidated:false,reviewerPanelId:2});
 const txt=composeKt134GroundedReviewerAlternative({subject:"Преустройство",scope:"Вътрешни работи",disposition:d,
  caseContext:{documents:[{source:"Техническо описание",text:"Липсват потвърдени данни за капацитет и технологично оборудване."}]}});
 assert.match(txt,/дали наред с описаното вътрешно преустройство се предвижда въвеждане на нова дейност/iu);
 assert.match(txt,/само при положителен отговор/iu);
 assert.equal(kt134DispositionTextIssues(txt,d).length,0);
});

test("real panel02 Word does not ask for every environmental parameter without a predicate",()=>{
 const q=()=>({tests:["A1","A2","OS1","OS2"].map(key=>({key,status:"НЕОПРЕДЕЛЕНА"})),
 missingFact:{fact:"Вид и капацитет на евентуално ново оборудване",source:"Техническо описание",legalCriterion:"Конкретна категория"}}); 
 const d=deriveKt134LegalDisposition({qualification:q(),qualificationValidated:true,reviewerPanelId:2});
 const text="Мотивирано предложение:\nПоради липсата на технически данни следва да се изиска от възложителя представяне на детайлна техническа документация:\n- Капацитет и мощност на технологичното оборудване;\n- Данни за емисии и водоползване;\n- Количество отпадъци, материали и опасни вещества.\nЗаключение и следващо действие:\nПредлага се писмо.";
 const issues=kt134DispositionTextIssues(text,d);
 assert.ok(issues.includes("UNJUSTIFIED_BROAD_INFORMATION_REQUEST"),issues.join(","));
 assert.ok(issues.includes("UNJUSTIFIED_FULL_TECHNICAL_DOSSIER"),issues.join(","));
});
test("no internal reviewer author signature or placeholder in office Word",()=>{
 const d=deriveKt134LegalDisposition({reviewerPanelId:2});
 assert.ok(kt134DispositionTextIssues("Предлага се проект. Изготвил: независим рецензент\nДата: [по решение на експерта]",d)
 .includes("INTERNAL_REVIEW_PROCESS_IN_DOCUMENT"));
});
