/* V26 full approved GIS bridge. Existing GIS stays as fallback until full ZIP is loaded. */
(()=>{'use strict';
function mount(){
 const api=window.V26ApprovedGIS,original=window.V26BrowserGIS;
 if(!api||!original||document.getElementById('v26FullGISFile'))return;
 const anchor=document.getElementById('v26LocalIndexMount')||document.getElementById('zipDrop')||document.getElementById('extract');
 if(!anchor)return;
 const panel=document.createElement('section');panel.style.cssText='margin:12px 0;padding:12px;border:1px solid #4c8068;border-radius:9px;background:#f1f8f3;color:#153c29';
 const title=document.createElement('strong');title.textContent='Пълна ГИС база V26 (одобрена)';
 const input=document.createElement('input');input.type='file';input.accept='.zip';input.id='v26FullGISFile';input.style.cssText='display:block;margin:8px 0;max-width:100%';
 const info=document.createElement('div');info.id='v26FullGISStatus';info.textContent='Заредете пълния ГИС пакет за всички имоти и пресичания. Файлът остава локално на компютъра.';
 panel.append(title,input,info);anchor.parentElement.insertBefore(panel,anchor.nextSibling);
 input.addEventListener('change',async()=>{
  info.textContent='Проверка на ГИС пакета…';
  try{
   const loaded=await api.openArchive(input.files[0]);
   info.textContent='ГИС V26 готов: '+loaded.files+' файла. Справките използват одобрената база.';
   document.dispatchEvent(new Event('v26:gis-invalidated'));
  }catch(e){info.textContent='ГИС пакетът не е активиран: '+e.message;}
 });
 const fallback=original.lookup;
 const wrapper=Object.freeze({...original,lookup:async ids=>{
  if(!api.isLoaded())return fallback(ids);
  const data=await api.lookup(ids);
  if(data.results.some(x=>x.status==='Геометрия липсва'))throw Error('ГИС пакетът няма геометрия за един или повече имоти. Не може да се издаде непълен PDF №1.');
  return data;
 }});
 window.V26BrowserGIS=wrapper;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();