/**
 * КТ83 / В1.4 — откриване на КАНДИДАТ-ХИПОТЕЗИ от потвърден предмет и обхват.
 *
 * Принцип: тематичният сигнал е основание за ПРОВЕРКА, не доказателство
 * за правна приложимост, включване в приложение № 2 или компетентност.
 * Не въвежда нови правни норми извън проверения индекс V11.
 */
import { lookupVerifiedArticle } from './v11-trusted-source-registry.mjs';

const clean=x=>typeof x==='string'?x.replace(/\s+/gu,' ').trim():'';
const detectors=Object.freeze([
  {tag:'строителство',rx:/стро(еж|ителств|ителен|ителн)|изграждан|реконструкц|разширен|преустрой/iu},
  {tag:'производство',rx:/производств|преработк|инсталац|цех|предприят/iu},
  {tag:'водовземане',rx:/сондаж|водовзем|кладенец|подземн[иа] вод|водочерп/iu},
  {tag:'отпадъци',rx:/отпадъц|депониран|третиран|рециклиран/iu},
  {tag:'услуги и транспорт',rx:/автосервиз|автомивк|паркинг|гараж|склад|логистич|пътен достъп|пътна връзка/iu},
  {tag:'земеползване',rx:/пуп|парцеларен план|предназначени|застрояван|урбанизир/iu},
]);
const FIELD_ID='kt83_annex2_screening_applicability';

export function discoverLegalHypotheses(record){
  if(!record||record.schema!=='KT80_V598_KT83_INPUT_ADAPTER_V01')
    throw new TypeError('Липсва валиден вход от КТ80');
  if(!record.confirmedSubject || record.scopeConfirmed!==true)
    return Object.freeze({status:'NEEDS_CONFIRMATION',candidates:[],
      nextAction:'Предложение: потвърдете предмета и обхвата в етап 2.'});
  const type=clean(record.dossierType);
  const subject=clean(record.confirmedSubject);
  const scope=clean(record.scopeTextDraft);
  const text=(subject+' '+scope).toLocaleLowerCase('bg');
  const found=detectors.filter(d=>d.rx.test(text)).map(d=>d.tag);
  const isInvestment=type==='INVESTMENT' || (!type && found.length>0);
  if(!isInvestment){
    return Object.freeze({status:'INSUFFICIENT_ARCHIVE_COVERAGE',candidates:[],
      nextAction:'Предложение: установете тематично относимите нормативни основания от V11 за вида на преписката; наличният индекс няма право да измисля разпоредби.'});
  }
  // ZOOS 93 is an EIA-screening CANDIDATE, not an automatic determination.
  // No structure can assert this condition true from matching words.
  const source=lookupVerifiedArticle('ZOOS_93');
  const candidate=Object.freeze({
    id:'kt83_ZOOS_93', registryId:source.id,
    title:'Кандидат за проверка: необходимост от преценяване на ОВОС',
    factId:FIELD_ID,
    signals:found,
    evidenceStatus:'unknown',
    missingPrerequisites:[
      'Приложение № 2 към ЗООС: категория и параметри на дейностите',
      'Пълният предмет и всички технологични, инфраструктурни и водни компоненти',
      'Изключения, свързани производства и компетентност'
    ],
    sourcePath:source.archivePath,
    legalReviewOnly:true
  });
  return Object.freeze({status:'CANDIDATE_ONLY',candidates:[candidate],
    nextAction:'Предложение: проверете фактическата приложимост на чл. 93 ЗООС по всички компоненти и приложенията към закона. Ключовите думи не доказват правна квалификация.'});
}
export function rulesFromDiscoveredHypotheses(discovery,verifiedReference){
  if(discovery?.status!=='CANDIDATE_ONLY')return [];
  return discovery.candidates.map(c=>({
    id:c.id,title:c.title,
    legalBasis:verifiedReference(c.registryId),
    condition:{fact:c.factId},
    supportedProposal:'Предложение: проверете всички основания и приложими изключения и мотивирайте необходимата процедура по чл. 93 ЗООС.',
    notSupportedProposal:'Предложение: изследвайте други относими правни основания от архив V11 и мотивирайте неприложимостта.',
    missingFactProposal:'Предложение: установете приложимата категория от приложенията към ЗООС и съберете доказателствата за всички дейности; не постановявайте процедурен извод само по заглавието.'
  }));
}
