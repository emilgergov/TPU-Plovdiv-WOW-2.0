/**
 * KT83 ПНИ-V3: free hypothesis exploration; strict, source-first verification.
 *
 * This module NEVER selects a preferred law or procedure, and does not
 * generate legal hypotheses. It audits externally proposed draft hypotheses,
 * whether provided by an expert or a separately connected AI model.
 * Its outputs remain RESEARCH DRAFTS until independently approved legal
 * conditions and complete normative coverage are established.
 */
import {assertVerifiedReference} from '../integration/v11-trusted-source-registry.mjs';
const trim=x=>typeof x==='string'?x.trim():'';
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
export const EXPLORATORY_STATUS='НЕПОТВЪРДЕНА ПРАВНА ХИПОТЕЗА';
const ALLOWED=new Set(['id','question','reasoning','supporting','contrary','alternatives','unknowns','proposedChecks','sourceType']);
const SOURCES=new Set(['AI_DRAFT','EXPERT_DRAFT']);
function oneSource(ref){
  if(!ref||typeof ref!=='object'||Array.isArray(ref))return null;
  try{assertVerifiedReference(ref);return ref;}catch{return null;}
}
function plainEntries(x,limit=16){
 if(!Array.isArray(x))return [];
 return x.slice(0,limit).map(y=>typeof y==='string'?trim(y):'').filter(Boolean);
}
export function auditExploratoryHypotheses({confirmedSubject,scopeConfirmed,candidates,normalizedEvidence=[],normativeCoverageComplete=false}){
  const subject=trim(confirmedSubject);
  if(!subject||scopeConfirmed!==true){
    return Object.freeze({status:'SUBJECT_UNCONFIRMED',findings:[],readyForStage5Draft:false,allowFormalProcedure:false,
      nextAction:'Предложение: потвърдете предмета и обхвата; правните предположения не се оценяват преди това.'});
  }
  if(!Array.isArray(candidates)||!Array.isArray(normalizedEvidence))
    throw new TypeError('Хипотези и доказателства трябва да бъдат масиви');
  if(candidates.length>32)throw new TypeError('Допустими са най-много 32 изследователски хипотези наведнъж');
  const evidenceIds=new Set(normalizedEvidence.map(e=>trim(e?.sourceId)).filter(Boolean));
  const ids=new Set();
  const findings=candidates.map((c,i)=>{
    if(!c||typeof c!=='object'||Array.isArray(c)||
       Object.keys(c).some(k=>!ALLOWED.has(k)))
      throw new TypeError('Недопустим изследователски вход: няма право да задава процедура, такса, тегло или приоритет');
    const id=trim(c.id)||'Х'+(i+1);
    if(ids.has(id))throw new TypeError('Повтаряща се хипотеза: '+id);
    ids.add(id);
    if(!SOURCES.has(c.sourceType))
      throw new TypeError('Не е установен произходът на изследователската хипотеза');
    const supporting=Array.isArray(c.supporting)?c.supporting:[];
    const contrary=Array.isArray(c.contrary)?c.contrary:[];
    const independentRefs=[...supporting,...contrary].map(x=>oneSource(x?.legalReference)).filter(Boolean);
    const supportedFacts=supporting.filter(x=>evidenceIds.has(trim(x?.evidenceSourceId)));
    const contraryFacts=contrary.filter(x=>evidenceIds.has(trim(x?.evidenceSourceId)));
    const problems=[];
    if(!trim(c.question))problems.push('Липсва правен въпрос');
    if(!trim(c.reasoning))problems.push('Липсват мотиви');
    if(!independentRefs.length)problems.push('Няма удостоверен правен източник V11');
    if(!supportedFacts.length)problems.push('Няма свързано доказателство от преписката');
    if(!contrary.length)problems.push('Не са изложени опровергаващи основания — проверката за опровержение е непълна');
    else if(!contraryFacts.length)problems.push('Опровергаващите основания не са свързани с конкретно доказателство');
    if(!plainEntries(c.alternatives).length)problems.push('Не са разгледани конкуриращи се хипотези');
    if(!plainEntries(c.proposedChecks).length)problems.push('Липсва предложение за независима проверка');
    if(!normativeCoverageComplete)problems.push('Пълнотата на нормативния граф не е удостоверена');
    return Object.freeze({
      id,question:trim(c.question),status:EXPLORATORY_STATUS,
      reasoning:trim(c.reasoning),sourceType:c.sourceType,
      verifiedNormativeReferences:independentRefs.map(r=>({registryId:r.registryId,article:r.article})),
      matchedSupportingFacts:supportedFacts.length,matchedContraryFacts:contraryFacts.length,
      alternatives:plainEntries(c.alternatives),unknowns:plainEntries(c.unknowns),
      proposedChecks:plainEntries(c.proposedChecks),
      issues:problems,
      requiresIndependentReview:true,
      isLegallyEstablished:false,
      permittedForAdministrativeAct:false
    });
  });
  return Object.freeze({
    status:findings.length?'EXPLORATORY_REVIEW':'NO_HYPOTHESES',
    findings,
    readyForStage5Draft:false,
    allowFormalProcedure:false,
    nextAction:findings.length
      ?'Предложение: проверете конкуриращите се хипотези и изключенията спрямо удостоверените норми и доказателства; проект на процедура се допуска едва след независима нормативна и експертна приемка.'
      :'Предложение: изследвайте всички относими правни хипотези от V11, без предварително зададен член или процедура.'
  });
}
