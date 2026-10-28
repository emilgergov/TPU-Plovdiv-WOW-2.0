/* V26 full approved GIS bridge. Existing GIS stays as fallback until full ZIP is loaded. */
(()=>{'use strict';
function mount(){
 const api=window.V26ApprovedGIS,original=window.V26BrowserGIS;
 if(!api||!original||document.getElementById('v26HostedReady')||document.getElementById('v26FullGISFile'))return;
 const anchor=document.getElementById('v26LocalIndexMount')||document.getElementById('zipDrop')||document.getElementById('extract');
 if(!anchor){console.error('V26 GIS: anchor not found');return;}
 const panel=document.createElement('section');panel.style.cssText='margin:12px 0;padding:12px;border:1px solid #4c8068;border-radius:9px;background:#f1f8f3;color:#153c29';
 const title=document.createElement('strong');title.textContent='Пълна ГИС база V26 (одобрена)';
 const input=document.createElement('input');input.type='file';input.accept='.zip';input.id='v26FullGISFile';input.style.cssText='display:block;margin:8px 0;max-width:100%';
 const info=document.createElement('div');info.id='v26FullGISStatus';info.textContent='Заредете пълния ГИС пакет за всички имоти и пресичания. Файлът остава локално на компютъра.';
 panel.append(title,input,info);anchor.parentElement.insertBefore(panel,anchor.nextSibling);
 /* Hosted mode is preferred; retain manual controls until its manifest and shards are live. */
 api.openHosted('../expert-v26/gis-data').then(()=>{
  panel.style.display='none';
  const legacy=document.getElementById('v26LocalIndexMount');
  if(legacy)legacy.style.setProperty('display','none','important');
  const oldBtn=document.getElementById('v26SqliteLoad');if(oldBtn){const oldGroup=oldBtn.parentElement;if(oldGroup)oldGroup.style.setProperty('display','none','important');}
  const oldHeading=[...document.querySelectorAll('h1,h2,h3,h4,strong')].find(x=>x.textContent?.includes('Кадастрален индекс — локална ГИС справка'));if(oldHeading){const block=oldHeading.closest('section,article,.card')||oldHeading.parentElement;if(block&&block!==panel)block.style.setProperty('display','none','important');}
  for(const el of document.querySelectorAll('[id*="LocalIndex"],[id*="localIndex"],[id*="GeometryFile"],[id*="geometryFile"]')){const section=el.closest('section');if(section&&section!==panel)section.style.display='none';}
  const status=document.createElement('div');status.id='v26HostedReady';status.textContent='ГИС V26 — автоматично заредена';status.style.cssText='margin:8px 0;color:#17633e;font-weight:600';panel.parentElement.insertBefore(status,panel);
  document.dispatchEvent(new Event('v26:gis-invalidated'));
 }).catch(async(error)=>{info.textContent='Автоматичната ГИС връзка не е готова: '+error.message;console.error('V26 hosted GIS activation failed',error);const file=await restore();if(file){try{const loaded=await api.openArchive(file);info.textContent='ГИС V26 готова: '+loaded.files+' файла, възстановена автоматично от този браузър.';panel.style.display='none';document.dispatchEvent(new Event('v26:gis-invalidated'));return}catch(e){info.textContent='Локалният архив не може да се възстанови: '+e.message}}else info.textContent='Първоначално зареждане: изберете одобрения ZIP архив само веднъж. След това ще се възстановява автоматично.';});
 async function remember(file){if(!window.indexedDB)return;return new Promise((resolve,reject)=>{const req=indexedDB.open('V26_APPROVED_GIS',1);req.onupgradeneeded=()=>req.result.createObjectStore('archives');req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result,tx=db.transaction('archives','readwrite');tx.objectStore('archives').put(file,'approved');tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}}})}
 async function restore(){if(!window.indexedDB)return null;return new Promise(resolve=>{const req=indexedDB.open('V26_APPROVED_GIS',1);req.onupgradeneeded=()=>req.result.createObjectStore('archives');req.onerror=()=>resolve(null);req.onsuccess=()=>{const db=req.result,tx=db.transaction('archives','readonly'),get=tx.objectStore('archives').get('approved');get.onsuccess=()=>{db.close();resolve(get.result||null)};get.onerror=()=>{db.close();resolve(null)}}})}
  input.addEventListener('change',async()=>{
  info.textContent='Проверка на ГИС пакета…';
  try{
   const loaded=await api.openArchive(input.files[0]);
   info.textContent='ГИС V26 готов: '+loaded.files+' файла. Запазване за следващи посещения…';try{await remember(input.files[0]);info.textContent='ГИС V26 готова. Архивът е запазен локално и ще се зарежда автоматично.';panel.style.display='none';}catch(e){info.textContent='ГИС V26 готова. Локалното запазване не успя ('+e.message+').';}
   document.dispatchEvent(new Event('v26:gis-invalidated'));
  }catch(e){info.textContent='ГИС пакетът не е активиран: '+e.message;}
 });
 const fallback=original.lookup;
 const wrapper=Object.freeze({...original,lookup:async ids=>{
  if(!api.isLoaded())throw Error('Пълната ГИС V26 още не е готова. Изчакайте автоматичното зареждане или възстановете одобрения архив. Не се използва непълният резервен индекс.');
  const data=await api.lookup(ids);
  if(data.results.some(x=>x.status==='Геометрия липсва'))throw Error('ГИС пакетът няма геометрия за един или повече имоти. Не може да се издаде непълен PDF №1.');
  return data;
 }});
 window.V26BrowserGIS=wrapper;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();