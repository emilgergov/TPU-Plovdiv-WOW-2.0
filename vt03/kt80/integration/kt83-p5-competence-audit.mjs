/* KT83 P5 — independent, restricted competence audit WITHIN the original V11.
 * This audit covers ONLY the OS ordinance Article 6a and RIOSV Plovdiv.
 * It is NOT a general jurisdiction engine or an alternative legal MASTER.
 * Seven ministerial exceptions and local territory must all be supported
 * by case-specific, explicitly reviewed facts. Unknown is never false.
 */
import {verifiedReference,assertVerifiedReference} from './v11-trusted-source-registry.mjs';
const tr=x=>String(x??'').trim();
const norm=x=>tr(x).normalize('NFKC').toLocaleLowerCase('bg').replace(/[“”"]/g,'');
const municipalityNames=[
 'Асеновград','Брезово','Калояново','Карлово','Кричим','Куклен','Марица',
 'Перущица','Пловдив','Първомай','Раковски','Родопи','Садово','Сопот',
 'Стамболийски','Съединение','Хисаря'
];
const municipalitySet=new Set(municipalityNames.map(norm));
const expected=Object.freeze({
 'OS_APPLICABLE':'true',
 'OS_TERRITORY_RIOSV_PLOVDIV':'true',
 'OS_MINISTER_EXCEPTION_A':'false',
 'OS_MINISTER_EXCEPTION_B':'false',
 'OS_MINISTER_EXCEPTION_V':'false',
 'OS_MINISTER_EXCEPTION_G':'false',
 'OS_MINISTER_EXCEPTION_D':'false',
 'OS_MINISTER_EXCEPTION_E':'false',
 'OS_MINISTER_EXCEPTION_ZH':'false'
});
const fail=(code,proposal)=>Object.freeze({verified:false,code,
 nextAction:'Предложение: '+proposal});
export function auditNaturaOsCompetence({
 context,competence,archived,packet,caseDocuments=[],verifySource=null
}={}){
 if(!context||!tr(context.caseId)||!Number.isInteger(context.generation)||
    !Number.isInteger(context.evidenceRevision)||!tr(context.subject)||!tr(context.scope)||
    context.subjectConfirmed!==true||context.scopeConfirmed!==true)
  return fail('CASE_UNVERIFIED','потвърдете предмета, обхвата и идентичността на преписката.');
 const basis=verifiedReference('N_OS_6A');
 const territoryBasis=verifiedReference('PRAVILNIK_RIOSV_TERRITORY');
 try{assertVerifiedReference(archived)}catch(_){
  return fail('LEGAL_REFERENCE_INVALID','проверете чл. 6а от Наредбата за ОС в MASTER V11.');
 }
 if(archived.registryId!=='N_OS_6A'||archived.articleSha256!==basis.articleSha256||
    norm(competence?.name)!==norm('Директор на РИОСВ – Пловдив'))
  return fail('OUT_OF_SCOPE','проверете приложимия специален ред и компетентния орган; този контрол обхваща само чл. 6а НОС.');
 if(!municipalitySet.has(norm(competence?.municipality)))
  return fail('TERRITORY_UNVERIFIED','уточнете общината по приложението към устройствения правилник на РИОСВ.');
 const walk=x=>x?.fact?[x.fact]:x?.not?walk(x.not):Array.isArray(x?.all)?
  x.all.flatMap(walk):Array.isArray(x?.any)?x.any.flatMap(walk):[];
 if(!Array.isArray(packet?.rules)||!packet.rules.some(r=>{
   try{
    if(r?.legalBasis?.registryId!=='N_OS_6A')return false;
    assertVerifiedReference(r.legalBasis);
    const included=new Set(walk(r.condition));
    return Object.keys(expected).every(id=>included.has(id));
   }catch(_){return false}
 }))
  return fail('OS_HYPOTHESIS_MISSING','включете всичките седем министерски изключения и териториалните условия в проверената правна хипотеза по чл. 6а НОС.');
 const facts=packet?.evidence;
 if(!Array.isArray(facts))return fail('FACTS_MISSING','добавете проверени доказателства за приложимостта и изключенията.');
 const documents=new Map((Array.isArray(caseDocuments)?caseDocuments:[])
   .filter(d=>tr(d?.file)&&d.state==='TEXT_EXTRACTED')
   .map(d=>[tr(d.file),d]));
 if(typeof verifySource!=='function')
  return fail('INDEPENDENT_SOURCE_CHECK_UNAVAILABLE','удостоверете произхода и надеждността на фактическите доказателства по преписката.');
 // No implicit false/negative from silence. Every exception must have its
 // own source-backed, unambiguous negative observation in the CURRENT case.
 const reviewed=[];
 for(const [id,value] of Object.entries(expected)){
  const matching=facts.filter(f=>f?.factId===id);
  if(matching.length!==1||matching[0].value!==value)
   return fail('CONDITION_UNPROVEN','проверете отделно '+id+' и приложете документно доказателство; липсата на данни не е отрицателен факт.');
  const fact=matching[0];
  if(!tr(fact.sourceId)||!tr(fact.sourceLocation)||!tr(fact.sourceType)||
     !documents.has(tr(fact.sourceId)))
   return fail('SOURCE_UNVERIFIED','проверете първичния документ и местоположението на доказателството за '+id+'.');
  let accepted=false;
  try{accepted=verifySource(Object.freeze({...fact}),context)===true}catch(_){accepted=false}
  if(!accepted)return fail('FACT_NOT_ATTESTED','удостоверете факта '+id+' спрямо прочетения оригинал на преписката.');
  reviewed.push(id);
 }
 const location=facts.find(f=>f?.factId==='OS_TERRITORY_RIOSV_PLOVDIV');
 if(!tr(competence.sourceId)||!tr(competence.sourceLocation)||
   !documents.has(tr(competence.sourceId))||
   location.sourceId!==competence.sourceId)
  return fail('TERRITORIAL_EVIDENCE_MISSING','свържете общината и компетентния орган с документ от текущата преписка.');
 // The case's explicit expert review remains indispensable.
 if(!tr(competence.reason)||!tr(competence.sourceId)||!tr(competence.sourceLocation))
  return fail('MOTIVATION_MISSING','мотивирайте материалната и териториалната компетентност.');
 return Object.freeze({
  verified:true,caseId:context.caseId,generation:context.generation,
  evidenceRevision:context.evidenceRevision,subject:context.subject,scope:context.scope,
  authority:competence.name,registryId:basis.registryId,
  articleSha256:basis.articleSha256,archiveSha256:basis.archiveSha256,
  sourceId:competence.sourceId,sourceLocation:competence.sourceLocation,
  reviewerSource:'CASE_FACTS_VERIFIED_BY_SOURCE:'+reviewed.length,
  territorialSource:territoryBasis.archivePath,
  territorialAppendixSha256:territoryBasis.articleSha256,
  municipality:competence.municipality,
  caveat:'Условна проверка само по чл. 6а НОС, въз основа на текущите удостоверени факти; не установява компетентност по други специални закони.'
 });
}
export const COMPETENCE_FACT_IDS=Object.freeze({...expected});
