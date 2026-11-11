/* KT80 V20 — full approved GIS bridge, matching the source strategy of V27.35.
   The 51-parcel demonstration file is NOT an acceptable fallback for a real free GIS lookup.
   This adapter requires the validated hosted 258-shard manifest (or a manually supplied approved ZIP). */
(function(root){'use strict';
const api=root.V26ApprovedGIS,old=root.V26BrowserGIS;
if(!api||!old)throw Error('Наличните ГИС модули не са заредени.');
const dataRoot='../v26-test/gis-data';
let launch=null,error=null,attempts=0;
function stateText(s){
 const node=document.getElementById('kt80FullGISReady');
 if(node)node.textContent=s;
}
async function connect(){
 if(api.isLoaded()){error=null;stateText('Пълната ГИС база е активна.');return true}
 const run=++attempts;
 stateText('Свързваме пълната ГИС база…');
 try{
  const m=await api.openHosted(dataRoot);
  if(run!==attempts)return api.isLoaded();
  error=null;stateText('Пълна ГИС база: '+Number(m.parcel_geometry).toLocaleString('bg-BG')+' имотни геометрии · пространствен архив на РИОСВ – Пловдив.');
  document.getElementById('v26LocalIndexMount')?.setAttribute('hidden','');
  return true;
 }catch(e){if(run===attempts){error=e;stateText('Пълната ГИС база не е заредена. Можете да използвате одобрения ГИС ZIP архив. Причина: '+String(e?.message||e))}throw e}
}
function load(){return launch||(launch=connect().catch(e=>{launch=null;throw e}))}
async function requireFull(){
 if(api.isLoaded())return true;
 return load();
}
function validate(ids,response){
 if(!Array.isArray(response?.results)||response.results.length!==ids.length)
  throw Error('Непълен ГИС отговор: броят на резултатите не съвпада с поисканите имоти.');
 for(let i=0;i<ids.length;i++){
  const r=response.results[i],id=String(ids[i]).trim(),expected=id.split('.').slice(0,3).join('.');
  if(r.cadnum!==expected)throw Error('ГИС данните не съответстват на имот '+id+'.');
  if(r.status!=='Намерен')throw Error('За имот '+id+' няма потвърдена геометрия в пълната ГИС база.');
  const polygons=r.geojson?.features;
  if(!Array.isArray(polygons)||!polygons.length||polygons.some(f=>!['Polygon','MultiPolygon'].includes(f.geometry?.type)||!Array.isArray(f.geometry.coordinates)||!f.geometry.coordinates.length))
   throw Error('ГИС геометрията на имот '+id+' не е валидна.');
 }
 return response;
}
const wrapper=Object.freeze({...old,
 isLoaded:()=>api.isLoaded(),
 lookup:async ids=>{
  await requireFull(); // deliberately no silent 51-parcel fallback
  return validate(ids,await api.lookup(ids));
 }
});
root.V26BrowserGIS=wrapper;
root.KT80FullGISSource=Object.freeze({
 load,retry:async()=>{launch=null;return load()},isLoaded:()=>api.isLoaded(),getError:()=>error?String(error.message||error):null,
 openArchive:async file=>{const a=await api.openArchive(file);error=null;stateText('Пълният ГИС архив е зареден локално.');document.getElementById('v26LocalIndexMount')?.setAttribute('hidden','');return a}
});
function init(){
 const input=document.getElementById('kt80FullGISArchive');
 input?.addEventListener('change',async()=>{
  const f=input.files?.[0];if(!f)return;
  stateText('Проверяваме одобрения ГИС ZIP архив…');
  try{await root.KT80FullGISSource.openArchive(f)}catch(e){stateText('Не успяхме да заредим ГИС архива: '+String(e?.message||e))}
  input.value='';
 });
 void load().catch(()=>{});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);