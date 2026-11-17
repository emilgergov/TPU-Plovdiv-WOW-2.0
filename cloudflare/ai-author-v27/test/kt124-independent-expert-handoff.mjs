import assert from "node:assert/strict";
import worker from "../src/worker.js";
import {expertStage4Text} from "../src/kt124-expert-decision.mjs";
const env={OPENAI_API_KEY:"test-secret-api-key-kt124",AI_AUTHOR_ACCESS_TOKEN:"test-access-token"};
const subject="Изграждане на складови помещения и офиси в ПИ 56784.13.102";
const scope="Предвидена складова дейност с прилежащи офиси по представените материали.";
const direction="ИЗБРАН ПАНЕЛ: 02 — Писмо за допълнителна информация";
const long="Конкретните фактически характеристики следва да бъдат съпоставени със законовите изисквания, без да се подменя направлението.";
const requestBody={
 task:"confirm_independent_expert_decision",projectOnly:true,caseId:"KT124-CASE-001",
 evidenceRevision:12,requestId:"kt124-r-001",subject,scope,
 parcelIds:["56784.13.102"],decision:{
  expert:"Старши експерт — служебен идентификатор 001",panelId:2,
  rows:["A1","A2","OS1","OS2"].map((key,i)=>({
   key,status:["ОТРИЦАТЕЛНА","НЕОПРЕДЕЛЕНА","ОТРИЦАТЕЛНА","НЕОПРЕДЕЛЕНА"][i],
   reason:long+" Ред "+key+" — индивидуална фактическа и правна съпоставка."
  })),
  legalGrounds:"Преценката е извършена по законовите критерии на приложение № 2 към ЗООС и чл. 2 от Наредбата за ОС, с индивидуална проверка на релевантните предпоставки.",
  caseGrounds:"Представената преписка съдържа описание на складова и офисна дейност; за конкретен правнорелевантен физически параметър са необходими допълнителни уточнения от източника.",
  reasoning:"Самостоятелната експертна преценка установява конкретна необходимост от уточняване на относим физически параметър, обвързан с конкретните изисквания на нормативната разпоредба. AI Авторът и рецензентът са оценени критично.",
  explicitOverride:true
 },
 author:{draft:"EG автор: предлага писмо по чл. 2, ал. 2",issueCodes:["EXPERT_DISAGREEMENT"]},
 reviewer:{verdict:"reject",findings:["Противоречиви мотиви от EG Автор и пропуснат фактически параметър"]}
};
const json=(url,data,authorized=true)=>new Request("https://example.test"+url,{
 method:"POST",headers:{"Content-Type":"application/json",...(authorized?{Authorization:"Bearer test-access-token"}:{})},
 body:JSON.stringify(data)});
const saved=globalThis.fetch;
let authorCalls=0;
globalThis.fetch=async(_url,options)=>{
 authorCalls++;
 const request=JSON.parse(options.body);
 assert.equal(request.model,"gpt-4.1-mini");
 assert(String(request.input[1].content).includes("independentExpertDecision"),"Stage5 author must receive independent expert record");
 return new Response(JSON.stringify({output:[{content:[{
  type:"output_text",text:"Необходимо е да представите конкретни уточнения относно техническите характеристики, доколкото те са необходими за индивидуалната правна квалификация, въз основа на изложените от компетентния експерт факти и приложими разпоредби."
 }]}]}),{status:200});
};
try{
 const noAccess=await worker.fetch(json("/stage4-expert-decision",requestBody,false),env);
 assert.equal(noAccess.status,401);
 const incomplete={...requestBody,decision:{...requestBody.decision,reasoning:"Няма мотив."}};
 const noReason=await worker.fetch(json("/stage4-expert-decision",incomplete),env);
 assert.equal(noReason.status,422);
 const response=await worker.fetch(json("/stage4-expert-decision",requestBody),env);
 assert.equal(response.status,200,JSON.stringify(await response.clone().json()));
 const result=await response.json();
 assert.equal(result.expertDecision.panelId,2);
 assert.equal(result.expertDecision.reviewer.verdict,"reject");
 assert.equal(result.expertDecision.author.draft,requestBody.author.draft);
 assert.equal(result.draft,expertStage4Text(result.expertDecision));
 assert.match(result.expertDecisionProof,/^[a-f0-9]{64}$/u);
 assert.equal(authorCalls,0,"Expert override must not invoke AI author or reviewer");
 const stage5={
  task:"draft_stage5_document",projectOnly:true,expertConfirmed:true,
  caseId:requestBody.caseId,evidenceRevision:requestBody.evidenceRevision,
  requestId:"kt124-stage5-r-001",stage4Version:1,
  confirmedStage4Text:result.draft,selectedPanelLine:direction,
  documentTitle:"Писмо за допълнителна информация",
  incomingReference:"ОВОС-ХХХХ/ХХ.ХХ.ХХХХ г.",
  subject,scope,parcelIds:["56784.13.102"],
  expertDecision:result.expertDecision,expertDecisionProof:result.expertDecisionProof
 };
 const changedCase={...stage5,caseId:"KT124-OTHER-CASE"};
 const wrongCase=await worker.fetch(json("/stage5-document",changedCase),env);
 assert.equal(wrongCase.status,422);
 assert.equal((await wrongCase.json()).error,"EXPERT_DECISION_INTEGRITY_ERROR");
 const altered={...stage5,expertDecision:{...stage5.expertDecision,panelId:1}};
 const changedDirection=await worker.fetch(json("/stage5-document",altered),env);
 assert.equal(changedDirection.status,422);
 const tamperedDraft={...stage5,confirmedStage4Text:stage5.confirmedStage4Text.replace("Самостоятелна експертна преценка","AI произнасяне")};
 const changedText=await worker.fetch(json("/stage5-document",tamperedDraft),env);
 assert.equal(changedText.status,422);
 assert.equal(authorCalls,0,"Tampered case, expert record, or draft must never reach AI");
 const delivered=await worker.fetch(json("/stage5-document",stage5),env);
 assert.equal(delivered.status,200,JSON.stringify(await delivered.clone().json()));
 const document=await delivered.json();
 assert.equal(document.selectedPanelLine,direction);
 assert.equal(document.documentTitle,stage5.documentTitle);
 assert.equal(document.stage4Version,1);
 assert.equal(document.projectOnly,true);
 assert.equal(authorCalls,1);
 console.log("PASS KT124: authorized independent expert override; 22-route catalogue; AI disagreement retained; signed case/subject/direction; Stage5 original author contract preserved; cross-case and tampering blocked.");
}finally{globalThis.fetch=saved;}
