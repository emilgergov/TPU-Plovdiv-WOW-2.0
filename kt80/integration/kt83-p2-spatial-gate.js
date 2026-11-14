/* KT83 P2 — case-bound GIS → verified intersections → PI MASTER → PDF1.
 * Uses existing accepted engines; never substitutes archival overlap for geometry.
 * Browser integration is isolated to KT83 acceptance branch. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.KT83P2SpatialGate=api;
})(typeof window!=='undefined'?window:null,function(){'use strict';
 const trim=x=>String(x??'').trim();
 function check(input){
  const x=input||{},caseId=trim(x.caseId),ids=x.ids||[],live=x.live||{},pi=x.pi||{},zones=x.zones||[];
  if(!caseId||!Number.isInteger(x.generation)||!Number.isInteger(x.evidenceRevision))
   return {ok:false,code:'CASE_MISSING',message:'Не е установена идентичността и ревизията на преписката.'};
  if(x.gisDecision!=='REQUIRED')return {ok:false,code:'GIS_NOT_REQUIRED',message:'Не се създава PDF1 при експертно приета неприложимост на ГИС.'};
  if(x.invalidIds?.length||x.uncertainIds?.length)return {ok:false,code:'IDS_UNCERTAIN',message:'Има невалидни или непотвърдени кадастрални идентификатори.'};
  if(!Array.isArray(ids)||!ids.length||ids.length>100||ids.some(id=>!trim(id))||new Set(ids).size!==ids.length)
   return {ok:false,code:'IDS_INVALID',message:'Не са установени надеждни кадастрални идентификатори.'};
  if(!Array.isArray(live.ids)||!Array.isArray(live.results)||live.ids.length!==ids.length||live.results.length!==ids.length||
    !ids.every((id,i)=>id===live.ids[i]))
   return {ok:false,code:'GIS_MISMATCH',message:'ГИС резултатът не съответства на всички имоти от преписката.'};
  const good=live.results.every((r,i)=>r?.status==='Намерен'&&
   trim(r.input||r.cadnum)===ids[i]&&Array.isArray(r.geojson?.features)&&
   r.geojson.features.some(f=>['Polygon','MultiPolygon'].includes(f?.geometry?.type)&&Array.isArray(f.geometry.coordinates)&&f.geometry.coordinates.length>0));
  if(!good)return {ok:false,code:'GEOMETRY_UNVERIFIED',message:'Липсва потвърдена геометрия за един или повече имоти.'};
  if(!live.results.every(r=>Array.isArray(r.verified_zone_intersections)&&typeof r.intersection_verified_outside==='boolean'&&
      (r.verified_zone_intersections.length>0||r.intersection_verified_outside===true)))
   return {ok:false,code:'INTERSECTIONS_UNVERIFIED',message:'Проверката на пресичанията със ЗЗ не е завършена.'};
  if(!Array.isArray(pi.ids)||!Array.isArray(pi.items)||pi.ids.length!==ids.length||pi.items.length!==ids.length||
     !ids.every((id,i)=>pi.ids[i]===id&&pi.items[i]?.status==='FOUND'&&!!pi.items[i]?.profile))
   return {ok:false,code:'PI_MASTER_INCOMPLETE',message:'ПИ MASTER няма потвърдени административни данни за всички имоти.'};
  if(!Array.isArray(zones)||zones.length!==32)
   return {ok:false,code:'ZONE_BOUNDARIES_INCOMPLETE',message:'Не са заредени 32-те геометрии на защитените зони.'};
  return {ok:true,code:'READY',key:[caseId,x.generation,x.evidenceRevision,...ids].join('|'),
   message:'Пресичанията, ПИ MASTER и границите на ЗЗ са готови за PDF1.'};
 }
 function pdfReceiptMatches(input,receipt){
  const x=input||{},r=receipt||{},ids=x.ids||[];
  return !!check(x).ok&&r.caseId===x.caseId&&r.generation===x.generation&&
   r.evidenceRevision===x.evidenceRevision&&r.source===x.live&&
   Array.isArray(r.ids)&&r.ids.length===ids.length&&ids.every((id,i)=>r.ids[i]===id)
   &&Number.isFinite(r.bytes)&&r.bytes>0;
 }
 return Object.freeze({check,pdfReceiptMatches});
});
