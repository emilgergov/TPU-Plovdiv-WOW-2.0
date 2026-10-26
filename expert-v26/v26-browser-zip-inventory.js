/* V26 Stage 6: browser-only ZIP central directory inspection; no upload, no Python. */
(()=>{'use strict';
const input=document.getElementById('casefile'),drop=document.getElementById('zipDrop');
if(!input||!drop)return;
const output=document.createElement('div');
output.id='v26BrowserInventory';output.className='hint';output.setAttribute('role','status');
output.style.cssText='display:none;border:1px solid #c7dfcf;border-radius:8px;padding:10px;white-space:pre-wrap';
document.getElementById('intakeResult').after(output);
const u16=(v,p)=>v.getUint16(p,true),u32=(v,p)=>v.getUint32(p,true);
let generation=0;
async function inspect(file){
 const token=++generation;delete window.V26ArchiveInventory;
 if(!file||!file.name.toLowerCase().endsWith('.zip'))return;
 output.style.display='block';output.textContent='Четене на ZIP каталога в браузъра…';
 try{
 const tailSize=Math.min(file.size,65557),tail=new DataView(await file.slice(file.size-tailSize).arrayBuffer());
 let end=-1;
 for(let i=tail.byteLength-22;i>=0;i--){if(u32(tail,i)===0x06054b50&&i+22+u16(tail,i+20)===tail.byteLength){end=i;break}}
 if(end<0)throw Error('Не е открит ZIP каталог.');
 const count=u16(tail,end+10),len=u32(tail,end+12),offset=u32(tail,end+16);
 if(count===65535||len===0xffffffff||offset===0xffffffff)throw Error('ZIP64 изисква разширен четец.');
 if(offset+len>file.size)throw Error('Невалиден ZIP каталог.');
 const data=new DataView(await file.slice(offset,offset+len).arrayBuffer());let p=0,entries=0,gis=0;const files=[];
 while(p+46<=data.byteLength&&u32(data,p)===0x02014b50){
 const flags=u16(data,p+8),n=u16(data,p+28),ex=u16(data,p+30),co=u16(data,p+32);
 if(p+46+n+ex+co>data.byteLength)throw Error('Непълен ZIP запис.');
 const name=new TextDecoder(flags&2048?'utf-8':'windows-1251').decode(new Uint8Array(data.buffer,data.byteOffset+p+46,n));
 if(!name.endsWith('/')){entries++;const isGis=/parcel_lookup|\.gdb[/\\]|\.gpkg$|\.geojson$|\.shp$|kadnum|kais_parcels|intersect/i.test(name);if(isGis)gis++;files.push({path:name,size_bytes:u32(data,p+24),compressed_bytes:u32(data,p+20),compression:u16(data,p+10),local_header_offset:u32(data,p+42),gis_candidate:isGis})}
 p+=46+n+ex+co;
 }
 if(!entries)throw Error('Не са открити файлове.');
 if(token!==generation)return;
 window.V26ArchiveInventory={archive:file.name,archive_bytes:file.size,entries,files,source:'browser-central-directory',verified_at:new Date().toISOString()};document.dispatchEvent(new CustomEvent('v26:archive-inventory',{detail:window.V26ArchiveInventory}));
 output.textContent='ZIP проверен локално: '+entries+' файла; '+gis+' възможни ГИС файла. Архивът не е качван. Това е проверка на съдържанието, не ГИС анализ.';
 }catch(e){if(token===generation){delete window.V26ArchiveInventory;output.textContent='ZIP каталог: '+e.message}}
}
input.addEventListener('change',()=>inspect(input.files?.[0]));
drop.addEventListener('drop',e=>{const file=e.dataTransfer?.files?.[0];if(file)inspect(file)});
document.getElementById('reset')?.addEventListener('click',()=>{generation++;output.style.display='none';output.textContent='';delete window.V26ArchiveInventory});
})();
