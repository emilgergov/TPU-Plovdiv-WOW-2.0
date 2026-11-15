/**
 * WOW KT83 V61.3 — independent stage-5 competence and fee gate.
 * An archive citation's integrity is NOT proof of its competence/applicability.
 * Verified V11 entries currently cover no signed-off case-specific competence rule.
 * Consequently the only lawful state here is "needs validation".
 */
import {proposeStage5} from './stage5-independent-proposal.mjs';
import V11Handoff from './kt83-vt01-v11-handoff.js';
const t=x=>typeof x==='string'?x.trim():'';
export const COMPETENCE_GATE_VERSION='V61.3';
export function draftWithCompetenceGate({stage4,authorityClaim=null,competenceEvidence=[],fee=null,
 caseContext=null,v11Verifier=null}={}){
 if(!stage4||stage4.schema!=='KT80_STAGE4_INDEPENDENT_V01')
  throw new TypeError('Липсва независима правна оценка от етап 4');
 if(!Array.isArray(competenceEvidence))throw new TypeError('Невалидни доказателства за компетентност');
 // Prevent premature "verified" competence from user-supplied free-form strings.
 // No competence rule currently attested by V11 whitelist and case-specific review.
 const claim=t(authorityClaim);
 const claimPresent=!!claim||competenceEvidence.length>0;
 // Recompute against the CURRENT case and the trusted V11 provider. A supplied
 // boolean, a stale review, or an archive citation alone cannot certify competence.
 const verified=caseContext&&v11Verifier?
  V11Handoff.assess(caseContext,v11Verifier):null;
 const caseVerified=verified?.ok===true&&verified.competenceVerified===true&&
  verified.provisions?.length>0&&
  stage4.confirmedSubject===caseContext.subject&&stage4.readyForStage5Draft===true;
 const limitedV11=caseVerified&&verified.provisions.every(p=>p.documentId==='N_OS_6A');
 const proposal=proposeStage5({stage4,confirmedCompetence:null,competenceEvidence:[],fee:null});
 const findings=stage4.legalFindings||[];
 const unresolved=findings.filter(x=>['undetermined','disputed'].includes(x.state));
 const additional=[
  limitedV11?'Има индивидуално удостоверена проверка по чл. 6а от Наредбата за ОС за текущата преписка; тя не установява компетентност за други специални режими.':
   claimPresent?'Посочен е възможен компетентен орган, но материалната и териториалната му компетентност не са нормативно удостоверени за тази преписка.':'Няма удостоверен компетентен орган.',
  limitedV11?'Предложение: използвайте удостовереното основание само в неговия проверен обхват; определете конкретната форма на документа след отделна експертна преценка.':
   'Предложение: проверете компетентността, специалните основания и изключенията чрез конкретните документи и редакции на заключения архив V11 и фактическите данни по преписката.',
  fee!=null?'Посочена е такса, но приложимостта, освобождаванията и редакцията на тарифата към датата не са удостоверени. Не е начислена такса.':'Не е определена такса.',
  unresolved.length?'Предложение: изяснете спорните или непотвърдени правни предпоставки, преди да определяте процедура.':'Няма отбелязани спорни правни предпоставки в текущия ограничен набор; това не удостоверява изчерпателност на всички приложими режими.'
 ];
 return Object.freeze({
  ...proposal,competentAuthority:null,tariff:null,readyForFormalDraft:false,
  authorityVerification:limitedV11?'VERIFIED_FOR_OS_6A_REVIEW_ONLY':'NOT_ESTABLISHED_BY_CASE_AND_V11',
  feeVerification:'NOT_ESTABLISHED_BY_CASE_AND_V11',
  sourceCoverageComplete:false,administrativeActIssued:false,requiresExpertAuthorization:true,
  limitedV11ReviewVerified:!!limitedV11,
  independentText:proposal.independentText+'\n\n'+additional.join('\n'),
  evidenceClaimed:claimPresent,
  pendingChecks:Object.freeze(additional)
 });
}
