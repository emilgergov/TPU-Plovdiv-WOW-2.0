/**
 * KT82 / KT80 Stage V1 – independent stage-4 legal evaluation.
 * B1 V11 locked; B2 expert-accepted, 2026-11-13.
 *
 * IMPORTANT: This is a pure integration module. It is not wired into the
 * production WOW entry point and must not access V27.35/Classic A/B data.
 * The case supplies evidence and validated rules FROM THE LOCKED V11.
 * No guessed legal grounds, no document-catalog route as an input.
 */

export const CANONICAL_ARCHIVE =
  'KT82_Normative_MASTER_V11_Tariff_Euro_2026-11-13.zip';
export const ARCHIVE_SHA256 =
  '8d3851affd72fb44b4d663920196e00ec317c8e45d36fc16c6ad6b0ce965226c';

const STATES = new Set(['true', 'false', 'unknown', 'conflict']);
const VALID = new Set(['supported', 'not_supported', 'undetermined', 'disputed']);
const ALLOWED_KEYS = new Set(['all', 'any', 'not', 'fact']);
const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

function safeText(s) { return typeof s === 'string' ? s.trim() : ''; }
function normalizeEvidence(evidence) {
  if (!Array.isArray(evidence)) throw new TypeError('evidence трябва да е масив');
  const groups = new Map();
  for (const e of evidence) {
    const id = safeText(e?.factId);
    if (!id) throw new TypeError('Всеки факт изисква factId');
    if (!STATES.has(e?.value)) throw new TypeError('Недопустима стойност за факт: ' + id);
    if (!safeText(e?.sourceId) || !safeText(e?.sourceType)) {
      throw new TypeError('Всеки факт изисква източник: ' + id);
    }
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(Object.freeze({
      factId: id, value: e.value,
      sourceId: e.sourceId, sourceType: e.sourceType,
      sourceLocation: safeText(e.sourceLocation),
      observedAt: safeText(e.observedAt)
    }));
  }
  const facts = {};
  for (const [id, observations] of groups) {
    const values = new Set(observations.map(o => o.value));
    let value = 'unknown';
    if (values.has('conflict') || (values.has('true') && values.has('false'))) {
      value = 'conflict';
    } else if (values.has('unknown') && values.size === 1) {
      value = 'unknown';
    } else if (values.has('true') && values.size === 1) {
      value = 'true';
    } else if (values.has('false') && values.size === 1) {
      value = 'false';
    } // Mixed known and unknown stays unknown; never infer certainty.
    facts[id] = Object.freeze({ value, observations });
  }
  return Object.freeze(facts);
}

function and(values) {
  if (values.includes('disputed')) return 'disputed';
  if (values.includes('not_supported')) return 'not_supported';
  if (values.includes('undetermined')) return 'undetermined';
  return 'supported';
}
function or(values) {
  if (values.includes('supported')) return 'supported';
  if (values.includes('disputed')) return 'disputed';
  if (values.includes('undetermined')) return 'undetermined';
  return 'not_supported';
}
function negate(value) {
  if (value === 'supported') return 'not_supported';
  if (value === 'not_supported') return 'supported';
  return value;
}

function predicate(p, facts) {
  if (typeof p !== 'object' || !p || Array.isArray(p)) {
    throw new TypeError('Невалидно правно условие');
  }
  if (Object.keys(p).some(key => !ALLOWED_KEYS.has(key))) {
    throw new TypeError('Непозволен оператор в условие');
  }
  if (own(p, 'fact')) {
    if (typeof p.fact !== 'string' || Object.keys(p).length !== 1) {
      throw new TypeError('Невалиден идентификатор на факт');
    }
    const val = facts[p.fact]?.value ?? 'unknown';
    return ({
      true: 'supported',
      false: 'not_supported',
      unknown: 'undetermined',
      conflict: 'disputed'
    })[val];
  }
  if (own(p, 'all')) {
    if (!Array.isArray(p.all) || !p.all.length) throw new TypeError('Празно всички');
    return and(p.all.map(x => predicate(x, facts)));
  }
  if (own(p, 'any')) {
    if (!Array.isArray(p.any) || !p.any.length) throw new TypeError('Празно някое');
    return or(p.any.map(x => predicate(x, facts)));
  }
  if (own(p, 'not')) return negate(predicate(p.not, facts));
  throw new TypeError('Липсва правно условие');
}

function validateRule(rule) {
  if (!safeText(rule?.id) || !safeText(rule?.title) ||
      !safeText(rule?.legalBasis?.act) ||
      !safeText(rule?.legalBasis?.article) ||
      !safeText(rule?.legalBasis?.archivePath) ||
      !safeText(rule?.legalBasis?.archiveTextAnchor) ||
      rule.legalBasis.archive !== CANONICAL_ARCHIVE ||
      rule.legalBasis.archiveSha256 !== ARCHIVE_SHA256 ||
      rule.legalBasis?.verifiedAgainstV11 !== true ||
      !rule.condition) {
    throw new TypeError('Правното основание не е удостоверено от заключения V11');
  }
  if (!safeText(rule?.missingFactProposal)) {
    throw new TypeError('Няма предложение при непълни данни');
  }
}

export function assessStage4({ confirmedSubject, scopeConfirmed, evidence, rules }) {
  const subject = safeText(confirmedSubject);
  const facts = normalizeEvidence(evidence);
  if (!Array.isArray(rules)) throw new TypeError('Липсва списък с проверени правни хипотези');
  const propositions = [];
  const findings = [];
  if (!subject) propositions.push('Предложение: експертът да потвърди предмета на инвестиционното предложение.');
  if (scopeConfirmed !== true) propositions.push('Предложение: да се потвърди обхватът на предложението.');
  for (const rule of rules) {
    validateRule(rule);
    const state = predicate(rule.condition, facts);
    if (!VALID.has(state)) throw new Error('Невалидна правна оценка');
    const finding = {
      ruleId: rule.id, title: rule.title, state,
      basis: { ...rule.legalBasis },
      subject: subject || null,
      evidenceIds: [...new Set(collectIds(rule.condition))],
      missingEvidenceIds: [...new Set(collectIds(rule.condition)
        .filter(id => !facts[id] || ['unknown', 'conflict'].includes(facts[id].value)))],
      proposedAction: state === 'supported'
        ? (safeText(rule.supportedProposal) || rule.missingFactProposal)
        : state === 'not_supported'
          ? (safeText(rule.notSupportedProposal) ||
              'Предложение: да се провери друга приложима правна хипотеза.')
          : rule.missingFactProposal
    };
    findings.push(finding);
    propositions.push(finding.proposedAction);
  }
  if (!rules.length) propositions.push(
    'Предложение: да се установят относимите основания от нормативния архив V11.');
  const blocked = !subject || scopeConfirmed !== true ||
    findings.some(f => ['undetermined','disputed'].includes(f.state));
  const uniqueProposals = [...new Set(propositions)];
  return {
    schema: 'KT80_STAGE4_INDEPENDENT_V01',
    sourceArchive: CANONICAL_ARCHIVE,
    confirmedSubject: subject || null,
    scopeConfirmed: scopeConfirmed === true,
    legalFindings: findings,
    evidence: facts,
    proposals: uniqueProposals,
    readyForStage5Draft: !blocked && findings.some(f => f.state === 'supported'),
    eligibilityForStage5FinalAct: false, // Final act requires stage-5 expert authorization.
    warning: 'Етап 4 не определя предварително документ и не издава акт. Експертният контрол е задължителен.'
  };
}

function collectIds(p) {
  if (own(p, 'fact')) return [p.fact];
  if (own(p, 'not')) return collectIds(p.not);
  if (own(p, 'all')) return p.all.flatMap(collectIds);
  if (own(p, 'any')) return p.any.flatMap(collectIds);
  throw new TypeError('Непозволено условие');
}
