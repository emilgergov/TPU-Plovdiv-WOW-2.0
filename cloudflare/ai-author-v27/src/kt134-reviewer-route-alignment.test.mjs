import assert from "node:assert/strict";
import {test} from "node:test";
import {KT109_ROUTE_CATALOG} from "./kt109-route-catalog.mjs";
import {kt134ReviewerRouteIssues,kt134ReviewerActionMatch} from "./kt134-reviewer-route-alignment.mjs";
test("panel 09 is not a valid termination without active procedure and legal basis",()=>{
 const result=kt134ReviewerRouteIssues({panelId:9,qualificationValidated:false,procedureEvidence:[]});
 assert.ok(result.includes("KT134_PANEL_09_NO_ACTIVE_PROCEDURE_AND_TERMINATION_BASIS"));
 assert.equal(kt134ReviewerActionMatch({panelId:9,documentTitle:"Прекратяване на процедура",action:"Предлага се изготвяне на експертна справка",legalReadiness:result}),false);
});
test("panel 09 only allowed with sourced active procedure and termination basis",()=>{
 const evidence=[{kind:"active_procedure",sourceId:"doc-reg",verified:true},{kind:"termination_legal_basis",sourceId:"legal-record",verified:true}];
 const result=kt134ReviewerRouteIssues({panelId:9,procedureEvidence:evidence});
 assert.deepEqual(result,[]);
 assert.ok(kt134ReviewerActionMatch({panelId:9,documentTitle:"Прекратяване на процедура",action:"Предлага се прекратяване на процедурата с мотивирано основание",legalReadiness:result}));
});
test("reviewer-selected panel 02 and outgoing request are coherent only when physical fact is sourced",()=>{
 const qualification={tests:["A1","A2","OS1","OS2"].map(key=>({key,status:"НЕОПРЕДЕЛЕНА"})),
  missingFact:{fact:"Вид и капацитет на евентуално ново оборудване",source:"Техническо описание",legalCriterion:"Критерий от конкретно приложение"}};
 assert.deepEqual(kt134ReviewerRouteIssues({panelId:2,qualification,qualificationValidated:true}),[]);
 assert.ok(kt134ReviewerActionMatch({panelId:2,documentTitle:"Писмо за допълнителна информация",action:"Писмо за допълнителна информация относно фактически капацитет",legalReadiness:[]}));
});
test("unqualified panel 01 and formal decision 07 require actual positive legal and procedure evidence",()=>{
 assert.ok(kt134ReviewerRouteIssues({panelId:1}).length);
 assert.ok(kt134ReviewerRouteIssues({panelId:7}).length);
});
test("case-specific expert report panel 13 is not silently substituted for reviewer's decision",()=>{
 assert.deepEqual(kt134ReviewerRouteIssues({panelId:13}),[]);
 assert.ok(kt134ReviewerActionMatch({panelId:13,documentTitle:"Експертна справка",action:"Предлага се експертна справка с фактически и нормативни констатации"}));
 assert.equal(kt134ReviewerActionMatch({panelId:13,documentTitle:"Експертна справка",action:"Предлага се писмо по чл. 2, ал. 2"}),false);
});

test("reviewer is offered multiple evidenced routes without preselecting one, excluding unsupported 05 07 09",()=>{
 const caseDocuments=[{source:"test-description",text:"Липсват потвърдени данни за капацитет и технологично оборудване."}];
 const available=KT109_ROUTE_CATALOG.filter(route=>
  kt134ReviewerRouteIssues({panelId:route.id,qualificationValidated:false,caseDocuments,procedureEvidence:[]}).length===0)
  .map(route=>route.id);
 assert.ok(available.includes(2),"documented factual gap permits panel02");
 assert.ok(available.includes(13),"expert reference remains an option");
 assert.ok(available.includes(14),"case review remains an option");
 for(const denied of [1,4,5,6,7,8,9,11,12])assert.ok(!available.includes(denied),"improper formal or legal route "+denied);
 assert.ok(available.length>=3,"reviewer retains independent choice");
});

test("panel03 cannot propose a random institution without two sourced procedural facts",()=>{
 const noTarget=kt134ReviewerRouteIssues({panelId:3,procedureEvidence:[]});
 assert.ok(noTarget.includes("KT134_PANEL_03_NO_IDENTIFIED_COMPETENT_INSTITUTION_OR_CONSULTATION_BASIS"));
 const withGroundedTarget=kt134ReviewerRouteIssues({panelId:3,procedureEvidence:[
  {kind:"institution_target",sourceId:"dossier-1",verified:true,institution:"Надлежна институция"},
  {kind:"consultation_legal_basis",sourceId:"master-law-1",verified:true}
 ]});
 assert.deepEqual(withGroundedTarget,[]);
});
