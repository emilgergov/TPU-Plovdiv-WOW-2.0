/* KT80 V18 — independent PDF1 via V27.35's real V26DraftPackage.standalonePDF.
 * No Word, procedural or legal inference. Requires geometry for every requested parcel
 * and successful verified computation against 32 archived N2000 zones. */
(function(root){'use strict';
const $=id=>document.getElementById(id);
let epoch=0,busy=false;
function status(msg){if($('kt80PDF1Status'))$('kt80PDF1Status').textContent=msg}
function polygon(r){return r?.geojson?.features?.some(f=>['Polygon','MultiPolygon'].includes(f?.geometry?.type))}
function snapshot(){
 const svg=$('kt80GISMap');if(!svg)throw Error('Картата не е налична.');
 const copy=svg.cloneNode(true);
 copy.setAttribute('xmlns','http://www.w3.org/2000/svg');
 copy.setAttribute('width','880');copy.setAttribute('height','550');
 copy.setAttribute('viewBox','0 0 880 550');
 copy.setAttribute('style','background:#f2f5eb');
 copy.querySelectorAll('path.kt80-map-parcel').forEach(p=>p.setAttribute('style','fill:#4ac176;fill-opacity:.4;stroke:#1e734e;stroke-width:2.5'));
 copy.querySelectorAll('path.kt80-map-zone').forEach(p=>p.setAttribute('style','fill:#6aacc4;fill-opacity:.15;stroke:#2479a5;stroke-width:1.3;stroke-dasharray:4 3'));
 copy.querySelectorAll('text.kt80-map-label').forEach(p=>p.setAttribute('style','fill:#123b28;font-size:13px;font-family:Arial;font-weight:bold;stroke:#fff;stroke-width:2.5;paint-order:stroke'));
 return new XMLSerializer().serializeToString(copy);
}
async function makePDF(){
 if(busy)return;
 const generation=epoch;
 const live=root.KT80FreeGISResults;
 if(!live||!Array.isArray(live.ids)||!live.ids.length)return status('Първо натиснете „Намери имотите“.');
 const editor=root.V26ParcelEditor;
 const current=editor?.normalize($('kt80ParcelInput')?.value||'');
 if(!current||current.invalid.length||current.uncertain.length||current.ids.length!==live.ids.length||current.ids.some((id,i)=>id!==live.ids[i]))
  return status('Имотите са променени. Натиснете отново „Намери имотите“.');
 if(!live.results||live.results.length!==live.ids.length||live.results.some((r,i)=>r.input!==live.ids[i]||r.status!=='Намерен'||!polygon(r)))
  return status('За PDF1 са необходими намерени имоти с геометрия за всички въведени идентификатори. Липсващите данни не се заместват.');
 if(typeof root.V26KT12Overlay?.verify!=='function'||typeof root.V26DraftPackage?.standalonePDF!=='function')
  return status('ГИС проверката или PDF генераторът не е зареден.');
 busy=true;const btn=$('kt80PDF1');btn.disabled=true;status('Проверяваме пространствените пресичания и подготвяме PDF1…');
 try{
  // Clone — never mutate the original lookup state during a pending verification.
  const checked=live.results.map(r=>({...r,geojson:r.geojson}));
  await root.V26KT12Overlay.verify(checked);
  if(epoch!==generation||root.KT80FreeGISResults!==live)return;
  if(checked.some(r=>!Array.isArray(r.verified_zone_intersections)||typeof r.intersection_verified_outside!=='boolean'))
   throw Error('Непълен резултат от пространствената проверка.');
  const options={mapSvg:snapshot(),mapViewport:'0 0 880 550',zoneStatus:'Проверени геометрични пресичания спрямо архивните 32 защитени зони',zoneFeatures:[],verifiedCaseMetadata:{},leadingParcelId:''};
  const pdf=await root.V26DraftPackage.standalonePDF(checked,1,options);
  if(epoch!==generation||root.KT80FreeGISResults!==live)return;
  if(!(pdf instanceof Blob)||pdf.size<100||await pdf.slice(0,4).text()!=='%PDF')throw Error('Не е получен валиден PDF документ.');
  if(epoch!==generation||root.KT80FreeGISResults!==live)return;
  const url=URL.createObjectURL(pdf),a=document.createElement('a');
  a.href=url;a.download='TPU_Plovdiv_KT80_GIS_analiz_PDF1.pdf';document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
  status('Готово! ГИС анализът (PDF1) е изготвен. Данните са от работния архив и изискват експертна проверка.');
 }catch(e){if(epoch===generation)status('Не успяхме да изготвим PDF1: '+String(e?.message||e))}
 finally{if(epoch===generation){busy=false;btn.disabled=false}}
}
function invalidate(){epoch++;busy=false;const btn=$('kt80PDF1');if(btn)btn.disabled=false;status('За нов PDF1 първо изпълнете „Намери имотите“.')}
function init(){
 const btn=$('kt80PDF1');if(!btn)return;
 btn.addEventListener('click',makePDF);
 $('kt80ParcelInput')?.addEventListener('input',invalidate);
 $('kt80FindParcels')?.addEventListener('click',invalidate);
 document.addEventListener('kt80:case-reset',invalidate);
 root.KT80PDF1Bridge=Object.freeze({makePDF,invalidate});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
