/* V26 PDF2 browser preparation: no server, no invented legal verification. */
(()=>{'use strict';
const state={gis:null,register:null,archive:null,preview:null};
const host=document.getElementById('v26Annex2Static');
const info=document.getElementById('v26Annex2Info');
const button=document.getElementById('v26Annex2Button');
const brief=document.getElementById('v26Annex2Brief');
if(!host||!info||!button)return;
function update(){
 const count=state.register?.records?.length||0,verified=state.register?.verified||0;
 const hasGIS=!!state.gis;
 const gisResults=state.gis?.results;
 const verifiedGeometry=hasGIS&&Array.isArray(gisResults)&&gisResults.length>0&&gisResults.length===state.gis.summary?.requested_count&&gisResults.every(r=>r.status==='Намерен'&&Array.isArray(r.geojson?.features)&&r.geojson.features.length>0&&r.geojson.features.every(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type)&&Array.isArray(f.geometry.coordinates)&&f.geometry.coordinates.length>0));
 button.disabled=!(verifiedGeometry&&count>0&&window.V26DraftPackage?.standalonePDF);
 if(brief)brief.textContent=!hasGIS?'ГИС справка: предстои':!verifiedGeometry?'Липсва валидна геометрия за един или повече имоти':!count?'Нормативният архив не е зареден':verified===0?'Справочен PDF е достъпен · 0 проверени нормативни записа':'Справочен PDF е достъпен · '+verified+' проверени записа';
 info.textContent='ГИС резултат: '+(hasGIS?'получен':'ПРЕДСТОИ')+' · Нормативни записи: '+count+' · Проверени записи: '+verified+' · Непроверени: '+(count-verified)+' · Архивна преписка: '+(state.archive?state.archive.entries+' файла, индекс проверен':'не е избрана')+' · Прочетени текстови файлове: '+(state.preview?.files?.filter(f=>!f.error).length||0)+'. '+(button.disabled?'За справочен проект са необходими реална имотна геометрия и нормативен регистър.':'Достъпен е справочен проект; непроверените записи остават ПРЕДСТОИ.');
}
document.addEventListener('v26:archive-inventory',e=>{state.archive=e.detail;state.preview=null;update()});
document.addEventListener('v26:archive-text-preview',e=>{state.preview=e.detail;update()});
document.addEventListener('v26:gis-ready',e=>{state.gis=e.detail;update()});
document.addEventListener('v26:gis-invalidated',()=>{state.gis=null;update()});
document.addEventListener('v26:normative-register-ready',e=>{state.register=e.detail;update()});
document.addEventListener('v26:normative-register-error',()=>{state.register=null;update()});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
button.onclick=async()=>{
 if(button.disabled||!state.gis||!state.register?.records?.length)return;
 if(!Array.isArray(state.gis.results)||state.gis.results.length!==state.gis.summary?.requested_count||state.gis.results.some(r=>r.status!=='Намерен'||!r.geojson?.features?.length))throw Error('Приложение №2 изисква пълен ГИС резултат за всички имоти.');
 button.disabled=true;
 try{
  const blob=await window.V26DraftPackage.standalonePDF(state.gis.results||[],2,{...state.register,archive:state.archive,preview:state.preview,gisSummary:state.gis.summary||{},dossierReferences:window.V26WorkingContext?window.V26UnifiedContext.toAnnex2(window.V26WorkingContext):null});
  if(!(blob instanceof Blob)||blob.size<100||await blob.slice(0,4).text()!=='%PDF')throw Error('Генерираният файл не е валиден PDF.');
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='TPU_Plovdiv_V26_Prilozhenie_2_Normativno.pdf';
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
  info.textContent='Изтеглено е справочно Приложение №2 (PDF). Непотвърдените нормативни данни остават ПРЕДСТОИ.';
 }catch(e){update();info.textContent='Грешка при Приложение №2: '+e.message;return}finally{button.disabled=false;update()}
};
if(window.V26NormativeRegister?.status==='ready'){const records=window.V26NormativeRegister.records;state.register={records,verified:records.filter(r=>r.verified===true).length};}
update();
})();
