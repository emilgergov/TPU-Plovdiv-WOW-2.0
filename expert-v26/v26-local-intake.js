(()=>{'use strict';
const rx=/\b\d{5}\.\d+\.\d+(?:\.\d+){0,2}\b/g;
function u16(v,p){return v.getUint16(p,true)}function u32(v,p){return v.getUint32(p,true)}
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
  if(/\.(txt|csv|json|md)$/i.test(item.name)&&item.size<=1024*1024){
   const h=item.offset;if(h+30>bytes.byteLength||u32(v,h)!==0x04034b50)throw Error('Невалиден ZIP запис.');
   const start=h+30+u16(v,h+26)+u16(v,h+28);
   if(start+item.packed>bytes.byteLength)throw Error('Повреден ZIP запис.');
   const blob=new Blob([bytes.slice(start,start+item.packed)]);
   let unpacked;
   if(item.method===0)unpacked=await blob.arrayBuffer();
   else if(typeof DecompressionStream!=='undefined')unpacked=await new Response(blob.stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
   else{status='неподдържана компресия';docs.push({filename:item.name,status});continue}
   if(unpacked.byteLength!==item.size)throw Error('Несъответствие в ZIP размер.');
   text=new TextDecoder('utf-8').decode(unpacked);status='текстът е прочетен';
   const ids=[...text.matchAll(rx)].map(m=>m[0]);
   for(const id of ids){all.add(id);other.add(id)}
   const location=text.match(/Местоположение на ИП\s*[:：]\s*([^\n\r]+)/i);
   if(location&&/уведомлен/i.test(item.name+' '+text.slice(0,160))){
    for(const id of location[1].match(rx)||[])leading.add(id);
   }
  }
  docs.push({filename:item.name,status});
 }
 for(const id of leading)other.delete(id);
 return {archive_name:file.name,archive_entries:list.length,files:docs,evidence:[],all_parcels:[...all],classification:{leading_candidates:[...leading],ancillary_candidates:[...other],warnings:['Локален предварителен текстов анализ. Проверете ролите ръчно.','PDF/DOCX съдържание не се извлича от този модул.']}};
}
window.V26LocalIntake={process};
})();