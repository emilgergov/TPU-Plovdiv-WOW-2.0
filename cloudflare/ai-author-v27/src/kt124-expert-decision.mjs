import {KT109_ROUTE_BY_ID} from "./kt109-route-catalog.mjs";
export const KEYS=["A1","A2","OS1","OS2"];
export const LABELS=["ПРИЛОЖЕНИЕ № 1 КЪМ ЗООС","ПРИЛОЖЕНИЕ № 2 КЪМ ЗООС","ЧЛ. 2, АЛ. 1 НАРЕДБА ЗА ОС","ЧЛ. 2, АЛ. 2 НАРЕДБА ЗА ОС"];
const statuses=new Set(["ПОЛОЖИТЕЛНА","ОТРИЦАТЕЛНА","НЕОПРЕДЕЛЕНА"]);
const trim=v=>String(v||"").trim();
export function checkExpertDecision(input){
 const errors=[],d=input?.decision,identity=trim(d?.expert);
 if(identity.length<3||identity.length>120)errors.push("EXPERT_ID_REQUIRED");
 if(!KT109_ROUTE_BY_ID.has(Number(d?.panelId)))errors.push("EXPERT_PANEL_UNKNOWN");
 if(trim(d?.legalGrounds).length<35||trim(d?.legalGrounds).length>4500)errors.push("EXPERT_LEGAL_GROUNDS_REQUIRED");
 if(trim(d?.caseGrounds).length<35||trim(d?.caseGrounds).length>4500)errors.push("EXPERT_CASE_GROUNDS_REQUIRED");
 if(trim(d?.reasoning).length<80||trim(d?.reasoning).length>7000)errors.push("EXPERT_REASONING_REQUIRED");
 const rows=d?.rows;
 if(!Array.isArray(rows)||rows.length!==4)errors.push("EXPERT_FOUR_ROWS_REQUIRED");
 else rows.forEach((row,i)=>{
  if(row?.key!==KEYS[i]||!statuses.has(row?.status)||trim(row?.reason).length<25||trim(row?.reason).length>1800)
   errors.push("EXPERT_ROW_INVALID_"+KEYS[i]);
 });
 if(d?.explicitOverride!==true)errors.push("EXPLICIT_EXPERT_AUTHORITY_REQUIRED");
 if(trim(input?.caseId).length<2||trim(input?.caseId).length>200||!trim(input?.subject)||!trim(input?.scope))
  errors.push("EXPERT_CASE_IDENTITY_INVALID");
 if(!Array.isArray(input?.parcelIds)||input.parcelIds.length>100)errors.push("EXPERT_PARCELS_INVALID");
 return errors;
}
export function normalizeExpertDecision(input){
 const d=input.decision;
 return {
  mode:"independent_expert",expert:trim(d.expert),panelId:Number(d.panelId),
  panelTitle:KT109_ROUTE_BY_ID.get(Number(d.panelId)).title,
  rows:d.rows.map(x=>({key:x.key,status:x.status,reason:trim(x.reason)})),
  legalGrounds:trim(d.legalGrounds),caseGrounds:trim(d.caseGrounds),reasoning:trim(d.reasoning),
  explicitOverride:true,
  reviewer:{verdict:trim(input.reviewer?.verdict).slice(0,30),
   findings:Array.isArray(input.reviewer?.findings)?input.reviewer.findings.slice(0,12).map(x=>trim(x).slice(0,1000)):[]},
  author:{draft:trim(input.author?.draft).slice(0,12000),
   issueCodes:Array.isArray(input.author?.issueCodes)?input.author.issueCodes.slice(0,12).map(x=>trim(x).slice(0,140)):[]}
 };
}
export function expertStage4Text(d){
 return [
  ...d.rows.map((r,i)=>LABELS[i]+": "+r.status+" — "+r.reason),
  "ВОДЕЩО ПРЕДЛОЖЕНИЕ: Самостоятелна експертна преценка. "+d.reasoning,
  "ИЗБРАН ПАНЕЛ: "+String(d.panelId).padStart(2,"0")+" — "+d.panelTitle,
  "ЗАЩО ТОЗИ ПАНЕЛ: "+d.reasoning,
  "ЗАЩО НЕ АЛТЕРНАТИВИТЕ: Компетентният експерт е избрал посоченото административно действие въз основа на представените индивидуални мотиви и относимите правни предпоставки.",
  "Фактическа основа",
  d.caseGrounds,
  "Нормативни предпоставки и граници на проверката",
  d.legalGrounds,
  "Мотивирано предложение",
  d.reasoning,
  "Данни за експертна проверка",
  "Самостоятелното решение е взето от експерта с посочен служебен идентификатор, независимо от предложенията на двата AI механизма. Не удостоверява издаден административен акт."
 ].join("\n");
}
