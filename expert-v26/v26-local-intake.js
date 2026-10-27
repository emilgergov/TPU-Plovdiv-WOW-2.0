(()=>{'use strict';
const rx=/\b\d{5}\.\d+\.\d+(?:\.\d+){0,2}\b/g;
function parcelId(id){return String(id).split('.').slice(0,3).join('.')}
function u16(v,p){return v.getUint16(p,true)}function u32(v,p){return v.getUint32(p,true)}
function loadScript(src){return new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=src;el.onload=resolve;el.onerror=()=>reject(Error('Неуспешно зареждане на библиотека: '+src));document.head.appendChild(el)})}
async function readEntry(bytes,v,item){
 const h=item.offset;if(h+30>bytes.byteLength||u32(v,h)!==0x04034b50)throw Error('Невалиден ZIP запис.');
 const start=h+30+u16(v,h+26)+u16(v,h+28);
 if(start+item.packed>bytes.byteLength)throw Error('Повреден ZIP запис.');
 if(item.method===0)return bytes.slice(start,start+item.packed);
 if(!window.fflate?.unzlibSync)await loadScript('https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js');
 const compressed=new Uint8Array(bytes,start,item.packed);
 const result=window.fflate.inflateSync(compressed);
 return result.buffer.slice(result.byteOffset,result.byteOffset+result.byteLength);
}
async function extractText(data,name){
 if(/\.(txt|csv|json|md)$/i.test(name))return new TextDecoder('utf-8').decode(data);
 if(/\.pdf$/i.test(name)){
  if(!window.pdfjsLib)await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const doc=await window.pdfjsLib.getDocument({data:new Uint8Array(data)}).promise;
  const parts=[];for(let i=1;i<=Math.min(doc.numPages,100);i++){const page=await doc.getPage(i);const content=await page.getTextContent();parts.push(content.items.map(x=>x.str||'').join(' '))}
  return parts.join('\n');
 }
 if(/\.docx$/i.test(name)){
  if(!window.mammoth)await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js');
  return (await window.mammoth.extractRawText({arrayBuffer:data})).value||'';
 }
 return '';
}
async function process(file){
 if(!file||file.size>40*1024*1024)throw Error('Изберете ZIP до 40 MB.');
 const bytes=await file.arrayBuffer(),v=new DataView(bytes),list=[];let e=-1;
 for(let p=bytes.byteLength-22;p>=Math.max(0,bytes.byteLength-65557);p--)if(u32(v,p)===0x06054b50){e=p;break}
 if(e<0)throw Error('Невалиден ZIP.');
 const n=u16(v,e+10);if(n>500)throw Error('Твърде много файлове.');
 let p=u32(v,e+16),total=0;
 for(let i=0;i<n;i++){
  if(p+46>bytes.byteLength||u32(v,p)!==0x02014b50)throw Error('Невалиден ZIP каталог.');
  const method=u16(v,p+10),size=u32(v,p+24),packed=u32(v,p+20),flags=u16(v,p+8),len=u16(v,p+28),extra=u16(v,p+30),comment=u16(v,p+32),offset=u32(v,p+42);
  const name=new TextDecoder('utf-8').decode(new Uint8Array(bytes,p+46,len));
  p+=46+len+extra+comment;
  if(name.endsWith('/'))continue;
  if(name.includes('..')||name.startsWith('/')||name.includes('\\'))throw Error('Небезопасен път в ZIP.');
  if(flags&1||![0,8].includes(method))throw Error('Неподдържан ZIP запис.');
  total+=size;if(total>80*1024*1024)throw Error('Твърде голям разархивиран архив.');
  list.push({name,method,size,packed,offset});
 }
 const docs=[],all=new Set(),leading=new Set(),other=new Set();
 for(const item of list){
  let status='описан',text='';
  if(/\.(txt|csv|json|md|pdf|docx)$/i.test(item.name)&&item.size<=20*1024*1024){
   try{
    const unpacked=await readEntry(bytes,v,item);
    if(unpacked.byteLength!==item.size)throw Error('Несъответствие в ZIP размер.');
    text=await extractText(unpacked,item.name);
    status=text.trim()?'текстът е прочетен':'няма извлекаем текст (възможно сканиран документ)';
    for(const id of text.match(rx)||[]){const parcel=parcelId(id);all.add(parcel);other.add(parcel)}
    const location=text.match(/Местоположение на ИП\s*[:：]\s*([^\n\r]+)/i);
    if(/уведомлен/i.test(item.name+' '+text.slice(0,800))){for(const id of text.match(/(?:позем[еe]н\s+имот|ПИ)\s+(?:с\s+)?(?:идентификатор\s+)?(\d{5}\.\d+\.\d+)/gi)||[]){const m=id.match(/\d{5}\.\d+\.\d+/);if(m)leading.add(parcelId(m[0]));}}
   }catch(err){status='неуспешно извличане: '+err.message}
  }
  docs.push({filename:item.name,status});
 }
 for(const id of leading)other.delete(id);
 return {archive_name:file.name,archive_entries:list.length,files:docs,evidence:[],all_parcels:[...all],classification:{leading_candidates:[...leading],ancillary_candidates:[...other],warnings:['Локален предварителен текстов анализ. Проверете ролите ръчно.','PDF/DOCX се извличат локално, когато съдържат текст. Сканирани документи без текстов слой изискват отделно разчитане.']}};
}
window.V26LocalIntake={process};
})();