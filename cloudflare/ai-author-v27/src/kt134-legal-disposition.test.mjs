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
 assert.ok(txt.includes("№5"));
 assert.ok(!txt.includes("Технологичен капацитет"));
});
