// KT134: identify the CURRENT administrative question, not the historical
// investment proposal mentioned in an objection. No automatic panel choice.
const tidy=x=>String(x||"").normalize("NFC").toLocaleLowerCase("bg").trim();
const complaint=/(?:възражени(?:е|ето|я)|жалб(?:а|ата|и))/iu;
const priorLetter=/(?:писм(?:о|ото|а)|предходн(?:о|ото)|корекци(?:я|ята)|редакци(?:я|ята)|оспорван|преразглеждан)/iu;
const newNotice=/(?:ново\s+уведомление\s+за\s+ип|ново\s+инвестиционно\s+предложение)/iu;
export function detectKT134CasePurpose({subject,scope,sourceTexts=[],documents=[]}={}){
 const sb=tidy(subject),sc=tidy(scope);
 const first=Array.isArray(sourceTexts)?sourceTexts.find(x=>String(x?.text||"").trim()):null;
 const lead=tidy(first?.text).slice(0,7000);
 const title=tidy(first?.source||documents?.[0]?.name||"");
 const adminQuestion=complaint.test(sb)&&priorLetter.test(sb+" "+sc);
 const sourceComplaint=complaint.test(lead)||complaint.test(title);
 const relatedLetter=priorLetter.test(lead+" "+title);
 const explicitNewCase=newNotice.test(sb)&&!/без\s+ново\s+инвестиционно\s+предложение/iu.test(sb+" "+sc);
 const complaintReview=adminQuestion&&sourceComplaint&&relatedLetter&&!explicitNewCase;
 return Object.freeze({
  kind:complaintReview?"review_of_prior_correspondence":"investment_or_other_case",
  complaintReview,sourceTitle:first?.source||documents?.[0]?.name||null,
  basis:complaintReview?"subject_scope_and_lead_document":"not_confirmed",
  // This marker only changes the questions asked; it neither establishes
  // an administrative remedy nor fixes the applicable route.
  recommendedRoute:null
 });
}
