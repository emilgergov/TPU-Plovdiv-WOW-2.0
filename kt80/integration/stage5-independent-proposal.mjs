/**
 * KT82 / KT80 V2 — stage 5 independent reasoned DRAFT.
 * Consumes the actual stage-4 legal findings. No Classic A/B, no route catalog.
 * V11 legal/tariff archive must be supplied via separately verified rules.
 */
import { CANONICAL_ARCHIVE, ARCHIVE_SHA256 } from './stage4-independent-legal-engine.mjs';
import { assertVerifiedReference } from './v11-trusted-source-registry.mjs';

export function convertTariffBgnToEur(bgn) {
  if (typeof bgn !== 'string' || !/^\d{1,12}(?:\.\d{1,2})?$/.test(bgn)) {
    throw new TypeError('Таксата се подава като положителна сума в левове, до два знака');
  }
  const [lev, st = ''] = bgn.split('.');
  const centsBgn = BigInt(lev) * 100n + BigInt(st.padEnd(2, '0'));
  // Exactly EUR 1 = BGN 1.95583, mandatory full five fractional digits.
  // Converting BGN-cents to EUR-cents: multiply by 100000 / 195583.
  const n = centsBgn * 100000n;
  const d = 195583n;
  const centsEur = (n * 2n + d) / (2n * d); // nearest cent; half upwards
  return (centsEur / 100n).toString() + '.' + (centsEur % 100n).toString().padStart(2, '0');
}

function requireArchiveRule(o, reference) {
  try { return assertVerifiedReference(o); }
  catch (e) { throw new TypeError('Липсва удостоверено основание от V11: '+reference+' — '+e.message); }
}

export function proposeStage5({ stage4, confirmedCompetence, competenceEvidence, fee }) {
  if (!stage4 || stage4.schema !== 'KT80_STAGE4_INDEPENDENT_V01' ||
      stage4.sourceArchive !== CANONICAL_ARCHIVE) {
    throw new TypeError('Невалиден резултат от независимия етап 4');
  }
  const supported = stage4.legalFindings.filter(f => f.state === 'supported');
  const disputed = stage4.legalFindings.filter(f =>
    f.state === 'undetermined' || f.state === 'disputed');
  const subject = stage4.confirmedSubject;
  const competenceVerified =
    typeof confirmedCompetence === 'string' && confirmedCompetence.trim().length > 0 &&
    Array.isArray(competenceEvidence) && competenceEvidence.length > 0 &&
    competenceEvidence.every(c => c && c.sourceId && c.factId && c.archiveOrDossierOrigin);
  const suggestions = [...stage4.proposals];
  if (!competenceVerified) suggestions.push(
    'Предложение: да се установи материалната и териториалната компетентност по доказателствата.');
  if (disputed.length) suggestions.push(
    'Предложение: да се изяснят противоречията и липсващите предпоставки преди категорична правна квалификация.');
  if (!supported.length) suggestions.push(
    'Предложение: да се провери още една законово обоснована хипотеза от V11.');
  let tariff = null;
  if (fee !== undefined && fee !== null) {
    const tariffCitation=requireArchiveRule(fee?.tariffSource, 'тарифа');
    const euroCitation=requireArchiveRule(fee?.euroLawSource, 'закон за еврото');
    if (!['TARIFA_1','TARIFA_22'].includes(tariffCitation.id) ||
        !['EURO_11','EURO_12','EURO_13','EURO_52'].includes(euroCitation.id)) {
      throw new TypeError('Неправилна комбинация от архивни правни основания за такса');
    }
    if (!supported.some(x => x.ruleId === fee?.linkedLegalFindingId)) {
      throw new TypeError('Таксата не е свързана с доказано приложимо правно основание');
    }
    const bgnAmount = fee.bgnAmount;
    tariff = {
      archivedBgnAmount: bgnAmount,
      calculatedEuroAmount: convertTariffBgnToEur(bgnAmount),
      rate: '1.95583',
      tariffLegalReference: fee.tariffSource.act + ', ' + fee.tariffSource.article,
      conversionLegalReference: fee.euroLawSource.act + ', ' + fee.euroLawSource.article,
      warning: 'Архивният размер на таксата подлежи на проверка за приложимост към конкретната услуга и дата.'
    };
  }
  const finalRecommendation = [
    subject ? 'Относно: ' + subject : 'Предметът се нуждае от експертно потвърждение.',
    'Самостоятелна нормативна преценка по архив V11:',
    ...supported.map(f => 'Правна хипотеза: ' + f.title +
      ' (' + f.basis.act + ', ' + f.basis.article + '). ' + f.proposedAction),
    ...disputed.map(f => 'Неизяснена предпоставка: ' + f.title +
      ' — ' + f.missingEvidenceIds.join(', ')),
    competenceVerified ? 'Компетентен орган (доказан): ' + confirmedCompetence.trim()
      : 'Компетентният орган още не е удостоверен.',
    'Предложение за следващо действие:',
    ...new Set(suggestions),
    tariff ? ('Архивна такса: ' + tariff.calculatedEuroAmount +
      ' евро (от ' + tariff.archivedBgnAmount + ' лв.).') : ''
  ].filter(Boolean).join('\n');
  return {
    schema: 'KT80_STAGE5_INDEPENDENT_DRAFT_V01',
    archive: CANONICAL_ARCHIVE,
    subject,
    legalHypothesesSupported: supported.length,
    legalHypothesesNeedEvidence: disputed.length,
    competentAuthority: competenceVerified ? confirmedCompetence.trim() : null,
    tariff,
    independentText: finalRecommendation,
    requiresExpertAuthorization: true,
    readyForFormalDraft:
      Boolean(stage4.readyForStage5Draft && competenceVerified && !disputed.length),
    administrativeActIssued: false
  };
}
