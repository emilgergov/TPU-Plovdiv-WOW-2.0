/**
 * KT134 same-case spatial context combiner.
 * The authoritative GIS implementation retains sole power to declare an
 * actual geometry check. Historical KT77 parcels are supplemental and never
 * elevate unverified GIS status to verified.
 */
export function createKT134SpatialContext({readSpatial,readParcelIndex}={}){
 if(typeof readSpatial!=='function')throw Error('Липсва действителна ГИС услуга');
 if(typeof readParcelIndex!=='function')throw Error('Липсва ПИ MASTER източник');
 return async function readCaseSpatial(input){
  const [actual,archive]=await Promise.allSettled([
   readSpatial(input),readParcelIndex(input)
  ]);
  const verifiedActual=actual.status==='fulfilled'&&actual.value?.caseId===input.caseId
   &&actual.value.verified===true&&actual.value.geometryVerified===true;
  const gis=actual.status==='fulfilled'&&actual.value?.caseId===input.caseId?
   actual.value:null;
  const pi=archive.status==='fulfilled'&&archive.value?.caseId===input.caseId?
   archive.value:null;
  return Object.freeze({
   caseId:input.caseId,
   verified:verifiedActual,
   geometryVerified:verifiedActual&&gis.geometryVerified===true,
   evidence:gis&&Array.isArray(gis.evidence)?gis.evidence:[],
   actualGIS:gis,
   historicalPIMaster:pi,
   gaps:Object.freeze([
    ...(!gis?['Действителната ГИС справка не е налична за текущата преписка']:[]),
    ...(!pi?['Архивният ПИ MASTER не е наличен за текущата преписка']:[]),
    ...(gis&&!gis.geometryVerified?['Актуалната геометрична проверка не е удостоверена']:[])
   ]),
   note:'Архивният ПИ MASTER и актуалният геометричен анализ са различни източници; не се заместват.'
  });
 };
}
