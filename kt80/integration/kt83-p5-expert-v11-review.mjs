/**
 * KT83 P5: Translate the expert-reviewed, source-bound Stage 4 packet into
 * the case-specific V11 review. NO external rules, AI-proposed competence,
 * route selection, or automatic approval.
 */
import {assessStage4} from './stage4-independent-legal-engine.mjs';
import {verifiedReference} from './v11-trusted-source-registry.mjs';
const clean=x=>typeof x==='string'?x.trim():'';
const fail=s=>{throw new TypeError(s)};
const copy=x=>JSON.parse(JSON.stringify(x));
export function prepareExpertV11Review({
 context,packet,existingStage4,authority,expertApproved=false,
 independentCompetenceAudit=null
}={}){
 if(!clean(context?.caseId)||!Number.isInteger(context.generation)||
    !Number.isInteger(context.evidenceRevision)||!clean(context.subject)||
    !clean(context.scope)||context.subjectConfirmed!==true||
    context.scopeConfirmed!==true)
  fail('Потвърдете предмета, обхвата и идентичността на преписката.');
 if(!packet||!Array.isArray(packet.rules)||!packet.rules.length||
    !Array.isArray(packet.evidence)||!packet.evidence.length)
  fail('Не са удостоверени експертни хипотези и факти от V11.');
 if(expertApproved!==true)
  fail('Липсва изрично експертно потвърждение на нормативната преценка.');
 const name=clean(authority?.name),reason=clean(authority?.reason);
 const sourceId=clean(authority?.sourceId),sourceLocation=clean(authority?.sourceLocation);
 if(!name||!reason||!sourceId||!sourceLocation||!clean(authority?.registryId))
  fail('Компетентността изисква отделно основание, доказателство и експертен мотив.');
 let ref;
 try{ref=verifiedReference(authority.registryId)}
 catch(_){fail('Източникът за компетентността не е проверен в MASTER V11.')}
 // A valid SHA-256 V11 citation does NOT by itself establish jurisdiction.
 // A separate case-specific, independent competence attestation is mandatory.
 if(!independentCompetenceAudit||
    independentCompetenceAudit.verified!==true||
    independentCompetenceAudit.caseId!==context.caseId||
    independentCompetenceAudit.generation!==context.generation||
    independentCompetenceAudit.evidenceRevision!==context.evidenceRevision||
    clean(independentCompetenceAudit.subject)!==context.subject||
    clean(independentCompetenceAudit.scope)!==context.scope||
    clean(independentCompetenceAudit.authority)!==name||
    independentCompetenceAudit.registryId!==authority.registryId||
    independentCompetenceAudit.articleSha256!==ref.articleSha256||
    independentCompetenceAudit.archiveSha256!==ref.archiveSha256||
    clean(independentCompetenceAudit.sourceId)!==sourceId||
    clean(independentCompetenceAudit.sourceLocation)!==sourceLocation||
    !clean(independentCompetenceAudit.reviewerSource))
  fail('Няма независима, индивидуална проверка на материалната и териториалната компетентност. Предложение: удостоверете основанията от MASTER V11 и конкретната преписка.');
 const stage4=assessStage4({
  confirmedSubject:context.subject,scopeConfirmed:true,
  evidence:packet.evidence,rules:packet.rules
 });
 if(!stage4.readyForStage5Draft||stage4.legalFindings.some(
    f=>f.state==='disputed'||f.state==='undetermined'))
  fail('Непълните или спорните правни предпоставки не могат да дадат формална готовност.');
 // Never accept an old panel evaluation for a changed set of facts or rules.
 if(!existingStage4||JSON.stringify(stage4)!==JSON.stringify(existingStage4))
  fail('Предходната нормативна проверка е остаряла; проверете отново фактите.');
 if(!stage4.legalFindings.some(f=>f.state==='supported'))
  fail('Липсва удостоверена приложима правна хипотеза.');
 return Object.freeze({
  caseId:context.caseId,generation:context.generation,
  evidenceRevision:context.evidenceRevision,
  subject:context.subject,scope:context.scope,expertConfirmed:true,
  legalFacts:copy(packet.evidence),rules:copy(packet.rules),
  confirmedCompetence:name,
  competenceEvidence:[{
   factId:'EXPERT_COMPETENCE_REVIEW',sourceId,
   archiveOrDossierOrigin:ref.archivePath,
   sourceLocation,legalReference:ref,
   expertReason:reason,independentAuditSource:independentCompetenceAudit.reviewerSource
  }]
 });
}
