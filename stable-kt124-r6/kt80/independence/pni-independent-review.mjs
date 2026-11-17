/**
 * KT83 PNI V2 — sole safe entry point for independent legal applicability.
 * The page/case cannot supply a rule, predicate, priority, route, fee or
 * procedure. All legal conditions must come from independently approved
 * normative catalogue; currently ZERO. Unmapped = fail closed + next action.
 */
import { assessStage4 } from '../integration/stage4-independent-legal-engine.mjs';
import { assertVerifiedReference } from '../integration/v11-trusted-source-registry.mjs';
import { APPROVED_CONDITIONS, UNREVIEWED_COVERAGE, LEGAL_DOMAINS }
  from './pni-normative-conditions.mjs';

const exact=(obj,names)=>{
 if(!obj || typeof obj!=='object'||Array.isArray(obj)) throw new TypeError('Невалиден обект от преписката');
 const wrong=Object.keys(obj).filter(k=>!names.includes(k));
 if(wrong.length)throw new TypeError('Невалиден канал за управление на нормативната логика: '+wrong.join(', '));
};
function resolveVerifiedRule(template) {
 if(!template || template.review?.status!=='APPROVED_BY_EXPERT' ||
    !template.review?.approvedBy || !template.review?.sourceOnly ||
    !template.legalBasis || !template.condition ||
    !template.coverageId)throw new TypeError('Правно условие без независима нормативна и експертна приемка');
 assertVerifiedReference(template.legalBasis);
 return {
  id:template.id,title:template.title,legalBasis:template.legalBasis,
  condition:template.condition,
  supportedProposal:template.supportedProposal,
  notSupportedProposal:template.notSupportedProposal,
  missingFactProposal:template.missingFactProposal
 };
}
function coverageComplete(c) {
 return c.statutesExhaustivelyMapped===true &&
  c.exceptionsExhaustivelyMapped===true &&
  c.proceduralDependenciesMapped===true &&
  c.competenceMapped===true &&
  c.reviewedByQualifiedExpert===true;
}
export function reviewIndependently({confirmedSubject,scopeConfirmed,evidence}) {
 // Case input is only these fields; caller-supplied rules, results and
 // preferred proceedings are never accepted by this entry point.
 const data=arguments[0];
 exact(data,['confirmedSubject','scopeConfirmed','evidence']);
 const subject=typeof confirmedSubject==='string'?confirmedSubject.trim():'';
 const recorded=Array.isArray(evidence)?evidence:[];
 if(!Array.isArray(evidence)) throw new TypeError('Липсват структурирани доказателства от преписката');
 const approved=APPROVED_CONDITIONS.map(resolveVerifiedRule);
 if(approved.length && !coverageComplete(UNREVIEWED_COVERAGE))
  throw new TypeError('Нормативният граф е непълен и не е допуснат за автоматично приложение');
 const evaluation=assessStage4({
  confirmedSubject:subject,
  scopeConfirmed:scopeConfirmed===true,
  evidence:recorded,
  rules:approved
 });
 // No derived legal conclusion may be released while independent
 // source-only completeness and legal expert review are unproven.
 const eligible=approved.length>0 && coverageComplete(UNREVIEWED_COVERAGE);
 return Object.freeze({
  ...evaluation,
  schema:'KT83_PNI_SOURCE_FIRST_EVALUATION_V2',
  normativeCoverageComplete:eligible,
  readyForStage5Draft:eligible && evaluation.readyForStage5Draft,
  eligibilityForStage5FinalAct:false,
  reviewedLegalDomains:LEGAL_DOMAINS.map(x=>x.id),
  proposals:[...evaluation.proposals,
   ...(eligible?[]:['Предложение: да се установят и удостоверят всички относими нормативни предпоставки, изключения, компетентност и зависимости по V11, преди определяне на процедура.'])],
  independence:'NO_CASE_DERIVED_RULES',
  disclaimer:'Незавършен нормативен граф: не определя приложима процедура и не препоръчва административен акт.'
 });
}
