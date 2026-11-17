import assert from "node:assert/strict";
import worker from "../src/worker.js";
import {validateQualification,buildQualificationSources,compareDraftWithQualification} from "../src/kt123-evidence-qualification.mjs";
import {signQualification,verifyQualification} from "../src/kt123-handoff-signature.mjs";
const saved=globalThis.fetch;
const env={OPENAI_API_KEY:"mock-provider-key-kt123",AI_AUTHOR_ACCESS_TOKEN:"kt123-access-token"};
const subject="Складове за промишлени стоки и офиси, в поземлен имот 56784.13.102";
const scope="Складова и офисна дейност с документиран предмет и площ";
const anchor="8d3851affd72fb44b4d663920196e00ec317c8e45d36fc16c6ad6b0ce965226c";
const payload={
 task:"draft_normative_proposal",documentType:"PROJECT_NOT_ACT",
 caseId:"KT123-Q-TEST",requestId:"KT123-Q-REQUEST",evidenceRevision:"revision-0",
 subject,scope,parcelIds:["56784.13.102"],
 evidence:[{factId:"subject_confirmed",value:"true",status:"established",sourceId:"subject",sourceLocation:"Етап 2"}],
 archive:{name:"V11",sha256:anchor,verifiedReferences:[]},
 constraints:{expertApprovalRequired:true,neverIssueAct:true},
 completeCaseEvidence:{sourceTexts:[{source:"notification.pdf",text:"В предмета са посочени складове за промишлени стоки и офиси, ПИ 56784.13.102.",totalChars:83,truncated:false}],
  sourceTextCount:1,sourceTextTruncated:false,documentRecords:[],gis:{parcelIds:["56784.13.102"]}}
};
const labels={A1:"ПРИЛОЖЕНИЕ № 1 КЪМ ЗООС",A2:"ПРИЛОЖЕНИЕ № 2 КЪМ ЗООС",
 OS1:"ЧЛ. 2, АЛ. 1 НАРЕДБА ЗА ОС",OS2:"ЧЛ. 2, АЛ. 2 НАРЕДБА ЗА ОС"};
const reasons={
 A1:"Съпоставени са характеристиките на конкретната складова и офисна дейност с изрично посочените правни категории от приложение № 1 и относимите данни от преписката.",
 A2:"Съпоставени са характеристиките на конкретната складова и офисна дейност с изрично посочените правни категории от приложение № 2 и относимите данни от преписката.",
 OS1:"Изследвани са относимите правни предпоставки по член 2, алинея 1, като отделно се разграничават действителните документирани характеристики и пространственото положение.",
 OS2:"Нормативното направление се предлага въз основа на самостоятелна съпоставка с приложимите предпоставки на член 2, алинея 2 и предмета на конкретната преписка."
};
const statuses={A1:"ОТРИЦАТЕЛНА",A2:"ОТРИЦАТЕЛНА",OS1:"ОТРИЦАТЕЛНА",OS2:"ПОЛОЖИТЕЛНА"};
const makeDraft=q=>[
 ...q.tests.map(t=>labels[t.key]+": "+t.status+" — "+reasons[t.key]),
 "ВОДЕЩО ПРЕДЛОЖЕНИЕ: Предлага се изготвяне на мотивирано писмо въз основа на индивидуалната правна съпоставка.",
 "ИЗБРАН ПАНЕЛ: 01 — Писмо по чл. 2, ал. 2 от Наредбата за ОС",
 "ЗАЩО ТОЗИ ПАНЕЛ: При самостоятелна правна съпоставка и фактическа преценка се предлага само експертно потвърждаване.",
 "ЗАЩО НЕ АЛТЕРНАТИВИТЕ: Няма доказана конкретна фактическа липса за искане по панел 02; другите направления изискват други законови предпоставки.",
 "Фактическа основа",
 "Приети са индивидуалните данни за описания предмет и обхват с посочените източници, като няма автоматично приемане на недоказани факти.",
 "Нормативни предпоставки и граници на проверката",
 "Съпоставката по четирите посочени режима се основава на източниково посочени разпоредби и факти, като приложимостта остава предмет на експертен преглед.",
 "Мотивирано предложение",
 "Предлага се писмо по посоченото направление след експертна проверка на съществените фактически и нормативни предпоставки.",
 "Данни за експертна проверка",
 "Проверката разглежда приложимите фактически белези и правни критерии без автоматично определяне на процедура единствено по ГИС."
].join("\n");
const output=text=>new Response(JSON.stringify({output:[{content:[{type:"output_text",text}]}]}),{status:200,headers:{"Content-Type":"application/json"}});
let qualifications=0,authors=0,reviews=0,wordCalls=0,qGenerated,draft;
globalThis.fetch=async(_url,opts)=>{
 const request=JSON.parse(opts.body);
 assert.equal(request.store,false);
 assert.equal(opts.headers.Authorization,"Bearer mock-provider-key-kt123");
 if(request.text?.format?.name==="kt123_source_qualification"){
  qualifications++;
  const data=JSON.parse(request.input[1].content);
  const law=key=>data.legalSources.find(s=>s.reference===(key==="A1"?"Приложение № 1 към ЗООС":key==="A2"?"Приложение № 2 към ЗООС":"чл. 2")&&(key.startsWith("OS")?s.act==="Наредба за ОС":true));
  const tests=["A1","A2","OS1","OS2"].map(key=>{
   const l=law(key);assert(l,"missing legal source: "+key);
   return {key,status:statuses[key],legalReference:l.id,legalQuote:l.text.slice(0,130),
    caseSource:"subject",caseQuote:subject.slice(0,70),
    criterion:"Проверка на конкретните правни предпоставки по приложимия нормативен режим",
    reason:reasons[key],comparedCategories:key.startsWith("A")?["Относими категории от приложението"]:[]};
  });
  qGenerated={tests,selectedPanel:1,routeReason:"Предлага се проект за писмо само след конкретна законова и фактическа съпоставка с проверка на приложимите категории, без автоматизъм.",missingFact:{fact:"",source:"",legalCriterion:""}};
  return output(JSON.stringify(qGenerated));
 }
 if(request.text?.format?.name==="kt105_normative_audit"){
  reviews++;const data=JSON.parse(request.input[1].content);
  assert.equal(data.lockedQualification.selectedPanel,1);
  return output(JSON.stringify({verdict:"pass",issues:[],revisedDraft:""}));
 }
 if(request.input?.[1]?.content&&String(request.input[1].content).includes('"lockedQualification"')){
  authors++;const data=JSON.parse(request.input[1].content);
  assert.equal(data.lockedQualification.selectedPanel,1);
  draft=makeDraft(data.lockedQualification);
  return output(draft);
 }
 wordCalls++;
 return output("Въз основа на потвърдените данни за складова и офисна дейност и индивидуално съпоставените нормативни основания Ви уведомявам за приложимия ред по чл. 2, ал. 2 от Наредбата за ОС, при спазване на правните предпоставки и установените факти по преписката.");
};
const call=(route,body)=>worker.fetch(new Request("https://example.test/"+route,{
 method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer kt123-access-token"},body:JSON.stringify(body)
}),env);
try{
 const r=await call("stage4-proposal",payload),body=await r.json();
 assert.equal(r.status,200,JSON.stringify(body));
 assert.equal(qualifications,1);
 assert.equal(authors,1);
 assert.equal(reviews,1);
 assert.equal(body.qualificationGate.sourceAnchorsMatched,true);
 assert.equal(body.qualificationGate.legalApplicabilityCertified,false);
 assert.equal(body.qualificationRecord.selectedPanel,1);
 assert.match(body.qualificationProof,/^[0-9a-f]{64}$/u);
 assert.deepEqual(compareDraftWithQualification(body.draft,body.qualificationRecord),[]);
 const stage5={
  task:"draft_stage5_document",caseId:payload.caseId,requestId:"word-test-01",stage4Version:1,
  evidenceRevision:payload.evidenceRevision,projectOnly:true,expertConfirmed:true,
  confirmedStage4Text:body.draft,
  selectedPanelLine:"ИЗБРАН ПАНЕЛ: 01 — Писмо по чл. 2, ал. 2 от Наредбата за ОС",
  documentTitle:"Писмо по чл. 2, ал. 2 от Наредбата за ОС",
  subject,scope,parcelIds:payload.parcelIds,
  qualificationRecord:body.qualificationRecord,qualificationProof:body.qualificationProof,
  qualificationGate:body.qualificationGate
 };
 const forged={...stage5,qualificationRecord:{...stage5.qualificationRecord,selectedPanel:2}};
 const block=await call("stage5-document",forged);
 assert.equal(block.status,422);
 assert.equal((await block.json()).error,"STAGE4_SOURCE_PROOF_MISSING");
 assert.equal(wordCalls,0,"tampered handoff must not reach paid author");
 const modified={...stage5,confirmedStage4Text:body.draft.replace("ПРИЛОЖЕНИЕ № 2 КЪМ ЗООС: ОТРИЦАТЕЛНА","ПРИЛОЖЕНИЕ № 2 КЪМ ЗООС: НЕОПРЕДЕЛЕНА")};
 const divergent=await call("stage5-document",modified);
 assert.equal(divergent.status,422);
 assert.equal((await divergent.json()).error,"STAGE4_QUALIFICATION_CHANGED");
 assert.equal(wordCalls,0);
 const actual=await call("stage5-document",stage5);
 assert.equal(actual.status,200,JSON.stringify(await actual.clone().json()));
 assert.equal(wordCalls,1);
 console.log("PASS KT123: independent qualification -> verified legal/case quotes -> locked panel/status -> signed expert handoff -> Stage5 document. Tampering rejected.");
}finally{globalThis.fetch=saved}
