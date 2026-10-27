/* V26 local browser cadastral index: SQLite read-only; no upload or invented geometry. */
(()=>{'use strict';
let db=null,source='',geometryCache=null,geometrySource='';
// Browser-local persistent cache: never uploads the SQLite index.
const CACHE_DB='TPU_V26_LOCAL_INDEX',CACHE_STORE='files',CACHE_KEY='parcel_lookup_v1';
function cacheOpen(){return new Promise((resolve,reject)=>{if(!window.indexedDB)return reject(Error('IndexedDB не се поддържа'));const q=indexedDB.open(CACHE_DB,1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(CACHE_STORE))q.result.createObjectStore(CACHE_STORE)};q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}
async function cacheSave(bytes,name){const store=await cacheOpen();try{await new Promise((resolve,reject)=>{const tx=store.transaction(CACHE_STORE,'readwrite');tx.objectStore(CACHE_STORE).put({bytes,name,savedAt:new Date().toISOString()},CACHE_KEY);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}finally{store.close()}}
async function cacheRead(){const store=await cacheOpen();try{return await new Promise((resolve,reject)=>{const tx=store.transaction(CACHE_STORE,'readonly');const q=tx.objectStore(CACHE_STORE).get(CACHE_KEY);q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>reject(q.error)})}finally{store.close()}}
async function restoreCachedIndex(){if(db)return true;const cached=await cacheRead();if(!cached?.bytes)return false;await openSQLite(cached.bytes,cached.name+' (локално запазен)');return true}

async function geometryRecords(){if(geometryCache)return geometryCache;const response=await fetch('data/v26-parcel-geometry-batch-51.json',{cache:'no-store'});if(!response.ok)throw Error('Липсва файлът с геометрията');const data=await response.json();if(data.status!=='ARCHIVAL_ONLY'||!data.records||typeof data.records!=='object')throw Error('Невалиден архивен геометричен набор');geometryCache=data.records;geometrySource=String(data.source||'архивна FileGDB');return geometryCache;}
async function loadGeometryFile(file){
 if(!file||!/\.json$/i.test(file.name))throw Error('Изберете JSON с имотна геометрия.');
 if(file.size>15000000)throw Error('Геометричният JSON надхвърля 15 MB.');
 const data=JSON.parse(await file.text());
 if(!data||data.status!=='ARCHIVAL_ONLY'||!data.records||typeof data.records!=='object'||Array.isArray(data.records))throw Error('Неподдържан формат на архивния геометричен набор.');
 const records={};let count=0;
 for(const [id,record] of Object.entries(data.records)){
  if(!/^\d{5}\.\d+\.\d+$/.test(id)||record.cadnum!==id||!Array.isArray(record.geojson?.features))throw Error('Несъответствие на идентификатор или GeoJSON.');
  const features=record.geojson.features;
  if(!features.length||features.some(f=>!['Polygon','MultiPolygon'].includes(f?.geometry?.type)||!Array.isArray(f.geometry.coordinates)))throw Error('Невалидна геометрия: '+id);
  records[id]=record;count++;
 }
 if(!count)throw Error('Няма имотни геометрии.');
 geometryCache=records;geometrySource=String(data.source||file.name);
 return {count,source:geometrySource};
}
const validId=id=>/^\d{5}\.\d+\.\d+(?:\.\d+){0,2}$/.test(id);
function loadScript(src){return new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=src;el.onload=resolve;el.onerror=()=>reject(Error('Не се зареди библиотеката: '+src));document.head.appendChild(el)})}
async function openSQLite(bytes,name){
 if(bytes.byteLength>150000000)throw Error('SQLite индексът надхвърля 150 MB.');
 if(!window.initSqlJs)await loadScript('https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.11.0/sql-wasm.js');
 const SQL=await window.initSqlJs({locateFile:f=>'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.11.0/'+f});
 const next=new SQL.Database(new Uint8Array(bytes));
 const tables=next.exec("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('parcels','overlays')");
 if(!tables.length||tables[0].values.length!==2){next.close();throw Error('Неподдържан кадастрален SQLite индекс.');}
 if(db)db.close();db=next;source=name;
 return {source:name,parcels:db.exec('SELECT COUNT(*) FROM parcels')[0].values[0][0],overlays:db.exec('SELECT COUNT(*) FROM overlays')[0].values[0][0]};
}
async function loadArchive(file){
 if(!file)throw Error('Не е избран архив.');
 if(/\.sqlite$/i.test(file.name)){const bytes=await file.arrayBuffer();const result=await openSQLite(bytes,file.name);try{await cacheSave(bytes,file.name)}catch(e){console.warn('Локалното запазване не е налично:',e)}return result;}
 if(!/\.zip$/i.test(file.name))throw Error('Изберете ZIP или SQLite.');
 if(!window.zip?.ZipReader)await loadScript('https://cdn.jsdelivr.net/npm/@zip.js/zip.js@2.7.57/dist/zip.min.js');
 const reader=new window.zip.ZipReader(new window.zip.BlobReader(file));
 try{
  const entries=await reader.getEntries();
  const entry=entries.find(x=>/\/(?:parcel_lookup_v1\.sqlite)$/.test('/'+x.filename));
  if(!entry)throw Error('В архива няма parcel_lookup_v1.sqlite.');
  if(entry.uncompressedSize>150000000)throw Error('Индексът е твърде голям.');
  const data=await entry.getData(new window.zip.Uint8ArrayWriter());
  const result=await openSQLite(data,file.name+' / '+entry.filename);try{await cacheSave(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),file.name+' / '+entry.filename)}catch(e){console.warn('Локалното запазване не е налично:',e)}return result;
 }finally{await reader.close()}
}
function rows(sql,params){const stmt=db.prepare(sql);try{stmt.bind(params);const out=[];while(stmt.step())out.push(stmt.getAsObject());return out}finally{stmt.free()}}
async function lookup(ids){
 if(!Array.isArray(ids)||!ids.length||ids.length>100)throw Error('Невалиден брой имоти (1–100).');
 const geometry=await geometryRecords();
 const results=ids.map(raw=>{
  const input=String(raw).trim(),base=input.split('.').slice(0,3).join('.');
  const empty={input,cadnum:base,status:'ПРЕДСТОИ',geojson:{type:'FeatureCollection',features:[]}};
  if(!validId(input))return {...empty,note:'Невалиден кадастрален идентификатор.'};
  if(!db){const spatial=geometry[base];if(spatial?.geojson?.features?.length)return {...spatial,input,status:'Намерен',caveat:'Архивна геометрия от публикувания набор. Актуално пресичане: ПРЕДСТОИ.'};return {...empty,note:'Няма публикувана геометрия за този имот. Пълният кадастрален индекс не е интегриран: ПРЕДСТОИ.'};}
  const parcels=rows('SELECT cadnum,ekattefn,place,area_m2 FROM parcels WHERE cadnum=?',[base]);
  if(!parcels.length)return {...empty,status:'Не е намерен',note:'Няма запис в локалния кадастрален индекс.'};
  const p=parcels[0];
  const spatial=geometry[base];
  if(spatial?.geojson?.features?.length)return {...spatial,input,status:'Намерен',caveat:'Геометрия от архивна регионална FileGDB; актуални зонови граници и нормативно пресичане не са удостоверени.'};
  const overlays=rows('SELECT sitecode,name_bg,order_no,dv,area_ha_source FROM overlays WHERE cadnum=? ORDER BY sitecode',[base]);
  return {...empty,settlement:p.ekattefn,locality:p.place,area_m2_source:p.area_m2,archived_overlay_records:overlays,note:'Имотът е намерен в архивния индекс. Геометрията и актуалното пространствено пресичане остават ПРЕДСТОИ.'};
 });
 const spatialResults=results.filter(x=>x.status==='Намерен'&&x.geojson?.features?.length);
 return {results,summary:{found_count:spatialResults.length,requested_count:ids.length,geometry_area_sum_m2:spatialResults.reduce((sum,x)=>sum+(x.area_m2_geometry||0),0),archived_zones:[],note:db?'Индекс: '+source+'. Реална архивна имотна геометрия е налична само за подготвените идентификатори; за останалите: ПРЕДСТОИ. Няма удостоверено актуално зонално пресичане.':'Автоматична справка по публикуваните архивни геометрии; пълният кадастрален индекс и актуалните пресичания: ПРЕДСТОИ.'},geometry_qa:[]};
}
window.V26BrowserGIS=Object.freeze({lookup,loadArchive,loadGeometryFile,restoreCachedIndex,isLoaded:()=>!!db});
function mount(){
 const anchor=document.getElementById('v26LocalIndexMount')||document.getElementById('zipDrop')||document.getElementById('extract');
 if(!anchor||document.getElementById('v26SqliteLoad'))return;
 const container=document.createElement('div');container.style.marginTop='8px';
 const input=document.createElement('input');input.type='file';input.accept='.zip,.sqlite';input.hidden=true;
 const btn=document.createElement('button');btn.id='v26SqliteLoad';btn.type='button';btn.className='secondary';btn.textContent='Зареди локален кадастрален индекс';
 const status=document.createElement('div');status.className='hint';status.textContent='ZIP/SQLite остава на компютъра. Не се изпраща към GitHub.';
 btn.onclick=()=>input.click();
 input.onchange=async()=>{if(!input.files?.[0])return;btn.disabled=true;status.textContent='Зареждане на SQLite индекса в браузъра…';try{const r=await loadArchive(input.files[0]);status.textContent='Индекс: '+r.parcels+' имота, '+r.overlays+' архивни пресичания. Геометрията се зарежда автоматично при ГИС справка, когато е налична.';document.dispatchEvent(new CustomEvent('v26:index-ready',{detail:{source:'manual'}}));}catch(e){status.textContent='Грешка: '+e.message;}finally{btn.disabled=false;input.value=''}};
 const geoInput=document.createElement('input');geoInput.type='file';geoInput.accept='.json,application/json';geoInput.hidden=true;
 const geoBtn=document.createElement('button');geoBtn.type='button';geoBtn.className='secondary';geoBtn.textContent='Зареди архивни имотни геометрии';geoBtn.onclick=()=>geoInput.click();
 const geoStatus=document.createElement('div');geoStatus.className='hint';geoStatus.textContent='Незадължителен JSON набор с реални полигони. Без изпращане към сървър.';
 geoInput.onchange=async()=>{if(!geoInput.files?.[0])return;geoBtn.disabled=true;try{const x=await loadGeometryFile(geoInput.files[0]);geoStatus.textContent='Заредени '+x.count+' архивни имотни геометрии. Източник: '+x.source+'. Актуално зонално пресичане: ПРЕДСТОИ.';}catch(e){geoStatus.textContent='Грешка: '+e.message}finally{geoBtn.disabled=false;geoInput.value=''}};
 container.append(btn,input,status,geoBtn,geoInput,geoStatus);status.textContent='Проверка за локално запазен кадастрален индекс…';restoreCachedIndex().then(ok=>{status.textContent=ok?'Кадастралният индекс е възстановен автоматично от този браузър. Геометрията се зарежда при справка.':'Изберете индекса еднократно; браузърът ще го запази локално за следващите посещения.';if(ok)document.dispatchEvent(new CustomEvent('v26:index-ready',{detail:{source:'cache'}}))}).catch(e=>{status.textContent='Автоматично възстановяване не е налично: '+e.message+'. Изберете индекса ръчно.'});anchor.id==='v26LocalIndexMount'?anchor.appendChild(container):anchor.insertAdjacentElement('afterend',container);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();