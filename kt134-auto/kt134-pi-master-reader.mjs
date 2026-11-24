/**
 * KT134 read-only parcel enrichment from the existing KT77 PI MASTER.
 * The host passes a trusted existing lookup adapter; this module never reads
 * untrusted parcel coordinates, never fabricates a geometry intersection.
 * An archived cadastral profile remains historical evidence, not current GIS.
 */
const txt=x=>String(x??'').trim();
const cad=/\b\d{5}\.\d+\.\d+\b/gu;
const need=(ok,msg)=>{if(!ok)throw Error(msg)};
const unique=a=>[...new Set(a)];
export function createKT134PIMasterReader({lookup,sourceMetadata,maxParcels=20}={}){
 need(typeof lookup==='function','Липсва ПИ MASTER справка');
 need(sourceMetadata?.schema==='kt77-pi-master-browser-v1'&&
  sourceMetadata.status==='VERIFIED'&&
  Number.isInteger(sourceMetadata.total_unique_parcels)&&
  txt(sourceMetadata.admin_as_of),'Липсва удостоверен индекс на ПИ MASTER');
 need(Number.isInteger(maxParcels)&&maxParcels>0&&maxParcels<=50,'Невалиден лимит за имоти');
 return async ({caseId,context}={})=>{
  need(txt(caseId)&&context?.caseId===caseId&&Array.isArray(context.documents),
   'Няма проверена текуща преписка');
  // An ownership deed may list many collateral parcels. If an explicitly
  // classified leading notice is available, source only its declared parcel
  // candidates. Without this provenance, keep a candidate-only scope.
  const primary=context.documents.filter(d=>['notification','investment_notice'].includes(d?.kind));
  const scoped=primary.length?primary:context.documents;
  const claims=unique(scoped.flatMap(d=>[
   ...txt(d.sourceText??d.text).matchAll(cad)
  ].map(m=>m[0])));
  need(claims.length>0,'Не е открит кадастрален идентификатор в документите');
  need(claims.length<=maxParcels,'Твърде много различни имоти — необходим е преглед на обхвата');
  const records=[];
  for(const id of claims){
   const row=await lookup(id);
   if(row?.cadnum!==id&&row?.profile?.cadnum!==id)
    throw Error('ПИ MASTER върна справка за друг имот');
   if(row?.status!=='FOUND'||!row.profile||
      !Number.isFinite(row.profile.area_m2)||
      !Array.isArray(row.profile.zz)||!Array.isArray(row.profile.zt))
     throw Error('Непълна или неподтвърдена справка за имот в ПИ MASTER');
   records.push(Object.freeze({
    cadnum:id,area_m2:row.profile.area_m2,
    settlement:txt(row.profile.settlement),
    municipality:txt(row.profile.municipality),
    province:txt(row.profile.province),
    zz:Object.freeze(row.profile.zz.map(z=>({...z}))),
    zt:Object.freeze(row.profile.zt.map(z=>({...z}))),
    source:'KT77 PI MASTER',archiveAdminAsOf:sourceMetadata.admin_as_of,
    spatialStatus:'historical_index_only'
   }));
  }
  return Object.freeze({
   caseId,verified:false,geometryVerified:false,
   subjectParcelsVerified:false,
   scopeBasis:primary.length?'classified_notice_only':'all_document_candidates_unconfirmed',
   sourceKind:'kt77_verified_historical_pi_master',
   archiveAdminAsOf:sourceMetadata.admin_as_of,
   parcels:Object.freeze(records),evidence:Object.freeze([]),
   note:'Архивният ПИ MASTER не замества актуален ГИС анализ и PDF1.'
  });
 };
}
