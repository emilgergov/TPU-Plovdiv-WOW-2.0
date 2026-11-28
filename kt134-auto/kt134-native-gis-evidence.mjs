/**
 * KT134 E3 adapter for the actual KT80/V27.35 browser GIS contract.
 * The source stores KT80FreeGISResults.verified=false; verification lives
 * on each result: verified_zone_intersections + intersection_verified_outside.
 * PDF1 is generated separately in the browser and MUST NOT be invented.
 */
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v:{};
const list=v=>Array.isArray(v)?v:[];
const str=v=>typeof v==='string'?v.trim():'';
const error=code=>{const e=new Error(code);e.code=code;throw e;};
const parcelId=v=>str(typeof v==='string'?v:v?.identifier||v?.cadastralId||v?.cadnum||v?.input||v?.id);
const unique=v=>[...new Set(v.filter(Boolean))];
function parcelRows(state,gis){
 const confirmed=state.parcelsConfirmed;
 const declared=list(Array.isArray(confirmed)?confirmed:obj(confirmed).parcels);
 const fromConfirmed=declared.filter(x=>parcelId(x))
  .map(x=>({...x,identifier:parcelId(x),sourceId:str(x.sourceId)||'KT126_CONFIRMED_PARCELS'}));
 const ids=unique([...fromConfirmed.map(x=>x.identifier),...list(gis.ids).map(str)]);
 const parcels=new Map(fromConfirmed.map(row=>[row.identifier,row]));
 for(const row of list(obj(state.intake).all_parcels)){
  const identifier=parcelId(row);
  if(identifier&&!parcels.has(identifier))parcels.set(identifier,{
   ...obj(row),identifier,sourceId:str(row?.sourceId)||'KT134_INTAKE_ALL_PARCELS',
   evidenceStatus:'DOCUMENT_CANDIDATE_NOT_EXPERT_CONFIRMED'
  });
 }
 for(const identifier of ids){
  if(!parcels.has(identifier))parcels.set(identifier,{
   identifier,sourceId:'KT80FreeGISResults',
   evidenceStatus:'GIS_SOURCE_ID_NOT_EXPERT_CONFIRMED'
  });
 }
 return {parcels:[...parcels.values()],ids};
}
function verifiedIntersectionRows(rows,ids){
 if(!ids.length||!rows.length)return false;
 if(rows.length!==ids.length)return false;
 const indexed=new Map();
 for(const v of rows){
  const id=parcelId(v);
  if(!id||indexed.has(id)||v.status!=='Намерен'||
    !list(obj(v.geojson).features).some(f=>['Polygon','MultiPolygon'].includes(f?.geometry?.type))||
    !Array.isArray(v.verified_zone_intersections)||
    typeof v.intersection_verified_outside!=='boolean')return false;
  indexed.set(id,v);
 }
 return ids.every(id=>indexed.has(id));
}
function zoneFacts(rows){
 // Names/codes only when supplied by the verified overlay; never synthesize
 // an official order, protected territory, or an intersection area.
 const out=[];
 for(const r of rows){
  const id=parcelId(r);
  for(const entry of r.verified_zone_intersections){
   const x=obj(entry);
   if(typeof entry==='string'&&str(entry)){
    out.push({parcelId:id,name:str(entry),sourceId:'KT80_V26_VERIFIED_ZONE_OVERLAY',
      intersects:true,verification:'per_parcel_geometry'});
   }else if(str(x.name||x.zone_name||x.zoneName||x.code||x.sitecode)){
    out.push({parcelId:id,name:str(x.name||x.zone_name||x.zoneName||x.code||x.sitecode),
      sourceId:'KT80_V26_VERIFIED_ZONE_OVERLAY',intersects:true,
      verification:'per_parcel_geometry'});
   }
  }
 }
 return out;
}
export function adaptKt134NativeGis({state,globals,documents}={}){
 const st=obj(state),gl=obj(globals),gis=obj(gl.KT80FreeGISResults);
 const stage3=obj(gl.KT80Stage3Result||st.stage3);
 const declared=parcelRows(st,gis);
 const rows=list(gis.results);
 const explicitSkip=st.gisSkipConfirmed===true&&str(st.gisSkipReason);
 // A verified contextual exception overrides a draft GIS lookup for a
 // complaint. It is a separate expert-confirmed determination.
 if(explicitSkip){
  return {mode:'contextual_skip',gis:null,parcels:declared.parcels,
    reason:str(st.gisSkipReason),issues:[],pdf1Verified:false};
 }
 const ids=unique([...declared.ids,...list(stage3.ids).map(str)]);
 if(verifiedIntersectionRows(rows,ids)){
  const zones=zoneFacts(rows);
  return {mode:'spatial_review',
   parcels:declared.parcels.length?declared.parcels:
     ids.map(identifier=>({identifier,sourceId:'KT80FreeGISResults'})),
   gis:{
    sourceId:'KT80_V26_VERIFIED_ZONE_OVERLAY',
    analysisMode:'verified_intersections_pending_pdf1',
    pdf1Ref:'',
    verifiedParcelIds:ids,
    protectedZones:zones,
    protectedAreas:[],
    outsideZones:rows.filter(r=>r.intersection_verified_outside===true&&
      r.verified_zone_intersections.length===0).map(parcelId),
    stage3Status:str(stage3.status),
    pdf1Status:'not_present_in_native_saved_snapshot',
    limitations:['Няма удостоверен PDF1 в сървърния запис.',
      'ЗТ и административните реквизити не са проверени от този геометричен източник.']
   },
   reason:'Проверени пространствени пресичания по имоти; PDF1 предстои',
   issues:['PDF1_DOCUMENT_NOT_PRESENT_IN_NATIVE_SNAPSHOT'],
   pdf1Verified:false};
 }
 // No confident geometric conclusion can be made. Still let the AI reviewer
 // produce an evidence-limited proposal (typically a request to clarify
 // location/GIS) instead of giving the expert another unhelpful hard stop.
 const present=ids.length||rows.length>0;
 const issues=[
  ...(present?['GIS_VERIFICATION_INCOMPLETE']:['GIS_PARCEL_LOCATION_UNCONFIRMED']),
  'NO_VERIFIED_PDF1','DO_NOT_INFER_PROTECTED_ZONE_INTERSECTIONS',
  'PROTECTED_TERRITORIES_NOT_VERIFIED'
 ];
 const documentLocations=list(documents).filter(x=>str(x.text)).map(x=>({
  sourceId:str(x.sourceId),fileName:str(x.fileName)
 })).slice(0,25);
 return {
  mode:'contextual_review',parcels:declared.parcels,
  gis:{sourceId:present?'KT80FreeGISResults':'KT126_CASE_EVIDENCE',
   analysisMode:'contextual_unverified',pdf1Ref:'',
   verifiedParcelIds:[],protectedZones:[],protectedAreas:[],
   candidateParcelIds:ids,stage3Status:str(stage3.status),
   pdf1Status:'not_verified',
   limitations:issues,documentLocations},
  reason:present?
   'Имотните данни са налични, но пространствените пресичания/PDF1 не са потвърдени. Независимият рецензент следва да предложи конкретно следващо действие, без да твърди пресичания или непресичания.':
   'Няма потвърдени имотни координати/ГИС заключения. Рецензентът следва да предложи уточняване на местоположението или приложимото процесуално действие, без пространствен извод.',
  issues,pdf1Verified:false
 };
}
