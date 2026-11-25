import {KT109_ROUTE_BY_ID} from "./kt109-route-catalog.mjs";
import {checkKT134ComplaintRoute} from "./kt134-case-purpose.mjs";
const str=x=>String(x??"").normalize("NFC").trim();
const excerptFor=(source,id)=>Array.isArray(source?.excerpts)?
 source.excerpts.find(x=>x.id===id):null;
export const COMPLAINT_QUALIFICATION_SCHEMA={
 type:"object",additionalProperties:false,properties:{
  kind:{type:"string",enum:["complaint_procedure"]},
  selectedPanel:{type:"integer",minimum:1,maximum:22},
  requestType:{type:"string",enum:["възражение по писмо","жалба срещу акт","друго административно искане"]},
  caseSource:{type:"string"},caseQuote:{type:"string"},
  legalSource:{type:"string"},legalQuote:{type:"string"},
  competenceReason:{type:"string"},routeReason:{type:"string"},
  proposedAction:{type:"string"},unresolvedQuestion:{type:"string"}
 },required:["kind","selectedPanel","requestType","caseSource","caseQuote","legalSource",
  "legalQuote","competenceReason","routeReason","proposedAction","unresolvedQuestion"]
};
export const COMPLAINT_QUALIFICATION_SYSTEM=[
 "КТ134: Отделна правна и административно-процедурна квалификация на жалба/възражение по вече издадено писмо.",
 "Това не е уведомление за ново ИП. Не прави нова процедура по ОВОС/ОС и не определяй приложимостта по четирите матрични теста за ИП.",
 "Изследвай действително предоставените документи, вида и допустимостта на искането, компетентността, относимите разпоредби на АПК и специален ред, ако точният текст е предоставен.",
 "Върни един мотивирано избран панел от каталог 22, но не предпочитай предварително панел 17.",
 "Панел 03 само при конкретно посочена компетентна институция и относим доказан въпрос за становище.",
 "ИЗБРАН ПАНЕЛ 01, 04, 05 или формално решение по нова процедура не е подходящ само поради позоваване на старо ИП.",
 "caseSource и legalSource са точни ID от caseSources[] и legalSources[]. caseQuote и legalQuote са точни ID от excerpts[].id на съответните източници.",
 "Избраните цитати трябва да удостоверяват действителния предмет на възражението и приложимото процедурно правило, а не законово предположение.",
 "За компетентност, избор на процедура и следващо действие дай конкретни мотиви (поне 70 знака всеки).",
 "Ако има нерешен въпрос, посочи го в unresolvedQuestion, без да измисляш физическа липса или ново ИП.",
 "Проектното предложение не представлява издаден административен акт и не замества окончателното одобрение от експерта."
].join(" ");
export function validateComplaintQualification(q,options,purpose){
 const issues=[],f=new Map((options?.facts||[]).map(x=>[x.id,x])),
  laws=new Map((options?.laws||[]).map(x=>[x.id,x]));
 if(!purpose?.complaintReview)issues.push("COMPLAINT_PURPOSE_NOT_ESTABLISHED");
 if(!q||q.kind!=="complaint_procedure")return {ok:false,errors:["COMPLAINT_SCHEMA_INVALID",...issues]};
 const route=KT109_ROUTE_BY_ID.get(Number(q.selectedPanel));
 if(!route)issues.push("UNKNOWN_COMPLAINT_PANEL");
 const gate=checkKT134ComplaintRoute(purpose,q.selectedPanel,q.routeReason);
 if(!gate.ok)issues.push(gate.code);
 const source=f.get(q.caseSource),law=laws.get(q.legalSource);
 const caseExcerpt=excerptFor(source,q.caseQuote),legalExcerpt=excerptFor(law,q.legalQuote);
 if(!source||!caseExcerpt||!str(source.text).includes(caseExcerpt.text)||
    caseExcerpt.text.length<12)
  issues.push("COMPLAINT_CASE_SOURCE_UNVERIFIED");
 if(!law?.verified||!legalExcerpt||!str(law.text).includes(legalExcerpt.text)||
    legalExcerpt.text.length<12)
  issues.push("COMPLAINT_LEGAL_SOURCE_UNVERIFIED");
 if(str(q.routeReason).length<70)issues.push("COMPLAINT_ROUTE_REASON_INSUFFICIENT");
 if(str(q.competenceReason).length<70)issues.push("COMPLAINT_COMPETENCE_UNREASONED");
 if(str(q.proposedAction).length<50)issues.push("COMPLAINT_ACTION_UNREASONED");
 if(!["възражение по писмо","жалба срещу акт","друго административно искане"].includes(q.requestType))
  issues.push("COMPLAINT_REQUEST_TYPE_UNRECOGNIZED");
 if(q.selectedPanel===3&&!/(?:конкретн|компетентн)[^.!?]{0,130}(?:институци|орган)/iu.test(q.routeReason+" "+q.proposedAction))
  issues.push("COMPLAINT_PANEL03_NO_NAMED_COMPETENT_BODY");
 return {ok:issues.length===0,errors:[...new Set(issues)],legalApplicabilityCertified:false,
  requiresExpertReview:true,routeTitle:route?.title||null};
}
export function complaintDraftIssues(draft,q){
 const issues=[],body=str(draft).replace(/\*\*/gu,""),found=body.match(/ИЗБРАН\s+ПАНЕЛ\s*:\s*0?(\d{1,2})\b/iu);
 if(!found||Number(found[1])!==Number(q.selectedPanel))issues.push("COMPLAINT_DRAFT_PANEL_MISMATCH");
 const title=KT109_ROUTE_BY_ID.get(Number(q.selectedPanel))?.title;
 if(title&&!body.includes(title))issues.push("COMPLAINT_DRAFT_TITLE_MISMATCH");
 if(!/(?:Фактическа основа|Предмет на възражението)/iu.test(body))issues.push("COMPLAINT_FACTUAL_SECTION_MISSING");
 if(!/(?:Нормативни предпоставки|Правна преценка)/iu.test(body))issues.push("COMPLAINT_LEGAL_SECTION_MISSING");
 if(!/(?:Мотивирано предложение|Следващо административно действие)/iu.test(body))
  issues.push("COMPLAINT_ACTION_SECTION_MISSING");
 if(!/(?:Данни за експертна проверка|За окончателно експертно одобрение)/iu.test(body))
  issues.push("COMPLAINT_EXPERT_REVIEW_SECTION_MISSING");
 return issues;
}
