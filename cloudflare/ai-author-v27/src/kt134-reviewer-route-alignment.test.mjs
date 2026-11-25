import assert from "node:assert/strict";
import {test} from "node:test";
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
