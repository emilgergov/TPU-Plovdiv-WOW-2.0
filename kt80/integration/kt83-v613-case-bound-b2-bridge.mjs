/**
 * WOW KT83 / В61.3 — isolated evidence-first bridge to the accepted B2 evaluator.
 * No legal rule is generated from test-case vocabulary or the 22 output forms.
 * No dossier or private V11 ZIP is copied into GitHub.
 */
import {readKT80V598State, addEvidence, stage4RequestFromKT80} from './kt80-v598-case-evidence-adapter.mjs';
import {assessStage4} from './stage4-independent-legal-engine.mjs';
import {draftWithCompetenceGate} from './kt83-v613-competence-gate.mjs';
import {assertVerifiedReference} from './v11-trusted-source-registry.mjs';
const clean=x=>typeof x==='string'?x.trim():'';
const key=o=>JSON.stringify(o);
function snapshot(root){
 const w=root?.KT80WorkflowState||{};
 if(!clean(w.caseCycleId)||!Number.isSafeInteger(w.generation))
  throw new TypeError('Липсва индивидуализиран работен цикъл на преписката');
 const r=readKT80V598State(root);
 const evidenceRevision=root.KT82EvidenceInvalidation?.getRevision?.()??null;
 const spatial=root.KT83NormativeBridge?.getEvidence?.()||null;
 const signature=key({caseId:w.caseCycleId,generation:w.generation,evidenceRevision,
  subject:r.confirmedSubject,scope:r.scopeTextDraft,scopeConfirmed:r.scopeConfirmed,
  draftSubject:r.subjectTextDraft,
  rawParcel:root.document.getElementById('kt80ParcelInput')?.value||'',
  gisScenario:spatial?.scenario||'CONTEXT',
  ids:spatial?.ids||[],
  gisIdentity:spatial?.live===root.KT80FreeGISResults});
 return {caseId:w.caseCycleId,generation:w.generation,evidenceRevision,signature,record:r,liveRef:root.KT80FreeGISResults||null};
}
const validEvidence=e=>!!clean(e?.factId)&&
 ['true','false','unknown','conflict'].includes(e?.value)&&
 !!clean(e?.sourceId)&&!!clean(e?.sourceType)&&!!clean(e?.sourceLocation);
function buildRules(rules){
 if(!Array.isArray(rules))throw new TypeError('Очаква се списък от независимо проверени правни хипотези');
 return rules.map(rule=>{
  if(!rule||!rule.legalBasis)throw new TypeError('Липсва правен източник от V11');
  assertVerifiedReference(rule.legalBasis);
  return rule;
 });
}
export function createKT83V611Bridge(root){
 let evaluated=null;
 function invalidate(){evaluated=null;}
 function inspect(){const s=snapshot(root);return Object.freeze({
  caseId:s.caseId,generation:s.generation,evidenceRevision:s.evidenceRevision,
  confirmedSubject:s.record.confirmedSubject,scopeConfirmed:s.record.scopeConfirmed,
  parcelReview:s.record.parcelReview,ready:s.record.stage4Gate
 });}
 function assess({evidence=[],rules=[]}={}){
  invalidate();const s=snapshot(root);
  if(!s.record.stage4Gate)throw new TypeError('Предметът и обхватът не са потвърдени');
  if(!Array.isArray(evidence)||evidence.some(e=>!validEvidence(e)))
   throw new TypeError('Всеки факт изисква стойност, източник и точно място в доказателството');
  let record=s.record;
  for(const observation of evidence)record=addEvidence(record,observation);
  const confirmedRules=buildRules(rules);
  const outcome=assessStage4(stage4RequestFromKT80(record,confirmedRules));
  const now=snapshot(root);
  if(now.signature!==s.signature||now.liveRef!==s.liveRef)throw new Error('Преписката или ГИС резултатът се промени по време на нормативния анализ');
  evaluated={signature:s.signature,caseId:s.caseId,generation:s.generation,
   evidenceRevision:s.evidenceRevision,liveRef:s.liveRef,outcome};
  return outcome;
 }
 function propose({confirmedCompetence=null,competenceEvidence=[],fee=null}={}){
  if(!evaluated)throw new Error('Няма актуална независима оценка от етап 4');
  const now=snapshot(root);
  if(evaluated.signature!==now.signature||evaluated.liveRef!==now.liveRef||evaluated.caseId!==now.caseId||
     evaluated.generation!==now.generation||evaluated.evidenceRevision!==now.evidenceRevision){
   invalidate();throw new Error('Оценката е остаряла: възобновете етап 4 за текущата преписка');
  }
  if(!Array.isArray(competenceEvidence)||competenceEvidence.some(e=>
   !clean(e?.sourceId)||!clean(e?.factId)||!clean(e?.archiveOrDossierOrigin)))
   throw new TypeError('Компетентността изисква проверим доказателствен източник');
  const outcome=draftWithCompetenceGate({stage4:evaluated.outcome,authorityClaim:confirmedCompetence,competenceEvidence,fee});
  const after=snapshot(root);
  if(after.signature!==evaluated.signature||after.liveRef!==evaluated.liveRef)throw new Error('Преписката се промени по време на изготвяне на предложението');
  return outcome;
 }
 function getAssessment(){
  if(!evaluated)return null;
  try{const now=snapshot(root);if(now.signature!==evaluated.signature||now.liveRef!==evaluated.liveRef){invalidate();return null;}}
  catch{invalidate();return null}
  return evaluated.outcome;
 }
 return Object.freeze({inspect,assess,propose,getAssessment,invalidate,version:'KT83_V613'});
}
