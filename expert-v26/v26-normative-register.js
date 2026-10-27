/* V26: read existing 26.10 normative register from the public site's own data directory. */
(()=>{'use strict';
let generation=0;
const state={status:'loading',records:[],error:null};
window.V26NormativeRegister=state;
async function load(){
 const token=++generation;
 try{
  const response=await fetch(new URL('data/normative-archive-register.json',document.currentScript?.src||location.href),{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const records=await response.json();
  if(!Array.isArray(records)||!records.every(r=>r&&typeof r.id==='string'&&typeof r.title==='string'&&typeof r.source==='string'))throw Error('Невалиден нормативен регистър');
  // Reuse the public browser archive as a second source, without overwriting the established legal register.
  const catalogResponse=await fetch(new URL('normative/sources.json',document.currentScript?.src||location.href),{cache:'no-store'});
  if(!catalogResponse.ok)throw Error('Нормативният браузърен архив не е достъпен: HTTP '+catalogResponse.status);
  const catalog=await catalogResponse.json();
  if(!Array.isArray(catalog.items))throw Error('Невалиден браузърен нормативен архив');
  for(const item of catalog.items){
   if(!item.title||!item.url)continue;
   if(records.some(r=>r.source===item.url&&r.title===item.title))continue;
   records.push({id:'B'+String(item.id).padStart(3,'0'),title:item.title,source:item.url,purpose:item.category||'Официален източник',source_status:'Браузърен каталог на официални източници; текстът и редакцията не са проверени в този модул',page:'ПРЕДСТОИ',date:'ПРЕДСТОИ',verified:false,zone_code:item.zone_code||null});
  }
  if(token!==generation)return;
  state.records=records;state.status='ready';state.error=null;
  document.dispatchEvent(new CustomEvent('v26:normative-register-ready',{detail:{records,verified:records.filter(r=>r.verified===true).length,pending:records.filter(r=>r.verified!==true).length}}));
 }catch(error){
  if(token!==generation)return;
  state.records=[];state.status='error';state.error=String(error.message||error);
  document.dispatchEvent(new CustomEvent('v26:normative-register-error',{detail:{message:state.error}}));
 }
}
state.reload=load;
load();
})();
