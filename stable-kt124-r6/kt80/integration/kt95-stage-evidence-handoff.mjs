/* KT95 — case-bound evidence handoff: stages 1–3 -> stage 4.
 * A source claim is not a proven legal prerequisite. No legal citations are made here.
 * Read-only snapshot; never mutate the validated earlier-stage data. */
const str=x=>String(x??'').trim();
const freeze=x=>Object.freeze(x);
const fact=(id,value,status,origin,location,description)=>freeze({
 factId:id,value,status,sourceId:origin,sourceType:'stage-handoff',
 sourceLocation:location,description
});
export function collectStageEvidence(root=window){
 const s=root.KT80WorkflowState||{},p=s.subjectConfirmed||{},e=root.KT83NormativeBridge?.getEvidence?.()||{};
 const revision=root.KT82EvidenceInvalidation?.getRevision?.()??0;
 const caseId=str(s.caseCycleId);
 const generation=Number.isInteger(s.generation)?s.generation:0;
 const observations=[];
 const add=(...args)=>observations.push(fact(...args));
 const docs=Array.isArray(s.intake?.files)?s.intake.files:[];
 if(caseId){
  add('dossier_registered','true','established','KT83:caseCycleId','Етап 1','Уникален работен цикъл');
  add('dossier_documents_present',docs.length?'true':'unknown',docs.length?'partial':'missing',
   'KT83:intake.files','Етап 1',docs.length+' инвентаризирани документа; прочитът и автентичността се проверяват отделно');
 }
 add('subject_confirmed',p.expertConfirmed===true&&str(p.text)?'true':'unknown',
  p.expertConfirmed===true&&str(p.text)?'established':'missing',
  'KT83:subjectConfirmed','Етап 2','Потвърден предмет; не удостоверява техническите характеристики');
 add('scope_confirmed',p.scopeConfirmed===true&&str(p.scope)?'true':'unknown',
  p.scopeConfirmed===true&&str(p.scope)?'established':'missing',
  'KT83:scopeConfirmed','Етап 2','Потвърден обхват; непосочените дейности не се приемат за отсъстващи');
 const ids=Array.isArray(e.ids)?e.ids.map(str).filter(Boolean):Array.isArray(s.parcelsConfirmed?.ids)?s.parcelsConfirmed.ids.map(str).filter(Boolean):[];
 add('parcel_identifiers_confirmed',s.parcelsConfirmed?.expertConfirmed===true&&ids.length?'true':'unknown',
  ids.length?'partial':'missing','KT83:parcelsConfirmed','Етап 3',
  ids.length?'Имоти: '+ids.join(', '):'Няма потвърдени идентификатори');
 const pdf=e.pdfOK===true;
 add('pdf1_created',pdf?'true':'unknown',pdf?'partial':'missing','KT82:PDF1','Етап 3',
  'Наличност на PDF1; експертното удостоверяване на съдържанието е отделна проверка');
 const spatial=str(e.spatialClass).toUpperCase();
 if((spatial==='INSIDE'||spatial==='OUTSIDE')&&pdf){
  add('spatial_intersection',spatial==='INSIDE'?'true':'false','partial',
   'KT83:spatialClass','Етап 3','ГИС геометрично пресичане, не правен извод и не доказателство за липса на косвено въздействие');
 }else{
  add('spatial_intersection','unknown','missing','KT83:spatialClass','Етап 3',
   'Няма удостоверена пространствена квалификация');
 }
 const key=[caseId,generation,revision,str(p.text),str(p.scope),p.expertConfirmed===true,p.scopeConfirmed===true,
  ids.join(';'),spatial,pdf,docs.length].join('|');
 // Only established observations may be used as Boolean inputs by the legal evaluator.
 // Partial/missing observations remain visible and must not silently become legal truth.
 const legalInputs=observations.filter(f=>f.status==='established').map(f=>freeze({
  factId:f.factId,value:f.value,sourceId:f.sourceId,sourceType:f.sourceType,sourceLocation:f.sourceLocation
 }));
 return freeze({caseId,generation,evidenceRevision:revision,key,
  observations:freeze(observations),legalInputs:freeze(legalInputs),parcelIds:freeze(ids),
  completeForLegalReview:false,verifiedLegalPremises:0,
  missingLegalLink:'Изискват се конкретни правни предпоставки с първичен източник, точно място и експертна проверка.'});
}
export function verifyStageEvidence(packet,root=window){
 const fresh=collectStageEvidence(root);
 return !!packet&&packet.caseId===fresh.caseId&&packet.generation===fresh.generation&&
 packet.evidenceRevision===fresh.evidenceRevision&&packet.key===fresh.key;
}
