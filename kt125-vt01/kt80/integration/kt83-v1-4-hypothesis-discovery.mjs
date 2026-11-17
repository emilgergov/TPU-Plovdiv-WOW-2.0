/**
 * КТ83 — В1.4 предпазна корекция / НЕЗАВИСИМОСТ ОТ ТЕСТОВИТЕ ПРЕПИСКИ.
 *
 * Нито ТЕСТ_2, нито което и да е тестово дело може да задава
 * предпочитана правна хипотеза, член, процедура, такса или изход.
 *
 * V11 article presence alone proves ONLY that text exists in the archive.
 * A universal, independent legal applicability index with verified mapping
 * is NOT yet available. Fail CLOSED: do not infer a legal hypothesis from
 * keyword patterns or an example of a prior tested case.
 */
const clean=x=>typeof x==='string'?x.replace(/\s+/gu,' ').trim():'';
export function discoverLegalHypotheses(record){
  if(!record||record.schema!=='KT80_V598_KT83_INPUT_ADAPTER_V01')
    throw new TypeError('Липсва валиден вход от КТ80');
  if(!clean(record.confirmedSubject)||record.scopeConfirmed!==true)
    return Object.freeze({status:'NEEDS_CONFIRMATION',candidates:[],
      nextAction:'Предложение: експертът да потвърди предмета и обхвата в етап 2.'});
  return Object.freeze({
    status:'AWAITING_UNBIASED_NORMATIVE_MAPPING',
    candidates:[],
    nextAction:'Предложение: проверете всички относими нормативни хипотези въз основа на предмета, обхвата и доказателствата, след изграждане на независим каталог от проверения архив V11. Няма автоматично предимство за конкретна процедура или законова разпоредба.',
    caseDerivedRulesForbidden:true,
    sourceLimit:'Наличният V11 индекс удостоверява текстове, но не определя самостоятелно пълната правна приложимост.'
  });
}
export function rulesFromDiscoveredHypotheses(discovery,verifiedReference){
  // The independent legal source-to-conditions mapping is still pending.
  // Do not derive even a single legal rule from dossier-specific tests.
  if(!discovery||!Array.isArray(discovery.candidates)||discovery.candidates.length)
    throw new TypeError('Автоматичните правни хипотези не са удостоверени от независим нормативен анализатор.');
  return [];
}
