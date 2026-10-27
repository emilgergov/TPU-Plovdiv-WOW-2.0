/* V26 PDF2 browser preparation: no server, no invented legal verification. */
(()=>{'use strict';
const state={gis:null,register:null};
const host=document.getElementById('v26Annex2Static');
const info=document.getElementById('v26Annex2Info');
const button=document.getElementById('v26Annex2Button');
if(!host||!info||!button)return;
function update(){
 const count=state.register?.records?.length||0,verified=state.register?.verified||0;
 const hasGIS=!!state.gis;
 const verifiedGeometry=hasGIS&&(state.gis.results||[]).some(r=>r.status==='Намерен'&&r.geojson?.features?.some(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type)));
 button.disabled=!(verifiedGeometry&&count>0);
 info.textContent='ГИС резултат: '+(hasGIS?'получен':'ПРЕДСТОИ')+' · Нормативни записи: '+count+' · Проверени записи: '+verified+' · Непроверени: '+(count-verified)+'. '+(button.disabled?'За справочен проект са необходими реална имотна геометрия и нормативен регистър.':'Достъпен е справочен проект; непроверените записи остават ПРЕДСТОИ.');
}
document.addEventListener('v26:gis-ready',e=>{state.gis=e.detail;update()});
document.addEventListener('v26:gis-invalidated',()=>{state.gis=null;update()});
document.addEventListener('v26:normative-register-ready',e=>{state.register=e.detail;update()});
document.addEventListener('v26:normative-register-error',()=>{state.register=null;update()});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
button.onclick=async()=>{
 if(button.disabled||!state.gis||!state.register?.records?.length)return;
 button.disabled=true;
 try{
  const blob=await window.V26DraftPackage.standalonePDF(state.gis.results||[],2,state.register);
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='TPU_Plovdiv_V26_Prilozhenie_2_Normativno.pdf';
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
  info.textContent='Изтеглено е справочно Приложение №2 (PDF). Непотвърдените нормативни данни остават ПРЕДСТОИ.';
 }catch(e){info.textContent='PDF №2: '+e.message}finally{update()}
};
if(window.V26NormativeRegister?.status==='ready'){const records=window.V26NormativeRegister.records;state.register={records,verified:records.filter(r=>r.verified===true).length};}
update();
})();
