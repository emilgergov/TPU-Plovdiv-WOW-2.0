/**
 * WOW V61.2 — provenance-first independent legal hypothesis packet.
 * This is NOT a legal rule catalogue, a procedure router, or legal approval.
 * An expert must independently construct each hypothesis from the locked V11.
 */
import {verifiedReference} from './v11-trusted-source-registry.mjs';
const trim=s=>typeof s==='string'?s.trim():'';
const unique=arr=>Array.isArray(arr)&&new Set(arr).size===arr.length;
const FACT=/^[a-zA-Z0-9_:-]{1,100}$/;
function factIds(input,name){
 if(!Array.isArray(input)||!input.length||!unique(input)||input.some(x=>typeof x!=='string'||!FACT.test(x)))
  throw new TypeError(name+': нужен е непразен списък с уникални идентификатори на факти');
 return input;
}
export function compileExpertHypotheses(entries){
 if(!Array.isArray(entries)||entries.length>32)throw new TypeError('Допускат се най-много 32 независими правни хипотези');
 const ids=new Set(),rules=[];
 for(const entry of entries){
  if(!entry||typeof entry!=='object'||Array.isArray(entry))
   throw new TypeError('Правната хипотеза трябва да е обект');
  const {id,title,registryId,requirements,exceptions,exceptionAudit,missingFactProposal,
   supportedProposal,notSupportedProposal}=entry;
  if(!FACT.test(id||'')||ids.has(id)||!trim(title)||!trim(missingFactProposal))
   throw new TypeError('Липсва независима идентичност, наименование или действие при недостиг на доказателства');
  ids.add(id);
  const requires=factIds(requirements,'Положителни предпоставки');
  if(!Array.isArray(exceptions)||!unique(exceptions)||exceptions.some(x=>typeof x!=='string'||!FACT.test(x)))
   throw new TypeError('Невалиден списък на изключенията');
  if(requires.some(x=>exceptions.includes(x)))throw new TypeError('Фактът не може да е едновременно предпоставка и изключение');
  if(!exceptionAudit||!['listed','no_known_exceptions'].includes(exceptionAudit.status)||
    !trim(exceptionAudit.sourceId)||!trim(exceptionAudit.sourceLocation)||
    !trim(exceptionAudit.reason)||exceptionAudit.status==='no_known_exceptions'&&exceptions.length||
    exceptionAudit.status==='listed'&&!exceptions.length)
   throw new TypeError('Изключенията трябва да бъдат документално прегледани и изрично описани');
  if(!trim(supportedProposal)||!trim(notSupportedProposal))
   throw new TypeError('Нужни са конкретни предложения и за двата възможни изхода');
  const legalBasis=verifiedReference(registryId);
  // No priority or legal routing is inferred from the order of entries.
  const condition={all:[
   ...requires.map(fact=>({fact})),
   ...exceptions.map(fact=>({not:{fact}}))
  ]};
  rules.push(Object.freeze({
   id,title,legalBasis,condition,
   missingFactProposal, supportedProposal,notSupportedProposal,
   exceptionAudit:Object.freeze({...exceptionAudit})
  }));
 }
 return Object.freeze(rules);
}
export function validateFactLedger(entries,rules){
 if(!Array.isArray(entries)||entries.length>300)
  throw new TypeError('Фактическите доказателства трябва да са масив от най-много 300 записа');
 const all=new Set(rules.flatMap(r=>{
  const walk=x=>x.fact?[x.fact]:x.not?walk(x.not):x.all?x.all.flatMap(walk):[];
  return walk(r.condition);
 }));
 const ledger=[];
 for(const e of entries){
  if(!e||!all.has(e.factId)||!['true','false','unknown','conflict'].includes(e.value)||
   !trim(e.sourceId)||!trim(e.sourceType)||!trim(e.sourceLocation)||
   !trim(e.reason))
   throw new TypeError('Недоказан факт, несъществуваща предпоставка или липсващ източник и експертен мотив');
  ledger.push(Object.freeze({factId:e.factId,value:e.value,sourceId:e.sourceId,
   sourceType:e.sourceType,sourceLocation:e.sourceLocation,
   observedAt:trim(e.observedAt)}));
 }
 return Object.freeze(ledger);
}
export function createCaseAssessmentPacket({hypotheses=[],facts=[]}={}){
 const rules=compileExpertHypotheses(hypotheses);
 const evidence=validateFactLedger(facts,rules);
 return Object.freeze({rules,evidence,verifiedHypothesisCount:rules.length,
  notAProceduralDecision:true,automaticIssueAllowed:false});
}
