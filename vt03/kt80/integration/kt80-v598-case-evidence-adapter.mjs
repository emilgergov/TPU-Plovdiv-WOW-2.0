/**
 * KT83 V1.2 — read-only bridge to the LAST KT82 V59.8 administrative test UI.
 * This adapter is intentionally not loaded by production or stable V27.35.
 * It never turns unconfirmed DOM values or a GIS preview into legal evidence.
 */
const clean = x => typeof x === 'string' ? x.replace(/\s+/gu,' ').trim() : '';
const copy = o => JSON.parse(JSON.stringify(o));
const norm = x => clean(x).toLocaleLowerCase('bg');

export function readKT80V598State(root) {
  const doc = root?.document;
  if(!doc || typeof doc.getElementById !== 'function')
    throw new TypeError('Липсва административният екран КТ80');
  const byId = id => doc.getElementById(id);
  const wf=root.KT80WorkflowState||{};
  const universal=root.KT82UniversalStage2Result||null;
  const subjectField=clean(byId('kt80SubjectText')?.value);
  const scopeField=clean(byId('kt80ScopeText')?.value);
  const subjectApproved=clean(wf.subjectConfirmed?.text);
  const scopeApproved=clean(wf.subjectConfirmed?.scope);
  const confirmedSubject=subjectApproved &&
    norm(subjectApproved) === norm(subjectField) ? subjectApproved : null;
  const scopeConfirmed=Boolean(confirmedSubject && scopeApproved &&
    norm(scopeApproved) === norm(scopeField));
  const dossierType=clean(universal?.type)||null;
  const source= root.KT83NormativeBridge?.getEvidence?.() || null;
  const parcels=Array.isArray(source?.ids)?source.ids.filter(x=>typeof x==='string'):[];
  const gisMode=source?.scenario||'CONTEXT';
  const gisNotRequired=source?.gisNotRequired===true &&
      wf.parcelsConfirmed?.mode==='GIS_NOT_REQUIRED' &&
      wf.normativeGate?.decision==='NOT_REQUIRED' &&
      wf.normativeGate?.expertConfirmed===true;
  const parcelReview={
    parcelIds:[...parcels],gisMode,
    gisNotRequiredByExpert:gisNotRequired,
    gisGeometryValidated:source?.valid===true && source?.intersections===true,
    spatialConclusion:
      source?.valid===true && source?.intersections===true
        ? (source.spatialClass||'UNDETERMINED')
        : 'UNDETERMINED'
  };
  const confirmedAuthority=clean(byId('kt80Authority')?.value)||null;
  const expertLawConfirmed=byId('kt80LawConfirmed')?.checked===true;
  // The checkbox is NOT equivalent to a grounded competence source.
  return Object.freeze({
    schema:'KT80_V598_KT83_INPUT_ADAPTER_V01',
    dossierType,
    confirmedSubject,
    subjectTextDraft:subjectField||null,
    scopeConfirmed,
    scopeTextDraft:scopeField||null,
    parcelReview:Object.freeze(parcelReview),
    expertLawConfirmed,
    authorityCandidate:confirmedAuthority,
    competenceEvidence:[], // Must be supplied from dossier or V11, never guessed from select.
    legalFacts:[], // Only case-file / expert-validated evidence is permitted.
    stage4Gate: Boolean(confirmedSubject && scopeConfirmed),
    warning:'Предметът и обхватът се приемат само при точно съвпадение с експертно потвърдените; празно правно доказателство означава непроверено.'
  });
}

/** Evidence remains provenance-bound, with no silent promotion to proof. */
export function addEvidence(record, assertion) {
  if(record?.schema!=='KT80_V598_KT83_INPUT_ADAPTER_V01')
    throw new TypeError('Невалиден вход за етап 4');
  if(!assertion || !clean(assertion.factId) || !clean(assertion.sourceId) ||
     !clean(assertion.sourceType) ||
     !['true','false','unknown','conflict'].includes(assertion.value))
    throw new TypeError('Фактът няма удостоверен източник или състояние');
  return {...copy(record),legalFacts:[...copy(record.legalFacts),{
    factId:clean(assertion.factId), value:assertion.value,
    sourceId:clean(assertion.sourceId),
    sourceType:clean(assertion.sourceType),
    sourceLocation:clean(assertion.sourceLocation),
    observedAt:clean(assertion.observedAt)
  }]};
}

export function stage4RequestFromKT80(record, verifiedLegalRules) {
  if(record?.schema!=='KT80_V598_KT83_INPUT_ADAPTER_V01')
    throw new TypeError('Невалидна версия на административните данни');
  if(!Array.isArray(verifiedLegalRules))
    throw new TypeError('Правните хипотези трябва да са удостоверени по V11');
  return {
    confirmedSubject: record.confirmedSubject||'',
    scopeConfirmed: record.scopeConfirmed===true,
    evidence: copy(record.legalFacts),
    rules: copy(verifiedLegalRules)
  };
}
