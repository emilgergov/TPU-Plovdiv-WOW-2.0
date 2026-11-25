import {evaluateDecision,TEST_KEYS,STATUSES} from "./kt123-decision-model.mjs";
import {KT109_ROUTE_BY_ID} from "./kt109-route-catalog.mjs";
import {checkKT134ComplaintRoute} from "./kt134-case-purpose.mjs";
// All facts and exact legal texts below are passed by reference only. Neither
// string matching nor AI qualification constitutes final legal verification.
const tidy=s=>String(s||"").normalize("NFC").replace(/\s+/gu," ").trim();
const contains=(body,needle)=>tidy(needle).length>=12&&tidy(body).includes(tidy(needle));
// Excerpts are constructed on the server FROM existing source text; the model
// chooses source identifiers, not invented quotations. Exact quote literal
// remains supported for existing automated fixtures.
function excerpts(source,limit=16){
 const body=String(source.text||"");
 const chunks=body.split(/\n+/u).map(x=>x.trim()).filter(x=>x.length>=15);
 const selected=[];
 const use=x=>{if(!selected.some(y=>y.text===x))selected.push({id:source.id+"#"+selected.length,text:x})};
 for(const line of chunks.slice(0,6))use(line.slice(0,220));
 // Include legally decisive categories and facts, not only document headers.
 for(const line of chunks){
  if(selected.length>=limit)break;
  if(/(?:т\.\s*10|урбаниз|склад|офис|площ|поземлен|приложение|чл\.\s*2|ал\.\s*1|ал\.\s*2|ОВОС)/iu.test(line))use(line.slice(0,240));
 }
 if(!selected.length&&body.trim().length>=15)use(body.trim().slice(0,180));
 return selected;
}
export function qualificationEvidenceOptions(sources){
 return {facts:(sources.facts||[]).map(x=>({...x,excerpts:excerpts(x,8)})),
  laws:(sources.laws||[]).map(x=>({...x,excerpts:excerpts(x,22)}))};
}
function resolveSourceId(ref,map){
 const raw=String(ref||"").trim();
 if(map.has(raw))return map.get(raw);
 // Resolve a label ONLY when there is a unique matching source; never let
 // an ambiguous reference pick a convenient law silently.
 const matches=[...map.values()].filter(x=>x.reference===raw||
  (x.title===raw&&x.kind!=="unverified-document-extract"));
 return matches.length===1?matches[0]:undefined;
}
function quoteVerified(source,quote){
 if(!source)return false;
 const chosen=String(quote||"").trim();
 const candidates=excerpts(source,source.id.startsWith("law:")?22:8);
 const anchored=candidates.find(x=>x.id===chosen);
 return anchored?contains(source.text,anchored.text):contains(source.text,chosen);
}
// KT124-R9: a positive annex claim must be tied to the verified text of
// the *specific annex* and to established evidence about this case.
// Word overlap is only a structural sanity check, NOT legal classification.
// If the factual and legal category cannot be traced, leave it unverified.
const significantTokens=value=>{
 const generic=new Set(["инвестици","предложен","дейност","производ","инсталац","съоръжен","изграждан","приложен","относим","установе","категори","обект","техниче","промишле","площадка","предвижд","включите","граници","документ","използва","съгласно","разположе","територ","предприят","свързани"]);
 return [...new Set((tidy(value).toLocaleLowerCase("bg").match(/[А-Яа-яA-Za-z]{6,}/gu)||[])
  .map(w=>w.slice(0,Math.min(w.length,9)))
  .filter(w=>!generic.has(w.slice(0,Math.min(w.length,9)))&&
    ![...generic].some(g=>w.startsWith(g.slice(0,6)))) )];
};
function positiveAnnexEvidence(row,law,fact){
 const categories=Array.isArray(row.comparedCategories)?row.comparedCategories:[];
 if(!fact?.established)return {ok:false,code:"POSITIVE_ANNEX_UNCONFIRMED_CASE_SOURCE"};
 const anchored=categories.filter(x=>tidy(x).length>=18&&contains(law?.text,x));
 if(!anchored.length)return {ok:false,code:"POSITIVE_ANNEX_CATEGORY_NOT_IN_LAW"};
 const caseBody=tidy(fact.text).toLocaleLowerCase("bg");
 // At least one category-specific term must have a correspondence with
 // the exact established fact. A generic word like "investment" or "facility"
 // is insufficient for declaring annex applicability.
 const linked=anchored.some(category=>significantTokens(category).some(term=>caseBody.includes(term.slice(0,6))));
 if(!linked)return {ok:false,code:"POSITIVE_ANNEX_CATEGORY_FACT_MISMATCH"};
 return {ok:true};
}
export const QUALIFICATION_SCHEMA={
 type:"object",additionalProperties:false,properties:{
  tests:{type:"array",items:{type:"object",additionalProperties:false,properties:{
   key:{type:"string",enum:["A1","A2","OS1","OS2"]},
   status:{type:"string",enum:["ПОЛОЖИТЕЛНА","ОТРИЦАТЕЛНА","НЕОПРЕДЕЛЕНА"]},
   legalReference:{type:"string"},legalQuote:{type:"string"},
   caseSource:{type:"string"},caseQuote:{type:"string"},
   criterion:{type:"string"},reason:{type:"string"},
   comparedCategories:{type:"array",items:{type:"string"}}
  },required:["key","status","legalReference","legalQuote","caseSource","caseQuote","criterion","reason","comparedCategories"]}},
  selectedPanel:{type:"integer",minimum:1,maximum:22},
  routeReason:{type:"string"},
  missingFact:{type:"object",additionalProperties:false,properties:{
   fact:{type:"string"},source:{type:"string"},legalCriterion:{type:"string"}
  },required:["fact","source","legalCriterion"]}
 },required:["tests","selectedPanel","routeReason","missingFact"]
};
export const QUALIFICATION_SYSTEM=[
 "Ти си правен квалификатор на конкретна преписка, а НЕ автор на административно писмо.",
 "Първо изследвай точните приложими законови текстове и ВСИЧКИ относими хипотези, включително конкретните категории на приложения 1 и 2 ЗООС и чл. 2, ал. 1/2 Наредба за ОС.",
 "Върни точно ЧЕТИРИ tests (A1,A2,OS1,OS2) и един проектен selectedPanel измежду 22.",
 "За всеки тест: legalReference е точно legalSources[].id (например law:10), НЕ наименование на нормативния акт; caseSource е точно caseSources[].id (например subject или doc:0).",
 "legalQuote и caseQuote трябва да са ИДЕНТИФИКАТОРИ на дословно предоставените snippets (excerpts[].id), които принадлежат съответно на legalReference и caseSource, например law:10#0 и subject#0. НЕ преразказвай цитатите и НЕ пишѝ техния текст; системата извлича цитата от източника по идентификатор.",
 "Посочи конкретен критерий, мотив минимум 70 знака и конкретно проверените категории, без да представяш самото цитиране като доказателство за правна приложимост.",
 "При отрицателна приложимост на приложенията посочи конкретните проверени категории в comparedCategories. Липсата на категория в уведомлението НЕ доказва отрицателен резултат.",
 "При ПОЛОЖИТЕЛНА приложимост на Приложение №1 или №2: comparedCategories трябва да включва дословно разпознаваема категория от точния правен текст; caseSource трябва да е ПОТВЪРДЕН факт от текущата преписка, а не свободно извлечен или симулиран документ. criterion и reason трябва да съпоставят действителните белези на тази категория с конкретния проверен факт. Не извеждай попадане от общи думи като склад, сграда, инвестиция или застроена площ без установени специфични правнорелевантни параметри.",
 "НЕОПРЕДЕЛЕНА само при конкретен обективно неизяснен правнорелевантен факт, а не юридическо затруднение.",
 "Не измисляй праг по т.10, буква б, приложение 2 ЗООС; различавай площ на имот, застроена площ и РЗП.",
 "ГИС непресичане не е само по себе си доказателство за всички правни хипотези на ОС.",
 "Чл. 2, ал. 2 ОС изисква самостоятелно положително основание и не следва автоматично от отрицателна ал. 1.",
 "Панел 02 само при доказан конкретен липсващ фактически параметър: missingFact.fact, source (точно ID), legalCriterion. Иначе остави празни низове.",
 "Не избирай предварително панел 01,02,04 или 05. Не възлагай правната категоризация на възложителя.",
 "Не измисляй цитати, източници и факти. Изходът не е административен акт, а проектна квалификация."
].join(" ");
export function buildQualificationSources({subject,scope,confirmed=[],documents=[],anchoredClaims=[],legalProvisions=[]}){
 const facts=[
  {id:"subject",text:String(subject||""),established:true,kind:"expert-confirmed"},
  {id:"scope",text:String(scope||""),established:true,kind:"expert-confirmed"}
 ];
 for(const item of confirmed){
  if(item?.value&&tidy(item.value)!=="true"&&tidy(item.value)!=="false")
   facts.push({id:"fact:"+item.factId,text:String(item.value),established:true,kind:"confirmed"});
 }
 documents.slice(0,24).forEach((d,i)=>facts.push({
  id:"doc:"+i,text:String(d.text||""),established:false,kind:"unverified-document-extract",title:String(d.source||"")
 }));
 // KT134: source-anchored quotations from every examined document span.
 // They are eligible as cited evidence but NEVER as an expert-confirmed fact.
 // Source id is tied to the exact document index and character offset.
 const seen=new Set();
 for(const claim of Array.isArray(anchoredClaims)?anchoredClaims:[]){
  const doc=Number(claim?.documentIndex),start=Number(claim?.start);
  const quote=String(claim?.quote||"").trim(),title=String(claim?.source||"").trim();
  if(!Number.isSafeInteger(doc)||doc<0||!Number.isSafeInteger(start)||start<0||
     quote.length<12||quote.length>500||!title)continue;
  const id="span:"+doc+":"+start;
  if(seen.has(id))continue;
  seen.add(id);
  facts.push({id,text:quote,established:false,kind:"unverified-document-span",title,
   documentIndex:doc,sourceOffset:start});
 }
 const laws=legalProvisions.map((law,i)=>({
  id:"law:"+i,reference:String(law.reference||""),act:String(law.act||""),
  text:String(law.fullLegalText||""),verified:law.quotationFromArchive===true
 }));
 return {facts,laws};
}
export function validateQualification(q,sources,{casePurpose=null}={}){
 const errors=[],tests=q?.tests,route=Number(q?.selectedPanel);
 if(!Array.isArray(tests)||tests.length!==4)return {ok:false,errors:["QUALIFICATION_REQUIRES_FOUR_TESTS"]};
 const laws=new Map((sources?.laws||[]).map(x=>[x.id,x])),facts=new Map((sources?.facts||[]).map(x=>[x.id,x]));
 const seen=new Set(),byKey={};
 for(const row of tests){
  const k=row?.key;
  if(!TEST_KEYS.includes(k)||seen.has(k)){errors.push("QUALIFICATION_TEST_KEY_DUPLICATE_OR_UNKNOWN");continue;}
  seen.add(k);
  if(!STATUSES.includes(row.status))errors.push("QUALIFICATION_STATUS_INVALID:"+k);
  const law=resolveSourceId(row.legalReference,laws),fact=resolveSourceId(row.caseSource,facts);
  if(!law?.verified||!quoteVerified(law,row.legalQuote))
   errors.push("UNVERIFIED_LEGAL_QUOTE:"+k);
  if(!fact||!quoteVerified(fact,row.caseQuote))
   errors.push("UNVERIFIED_CASE_QUOTE:"+k);
  if(!tidy(row.criterion)||tidy(row.criterion).length<15)
   errors.push("MISSING_LEGAL_CRITERION:"+k);
  if(tidy(row.reason).length<70)
   errors.push("INSUFFICIENT_REASON:"+k);
  if((k==="A1"||k==="A2")&&row.status==="ОТРИЦАТЕЛНА"&&
    (!Array.isArray(row.comparedCategories)||!row.comparedCategories.length))
   errors.push("NEGATIVE_ANNEX_WITHOUT_CATEGORY_REVIEW:"+k);
  if((k==="A1"||k==="A2")&&row.status==="ПОЛОЖИТЕЛНА"){
   const proof=positiveAnnexEvidence(row,law,fact);
   if(!proof.ok)errors.push(proof.code+":"+k);
  }
  if((k==="A1"||k==="A2")&&law?.reference!=="Приложение № "+(k==="A1"?"1":"2")+" към ЗООС")
   errors.push("WRONG_ANNEX_REFERENCE:"+k);
  if((k==="OS1"||k==="OS2")&&law?.reference!=="чл. 2")
   errors.push("WRONG_OS_ARTICLE:"+k);
  byKey[k]={status:row.status,reason:row.reason,count:1};
 }
 if(seen.size!==4)errors.push("MISSING_QUALIFICATION_TEST");
 const missing=q?.missingFact||{};
 const physicalGap=missing.fact&&missing.source&&missing.legalCriterion&&facts.has(missing.source)?
  {established:true,factId:missing.fact,sourceId:missing.source,legalCriterion:missing.legalCriterion}:null;
 const decision=evaluateDecision({rows:byKey,selectedPanel:route,physicalGap,
  legalSourceVerified:errors.filter(x=>x.startsWith("UNVERIFIED_LEGAL_QUOTE")).length===0,
  authoritativeEvidence:null});
 if(!KT109_ROUTE_BY_ID.has(route))errors.push("UNKNOWN_QUALIFICATION_ROUTE");
 const routeCheck=checkKT134ComplaintRoute(casePurpose,route,q?.routeReason);
 if(!routeCheck.ok)errors.push(routeCheck.code);
 if(tidy(q?.routeReason).length<70)errors.push("MISSING_ROUTE_REASON");
 for(const e of decision.errors)errors.push(e.code);
 return {ok:errors.length===0,errors:[...new Set(errors)],decision,
  legalApplicabilityCertified:false,requiresExpertReview:true};
}
export function compareDraftWithQualification(draft,q){
 const issues=[],labels={A1:"ПРИЛОЖЕНИЕ № 1 КЪМ ЗООС",A2:"ПРИЛОЖЕНИЕ № 2 КЪМ ЗООС",OS1:"ЧЛ. 2, АЛ. 1 НАРЕДБА ЗА ОС",OS2:"ЧЛ. 2, АЛ. 2 НАРЕДБА ЗА ОС"};
 const clean=String(draft||"").replace(/\*\*/gu,"");
 for(const t of q.tests){
  const regex=new RegExp("^\\s*"+labels[t.key].replace(/\./gu,"\\.")+"\\s*:\\s*(ПОЛОЖИТЕЛНА|ОТРИЦАТЕЛНА|НЕОПРЕДЕЛЕНА)\\s*[—–-]","imu");
  if(clean.match(regex)?.[1]!==t.status)issues.push("AUTHOR_CHANGED_QUALIFICATION:"+t.key);
 }
 const panel=Number(clean.match(/ИЗБРАН\s+ПАНЕЛ\s*:\s*0?(\d{1,2})\b/iu)?.[1]||0);
 if(panel!==q.selectedPanel)issues.push("AUTHOR_CHANGED_PANEL");
 return issues;
}
