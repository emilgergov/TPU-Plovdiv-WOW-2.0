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
let selectedArchive=null;
const readButton=document.createElement('button');
readButton.type='button';readButton.className='secondary';readButton.textContent='Прочети TXT/JSON от архива повторно';
readButton.style.display='none';(document.getElementById('v26LocalIndexHost')||output).append(readButton);
const preview=document.createElement('div');preview.className='hint';preview.style.whiteSpace='pre-wrap';readButton.after(preview);
async function entryBytes(file,e){
 if(e.size_bytes>2097152||e.compressed_bytes>3145728)throw Error('Документът надхвърля лимита за текстово извличане.');
 const h=new DataView(await file.slice(e.local_header_offset,e.local_header_offset+30).arrayBuffer());
 if(h.byteLength!==30||u32(h,0)!==0x04034b50)throw Error('Невалидна ZIP заглавка.');
 const pos=e.local_header_offset+30+u16(h,26)+u16(h,28);
 if(pos+e.compressed_bytes>file.size)throw Error('Невалиден ZIP запис.');
 const blob=file.slice(pos,pos+e.compressed_bytes);
 let buffer;
 if(e.compression===0)buffer=await blob.arrayBuffer();
 else if(e.compression===8&&typeof DecompressionStream!=='undefined')buffer=await new Response(blob.stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
 else throw Error('Неподдържана компресия.');
 if(buffer.byteLength!==e.size_bytes)throw Error('Несъответствие в размера.');
 return new Uint8Array(buffer);
}
async function docxText(bytes){
 if(!window.fflate?.unzipSync)throw Error('DOCX четецът не е зареден.');
 const parts=window.fflate.unzipSync(bytes),xml=parts['word/document.xml'];
 if(!xml)throw Error('DOCX без основен документ.');
 const doc=new DOMParser().parseFromString(new TextDecoder().decode(xml),'application/xml');
 if(doc.getElementsByTagName('parsererror').length)throw Error('Невалиден DOCX XML.');
 const paragraphs=Array.from(doc.getElementsByTagNameNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main','p'));
 return paragraphs.map(p=>Array.from(p.getElementsByTagNameNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main','t')).map(t=>t.textContent).join('')).filter(Boolean).join('\n');
}
let pdfJsPromise=null;
async function pdfText(bytes){
 if(!pdfJsPromise)pdfJsPromise=(async()=>{
  if(!window.pdfjsLib){
   const script=document.createElement('script');
   script.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
   script.crossOrigin='anonymous';
   await new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=()=>reject(Error('PDF четецът не може да се зареди.'));document.head.appendChild(script)});
  }
  if(!window.pdfjsLib?.getDocument)throw Error('PDF четецът не е наличен.');
  return window.pdfjsLib;
 })();
 const lib=await pdfJsPromise;
 const task=lib.getDocument({data:bytes,disableWorker:true,useSystemFonts:true});
 const pdf=await task.promise,lines=[];
 try{
  for(let pageNo=1;pageNo<=Math.min(pdf.numPages,70);pageNo++){
   const page=await pdf.getPage(pageNo),content=await page.getTextContent();
   const text=content.items.map(x=>x.str||'').join(' ').trim();
   if(text)lines.push('[Страница '+pageNo+'] '+text);
  }
 }finally{await pdf.destroy()}
 if(!lines.length)throw Error('PDF без извлекаем текст (вероятно сканиран).');
 return lines.join('\n');
}
async function entryText(file,e){
 const bytes=await entryBytes(file,e);
 if(/\.docx$/i.test(e.path))return docxText(bytes);
 if(/\.pdf$/i.test(e.path))return pdfText(bytes);
 return new TextDecoder('utf-8').decode(bytes);
}
readButton.onclick=async()=>{
 const inv=window.V26ArchiveInventory;if(!inv||!selectedArchive)return;
 readButton.disabled=true;preview.textContent='Четене на текстови файлове…';
 const chosen=inv.files.filter(f=>/\.(txt|json|csv|md|docx|pdf)$/i.test(f.path)&&f.size_bytes<=2097152).slice(0,35);
 const files=[];
 for(const e of chosen){
  try{const t=await entryText(selectedArchive,e);files.push({path:e.path,text:t.slice(0,16000),truncated:t.length>16000});}
  catch(err){files.push({path:e.path,error:String(err.message||err)});}
 }
 const report={archive:inv.archive,files,verification:'CONTENT_PREVIEW_ONLY'};
 window.V26ArchiveTextPreview=report;
 document.dispatchEvent(new CustomEvent('v26:archive-text-preview',{detail:report}));
 preview.textContent='Прочетени: '+files.filter(f=>!f.error).length+'/'+chosen.length+' файла. Съдържанието е за работен проект.\n'+files.map(f=>f.path+' — '+(f.error||'прочетен')).join('\n');
 readButton.disabled=false;
};

async function inspect(file){
 const token=++generation;delete window.V26ArchiveInventory;delete window.V26ArchiveTextPreview;selectedArchive=file;document.dispatchEvent(new Event('v26:archive-changed'));readButton.style.display='none';preview.textContent='';
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
 readButton.style.display='inline-block';window.V26ArchiveInventory={archive:file.name,archive_bytes:file.size,entries,files,source:'browser-central-directory',verified_at:new Date().toISOString()};document.dispatchEvent(new CustomEvent('v26:archive-inventory',{detail:window.V26ArchiveInventory}));
 output.textContent='ZIP проверен локално: '+entries+' файла; '+gis+' възможни ГИС файла. Архивът не е качван. Това е проверка на съдържанието, не ГИС анализ.';
 // Automatically extract supported local text evidence for V27; no upload occurs here.
 await readButton.onclick();
 }catch(e){if(token===generation){delete window.V26ArchiveInventory;readButton.style.display='none';output.textContent='ZIP каталог: '+e.message}}
}
input.addEventListener('change',()=>inspect(input.files?.[0]));
drop.addEventListener('drop',e=>{const file=e.dataTransfer?.files?.[0];if(file)inspect(file)});
document.getElementById('reset')?.addEventListener('click',()=>{generation++;output.style.display='none';output.textContent='';delete window.V26ArchiveInventory});
})();
