/* KT82 · V59.2 — пространствен доказателствен протокол за етап 3.
 * Същите GIS/PI MASTER двигатели; без фиктивна геометрия и без автоматично
 * геометрично изключване само по ЕКАТТЕ / архивен индекс.
 * Няма нов административен маршрут или трета нужда от ГИС.
 */
(function(root){'use strict';
const $=id=>document.getElementById(id),clean=x=>String(x??'').replace(/\s+/gu,' ').trim();
function evaluate(input){
 const ids=Array.isArray(input?.ids)?input.ids.map(clean).filter(Boolean):[];
 const live=input?.live||null,place=input?.place||null,context=input?.context||null;
 const gate=input?.gate||null, expert=input?.expert||null;
 if(gate?.expertConfirmed===true&&gate.decision==='NOT_REQUIRED'){
  return Object.freeze({scenario:'GIS_NOT_REQUIRED',spatialStatus:'NOT_ASSESSED',ids:[],geometryProven:false,intersectionProven:false,exclusionProven:false,contextVerified:false,
   label:'ГИС не е необходим',basis:clean(gate.reason)||'Експертно приета предварителна нормативна ориентация.',
   action:'Предложение: продължете към етап №4 с относимите документни доказателства. Пространствен анализ и PDF1 не се изискват.',
   limitation:'Това е решение за приложимостта на ГИС, а не констатация, че обектът е извън защитени зони или територии.'});
 }
 const result=Array.isArray(live?.results)?live.results:[];
 const matched=ids.length>0&&Array.isArray(live?.ids)&&live.ids.length===ids.length&&ids.every((id,i)=>id===clean(live.ids[i]))&&result.length===ids.length;
 const valid=r=>r?.status==='Намерен'&&Array.isArray(r.geojson?.features)&&r.geojson.features.some(f=>(f.geometry?.type==='Polygon'||f.geometry?.type==='MultiPolygon')&&Array.isArray(f.geometry.coordinates)&&f.geometry.coordinates.length);
 const geometryProven=!!matched&&result.every(valid);
 const statuses=geometryProven?result.map(r=>Array.isArray(r.verified_zone_intersections)&&typeof r.intersection_verified_outside==='boolean'?
  (r.verified_zone_intersections.length?'INTERSECTS':r.intersection_verified_outside===true?'OUTSIDE':'UNVERIFIED'):'UNVERIFIED'):[];
 const intersectionProven=geometryProven&&statuses.length===ids.length&&statuses.every(s=>s!=='UNVERIFIED');
 const contextVerified=!!place?.ekatte&&!!place?.settlement&&place?.expertReviewed===true;
 const location=place?.ekatte&&place?.settlement?clean(place.settlement)+' · ЕКАТТЕ '+clean(place.ekatte):'местоположение без еднозначно потвърждение';
 if(intersectionProven){
  const allOutside=statuses.every(x=>x==='OUTSIDE'),allInside=statuses.every(x=>x==='INTERSECTS');
  const scenario=allOutside?'A_OUTSIDE':allInside?'B_INTERSECTS':'AB_MIXED';
  return Object.freeze({scenario,spatialStatus:scenario,ids,geometryProven:true,intersectionProven:true,
   exclusionProven:allOutside,contextVerified,zoneStatuses:statuses,
   label:allOutside?'Проверено непресичане със ЗЗ':allInside?'Проверено пресичане със ЗЗ':'Смесено положение спрямо ЗЗ',
   basis:'За '+ids.length+' имот(а) има съответстващи геометрии и изрично проверени пространствени отношения към анализираните защитени зони.',
   action:'Предложение: използвайте проверените ГИС резултати в етап №4; отделно оценете косвени и съвкупни въздействия и приложимите нормативни изисквания.',
   limitation:'Резултатът за ЗЗ не удостоверява автоматично статус спрямо ЗТ и не решава сам по себе си приложимата процедура или въздействията извън имотните граници.'});
 }
 if(ids.length&&geometryProven){
  return Object.freeze({scenario:'GIS_INCOMPLETE',spatialStatus:'UNVERIFIED',ids,geometryProven:true,intersectionProven:false,exclusionProven:false,contextVerified,
   label:'Налична геометрия · проверката на пресичанията е непълна',
   basis:'За '+ids.length+' имот(а) има геометрии, но изрично потвърден резултат за ЗЗ не е наличен за всички имоти.',
   action:'Предложение: завършете проверката на пространствените пресичания; не използвайте непроверени записи като доказателство за попадане или непопадане.',
   limitation:'Архивен запис или визуално положение върху картата не заменя проверената геометрична операция.'});
 }
 if(ids.length){
  return Object.freeze({scenario:'GIS_INCOMPLETE',spatialStatus:'GEOMETRY_UNVERIFIED',ids,geometryProven:false,intersectionProven:false,exclusionProven:false,contextVerified,
   label:'Имотите са посочени · геометрията не е удостоверена',
   basis:'За текущия комплект от '+ids.length+' имот(а) няма пълно съответстващо доказателство за геометрия.',
   action:'Предложение: изпълнете повторна ГИС справка за същите имоти или уточнете непълните идентификатори, без да променяте потвърдения предмет.',
   limitation:'Няма основание за категорично пространствено пресичане или изключване.'});
 }
 const archive=context?.archiveStatus||'UNDETERMINED';
 const archiveNone=archive==='NO_RECORDED_PARCEL_OVERLAP_NOT_PROOF';
 const reviewed=!!place?.expertReviewed;
 const siteSource=clean(place?.source||'');
 return Object.freeze({scenario:'CONTEXT',spatialStatus:'CONTEXT_UNVERIFIED',ids:[],geometryProven:false,intersectionProven:false,exclusionProven:false,contextVerified,
  label:reviewed&&contextVerified?'Контекстно местоположение · експертно прегледано':'Контекстно местоположение · за експертна проверка',
  basis:'Ориентир: '+location+'. '+(reviewed?'Местоположението е прегледано от експерта, но няма проверена имотна геометрия.':'Местоположението подлежи на експертна проверка.')+
   (siteSource?' Източник: '+siteSource+'.':'')+
   (archiveNone?' В архивния индекс няма положителни имотни пресичания за съответната група; това НЕ доказва пространствено изключване.':
    ' Архивният индекс не доказва пространствено положение на конкретния обект.'),
  action:reviewed&&contextVerified?
   'Предложение: използвайте потвърденото контекстно местоположение в етап №4 с изрично описани ограничения. Ако геометричното положение е съществено за правния въпрос, извършете целева проверка чрез блок №15 или изискайте конкретните недостигащи данни.':
   'Предложение: уточнете и потвърдете действителното местоположение на обекта; ако то е решаващо за правната преценка, извършете целева ГИС проверка или поискайте конкретните липсващи сведения.',
  limitation:'Контекстен анализ ≠ доказано НЕ ПОПАДА. Не се изчисляват или твърдят имотни пресичания, площи, проценти или PDF1 без надеждна геометрия.'});
}
root.KT82SpatialEvidenceClassifier=Object.freeze({evaluate});
function init(){
 const stage=document.querySelector('.kt80-stage-panel[data-panel="3"]');
 if(!stage)return;
 const panel=document.createElement('section');panel.id='kt82SpatialEvidence592';panel.className='kt82-spatial-evidence';
 panel.setAttribute('aria-label','Доказателствен резултат от пространствения анализ');
 panel.innerHTML='<h3>Пространствен доказателствен резултат</h3><strong id="kt82SpatialStatus592"></strong><p id="kt82SpatialBasis592"></p><p id="kt82SpatialNext592"></p><details><summary>Доказателствени ограничения</summary><p id="kt82SpatialLimits592"></p></details>';
 const before=stage.querySelector('#kt80ToLaw')||stage.querySelector('.kt80-v580-passport');
 if(before)before.before(panel);else stage.append(panel);
 const css=document.createElement('style');css.id='kt82-spatial-style-v592';
 css.textContent='.kt82-spatial-evidence{padding:11px 14px;margin:12px 0;border:1px solid #8aa891;border-left:4px solid #6e8d74;border-radius:6px;background:#e9efe6;color:#24412c;font:400 13px/1.5 "Segoe UI",Arial,sans-serif}.kt82-spatial-evidence h3{font:700 16px "Segoe UI",Arial,sans-serif;color:#234b34;margin:0 0 7px}.kt82-spatial-evidence strong{display:block;margin:5px 0;color:#234934}.kt82-spatial-evidence p{font:400 13px/1.5 "Segoe UI",Arial,sans-serif!important;color:#2b4c36!important;margin:6px 0}.kt82-spatial-evidence details{margin-top:8px;font-size:12px}.kt82-spatial-evidence summary{cursor:pointer;font-weight:650}';
 document.head.append(css);
 function gather(){
  const v=root.V26ParcelEditor?.normalize($('kt80ParcelInput')?.value||'');
  const ids=v?.invalid?.length||v?.uncertain?.length?[]:v?.ids||[];
  return {ids,live:root.KT80FreeGISResults||null,place:root.KT82UI?.getLocation?.()||root.KT82Location||null,
   context:root.KT81ContextScreen?.getResult?.()||root.KT81ContextResult||null,
   gate:root.KT80WorkflowState?.normativeGate||null,expert:root.KT80WorkflowState?.parcelsConfirmed||null};
 }
 let last=null;
 function refresh(){
  const a=evaluate(gather());last=a;root.KT82SpatialEvidenceLast=a;
  $('kt82SpatialStatus592').textContent=a.label;
  $('kt82SpatialBasis592').textContent=a.basis;
  $('kt82SpatialNext592').textContent=a.action;
  $('kt82SpatialLimits592').textContent=a.limitation;
  panel.hidden=stage.hidden||a.scenario==='GIS_NOT_REQUIRED';
  return a;
 }
 document.addEventListener('kt80:stage-open',e=>{if(e.detail?.step===3){refresh();setTimeout(refresh,400);setTimeout(refresh,1300)}else panel.hidden=true});
 document.addEventListener('kt80:location-gap',()=>setTimeout(refresh,150));
 $('kt80ParcelsConfirmation')?.addEventListener('change',refresh);
 $('kt80ParcelInput')?.addEventListener('input',()=>setTimeout(refresh,300));
 $('kt80FindParcels')?.addEventListener('click',()=>setTimeout(refresh,900));
 document.addEventListener('kt80:case-reset',()=>{last=null;root.KT82SpatialEvidenceLast=null;panel.hidden=true});
 root.KT82SpatialEvidence=Object.freeze({get:()=>evaluate(gather()),refresh});
 if(!stage.hidden)refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);