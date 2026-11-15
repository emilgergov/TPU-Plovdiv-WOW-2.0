/* KT96: deterministic proposal from real evidence, with no fabricated legal finding.
 * Proposes a concrete next administrative action; expert approval remains separate.
 * Verified V11 references are candidates, not automatically applicable law. */
import {VERIFIED_ARTICLES} from './v11-trusted-source-registry.mjs';
const yes=(arr,id)=>arr.some(f=>f.factId===id&&f.status==='established'&&f.value==='true');
const settled=(arr,id)=>arr.find(f=>f.factId===id);
const text=x=>String(x??'').trim();
export function createCaseProposal(handoff,context,review=null){
 const facts=handoff?.observations||[],p=context?.p||{},s=context?.s||{};
 const subject=text(p.text),scope=text(p.scope),ids=Array.isArray(handoff?.parcelIds)?handoff.parcelIds:[];
 const kind=context?.kind;
 const missing=[];
 if(!yes(facts,'subject_confirmed'))missing.push({id:'subject_confirmed',label:'Потвърден предмет',origin:'Етап 2'});
 if(!yes(facts,'scope_confirmed'))missing.push({id:'scope_confirmed',label:'Потвърден обхват на дейностите',origin:'Етап 2'});
 if(kind==='investment'){
  missing.push({id:'annex_category',label:'Точна категория на дейността спрямо приложенията на ЗООС (ако има такава)',origin:'Доказателства от заявителя'});
  missing.push({id:'annex_threshold',label:'Количествени характеристики, мощности, капацитет и прагове, когато са относими',origin:'Преписка / технически документи'});
  missing.push({id:'annex_exceptions',label:'Проверка на относимите изменения и изключения по конкретната категория',origin:'MASTER V11 + факти'});
 }
 if(!ids.length&&!s.parcelsConfirmed?.notApplicable){
  missing.push({id:'parcel_evidence',label:'Удостоверено местоположение и териториален обхват',origin:'Етап 3'});
 }
 if(!review)missing.push({id:'legal_source_application',label:'Документално установена приложимост на всички съществени правни предпоставки и изключения',origin:'MASTER V11 + Етап 4'});
 const source=kind==='investment'&&VERIFIED_ARTICLES.ZOOS_93
  ?Object.freeze({registryId:'ZOOS_93',act:VERIFIED_ARTICLES.ZOOS_93.act,article:VERIFIED_ARTICLES.ZOOS_93.article,
   archivePath:VERIFIED_ARTICLES.ZOOS_93.archivePath,role:'възможно относимо основание за преценяване, приложимостта не е установена'})
  :null;
 const ready=!!review&&review.expertConfirmed===true;
 const basis=[subject?'Потвърден предмет: '+subject:'Предметът не е потвърден.',
  scope?'Потвърден обхват: '+scope:'Обхватът не е потвърден.',
  ids.length?'Имотни идентификатори: '+ids.join(', '):'Имотни идентификатори: не са предадени; проверете дали са необходими.',
  'Етапи 1–3: '+facts.filter(f=>f.status==='established').length+' установени, '+facts.filter(f=>f.status==='partial').length+' непълни, '+facts.filter(f=>f.status==='missing').length+' липсващи доказателствени позиции.'];
 const action=ready?'Експертна приемка на мотивирания проект и проверка на компетентността преди предаване към Етап 5.':
  kind==='investment'?'Подготовка на проект на писмо за конкретна допълнителна информация, необходима за правната квалификация на ИП, и паралелно изготвяне на условно становище по наличните доказателства.':
  'Подготовка на мотивирано искане за уточняване на решаващите факти и определяне на административното действие според вида на преписката.';
 const assessment=ready?'Налице е експертно приета доказателствена преценка за тази преписка.':
  'С наличните доказателства не е обосновано окончателно определяне на процедура. Това не означава, че процедура е неприложима.';
 const motive=source?'В проверения индекс V11 е наличен '+source.act+', '+source.article+
   ', но принадлежността на конкретното ИП към относимата категория и условията на нормата не са доказани.':
   'Липсва удостоверена, конкретно приложима разпоредба от изпълнимия индекс V11 за този вид преписка.';
 return Object.freeze({caseId:handoff?.caseId||'',revision:handoff?.evidenceRevision,
  action,assessment,motive,basis:Object.freeze(basis),missing:Object.freeze(missing.map(x=>Object.freeze(x))),
  candidateSource:source,legalConclusionReady:ready,finalProcedure:false});
}
