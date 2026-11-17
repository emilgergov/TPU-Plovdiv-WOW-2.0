import assert from "node:assert/strict";
import worker from "../src/worker.js";
const env={OPENAI_API_KEY:"test-api-key-kt124-r6",AI_AUTHOR_ACCESS_TOKEN:"test-access-token"};
const subject="Складове и офиси в ПИ 56784.13.102";
const scope="Описаните складова и офисна дейност в преписката.";
const caseId="KT124-R6-TEST-CASE";
const legal="Съпоставка на приложимите разпоредби спрямо установените данни от преписката; окончателното определяне се извършва от експерта.";
const original=[
 "ПРИЛОЖЕНИЕ № 1 КЪМ ЗООС: ОТРИЦАТЕЛНА — "+legal,
 "ПРИЛОЖЕНИЕ № 2 КЪМ ЗООС: НЕОПРЕДЕЛЕНА — "+legal,
 "ЧЛ. 2, АЛ. 1 НАРЕДБА ЗА ОС: ОТРИЦАТЕЛНА — "+legal,
 "ЧЛ. 2, АЛ. 2 НАРЕДБА ЗА ОС: ОТРИЦАТЕЛНА — "+legal,
 "ВОДЕЩО ПРЕДЛОЖЕНИЕ: Преценка на процедурния ред по предоставените документи.",
 "ИЗБРАН ПАНЕЛ: 01 — Писмо по чл. 2, ал. 2 от Наредбата за ОС",
 "ЗАЩО ТОЗИ ПАНЕЛ: Изисква самостоятелна експертна проверка.",
 "Фактическа основа: Установена е складова и офисна дейност.",
 "Нормативни предпоставки и граници на проверката: Има непотвърдени правни квалификации.",
 "Мотивирано предложение: Писмо за експертна проверка.",
 "Данни за експертна проверка: Не се удостоверява законосъобразност."
].join("\n");
const url=(route,data,auth=true)=>new Request("https://example.test"+route,{
 method:"POST",headers:{"Content-Type":"application/json",...(auth?{Authorization:"Bearer test-access-token"}:{})},
 body:JSON.stringify(data)
});
const input={task:"confirm_reviewed_panel",projectOnly:true,expertExplicitConfirm:true,
 caseId,evidenceRevision:9,requestId:"kt124-r6-req-001",subject,scope,
 expert:"Експерт 01",panelId:1,parcelIds:["56784.13.102"],
 reviewedText:original,reviewerVerdict:"not_completed",
 validationWarnings:["Нормативните предпоставки за панел 01 все още не са потвърдени."]
};
const saved=globalThis.fetch;
let calls=0;
globalThis.fetch=async (_url,options)=>{
 calls++;
 const request=JSON.parse(options.body);
 assert(String(request.input[1].content).includes("expertConfirmedReviewedChoice"));
 const guide=String(request.input[0].content);
 assert(guide.includes("ОДОБРЕН РЕДАКЦИОНЕН ОРИЕНТИР CLASSIC A/Б (САМО ЗА ПАНЕЛ №01)"),
  "Panel 01 should have the accepted Classic A/B editorial guidance");
 assert(guide.includes("без да копираш негови факти, имоти, заповеди"),
  "Template facts and legal findings must never be copied");
 assert(guide.includes("Не повтаряй във втори въвеждащ абзац"),
  "Prevent duplicate law references in a new draft");
 assert(guide.includes("Не извеждай отрицателна категория"),
  "Unverified absence of facts is not proof of legal exclusion");
 assert(String(request.input[1].content).includes("KT124-R6-TEST-CASE")===false);
 return new Response(JSON.stringify({output:[{content:[{type:"output_text",
  text:"Уведомявам Ви, че представените документи за складове и офиси са разгледани с оглед на изложените факти. За окончателна нормативна преценка следва да бъдат проверени относимите законови предпоставки и конкретните доказателства по преписката, без настоящият проект да удостоверява издаден административен акт."
 }]}]}),{status:200});
};
try{
 const unauth=await worker.fetch(url("/stage4-expert-decision",input,false),env);
 assert.equal(unauth.status,401);
 const implicit=await worker.fetch(url("/stage4-expert-decision",{...input,expertExplicitConfirm:false}),env);
 assert.equal(implicit.status,422,"Never sign without explicit expert confirmation");
 const signedResponse=await worker.fetch(url("/stage4-expert-decision",input),env);
 assert.equal(signedResponse.status,200,JSON.stringify(await signedResponse.clone().json()));
 const signed=await signedResponse.json();
 assert.equal(signed.expertDecision.panelId,1);
 assert.equal(signed.expertDecision.reviewed,false);
 assert.equal(signed.expertDecision.expertConfirmed,true);
 assert.equal(signed.expertDecision.qualificationVerified,false);
 assert(signed.expertDecision.warnings.length>0);
 assert.equal(calls,0,"Reviewer and author cannot veto the signed expert direction");
 const chosenLine=signed.draft.match(/ИЗБРАН ПАНЕЛ:[^\n]*/)[0];
 const request={task:"draft_stage5_document",projectOnly:true,expertConfirmed:true,
  caseId,evidenceRevision:9,requestId:"kt124-r6-stage5-001",stage4Version:2,
  confirmedStage4Text:signed.draft,selectedPanelLine:chosenLine,
  subject,scope,parcelIds:["56784.13.102"],documentTitle:"Писмо по чл. 2, ал. 2 от Наредбата за ОС",
  incomingReference:"ОВОС-ХХХХ/ХХ.ХХ.ХХХХ г.",
  expertDecision:signed.expertDecision,expertDecisionProof:signed.expertDecisionProof,
  warnings:input.validationWarnings};
 const tamper=await worker.fetch(url("/stage5-document",{...request,caseId:"WRONG-CASE"}),env);
 assert.equal(tamper.status,422,"Cross-case proof must be rejected");
 const result=await worker.fetch(url("/stage5-document",request),env);
 assert.equal(result.status,200,JSON.stringify(await result.clone().json()));
 const data=await result.json();
 assert.equal(data.selectedPanelLine,chosenLine);
 assert.equal(data.projectOnly,true);
 assert.equal(calls,1);
 console.log("PASS KT124-R6: expert confirmation without AI review or signed AI qualification; persistent warnings; signed tamper-proof Stage5 project-only handoff.");
}finally{globalThis.fetch=saved}
