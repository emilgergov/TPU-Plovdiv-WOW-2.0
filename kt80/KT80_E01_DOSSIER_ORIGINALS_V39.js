/* KT80 V39 — original-file view from currently selected local dossier.
 * Browser-only; no upload. Extracts only selected entry on explicit expert action.
 * Never executes HTML/SVG/scripts from an archive. */
(function(root){'use strict';
const $=id=>document.getElementById(id);
let activeUrl=null,openToken=0;
const types={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',bmp:'image/bmp',gif:'image/gif',tif:'image/tiff',tiff:'image/tiff',txt:'text/plain',csv:'text/plain',md:'text/plain',json:'text/plain',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation'};
const ext=x=>(String(x).match(/\.([a-z0-9]+)$/i)?.[1]||'').toLowerCase();
const u16=(d,p)=>d.getUint16(p,true),u32=(d,p)=>d.getUint32(p,true);
function normalize(n){return String(n||'').replace(/\\/g,'/')}
function nameSafe(name){const n=normalize(name),parts=n.split('/');return !!n&&!n.startsWith('/')&&!/^[a-z]:/i.test(n)&&!n.includes('\0')&&!parts.some(p=>p==='.'||p==='..'||/^[a-z]:$/i.test(p))}
function decode(bytes){return new TextDecoder('utf-8',{fatal:false}).decode(bytes)}
async function extractZIP(file,target){
 const bytes=await file.arrayBuffer(),d=new DataView(bytes);let e=-1;
 for(let i=bytes.byteLength-22;i>=Math.max(0,bytes.byteLength-65557);i--)if(u32(d,i)===0x06054b50){e=i;break}
 if(e<0)throw Error('ZIP каталогът не е разпознат');
 const count=u16(d,e+10);if(count>500)throw Error('ZIP съдържа повече от 500 записа');
 let pos=u32(d,e+16),match=null;
 for(let i=0;i<count;i++){
  if(pos+46>bytes.byteLength||u32(d,pos)!==0x02014b50)throw Error('Повреден ZIP каталог');
  const method=u16(d,pos+10),flags=u16(d,pos+8),packed=u32(d,pos+20),size=u32(d,pos+24),length=u16(d,pos+28),extra=u16(d,pos+30),comment=u16(d,pos+32),offset=u32(d,pos+42);
  const name=normalize(decode(new Uint8Array(bytes,pos+46,length)));
  pos+=46+length+extra+comment;
  if(!nameSafe(name))throw Error('Небезопасен път в ZIP: '+name.slice(0,120));
  if(name===target){match={name,method,flags,packed,size,offset};break}
 }
 if(!match)throw Error('Файлът не е намерен в текущия ZIP');
 if(match.flags&1)throw Error('Файлът е криптиран — необходимо е оригиналното приложение и парола');
 if(match.size>80*1024*1024)throw Error('Файлът е над разрешения размер за преглед');
 if(match.method!==0&&match.method!==8)throw Error('ZIP компресията не се поддържа');
 const off=match.offset;
 if(off+30>bytes.byteLength||u32(d,off)!==0x04034b50)throw Error('Невалиден локален ZIP запис');
 const start=off+30+u16(d,off+26)+u16(d,off+28);
 if(start+match.packed>bytes.byteLength)throw Error('Непълен ZIP запис');
 if(match.method===0)return bytes.slice(start,start+match.packed);
 if(root.fflate?.inflateSync){
  const out=root.fflate.inflateSync(new Uint8Array(bytes,start,match.packed));
  if(out.byteLength>80*1024*1024)throw Error('Превишен безопасен размер на разархивиране');
  return out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength);
 }
 if(typeof DecompressionStream==='function'){
  try{
   const stream=new Blob([bytes.slice(start,start+match.packed)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
   const out=await new Response(stream).arrayBuffer();
   if(out.byteLength>80*1024*1024)throw Error('Превишен безопасен размер');
   return out;
  }catch(e){throw Error('Неуспешна ZIP декомпресия: '+e.message)}
 }
 throw Error('Липсва ZIP декомпресор — отворете преписката чрез „Обработи преписката“');
}
function shell(){
 let modal=$('kt80OriginalPreview');
 if(modal)return modal;
 modal=document.createElement('section');modal.id='kt80OriginalPreview';modal.className='kt80-original-preview';modal.hidden=true;modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','kt80OriginalTitle');
 modal.innerHTML='<div class="kt80-original-panel"><div class="kt80-original-head"><strong id="kt80OriginalTitle">Оригинален документ</strong><button type="button" id="kt80OriginalClose" aria-label="Затвори прегледа">✕ Затвори</button></div><p id="kt80OriginalMessage" role="status"></p><div id="kt80OriginalContent"></div><a id="kt80OriginalDownload" download>↓ Изтегли оригинала</a></div>';
 document.body.append(modal);
 $('kt80OriginalClose').addEventListener('click',close);
 modal.addEventListener('click',e=>{if(e.target===modal)close()});
 return modal;
}
function close(){openToken++;const modal=$('kt80OriginalPreview');if(modal)modal.hidden=true;if(activeUrl){URL.revokeObjectURL(activeUrl);activeUrl=null}const body=$('kt80OriginalContent');if(body)body.replaceChildren()}
function previewContent(data,name){
 if(activeUrl){URL.revokeObjectURL(activeUrl);activeUrl=null}
 const media=types[ext(name)]||'application/octet-stream';
 const blob=new Blob([data],{type:media});activeUrl=URL.createObjectURL(blob);
 const download=$('kt80OriginalDownload');download.href=activeUrl;download.download=name.split('/').pop();
 const body=$('kt80OriginalContent');body.replaceChildren();
 if(media==='application/pdf'||media.startsWith('image/')){
  const viewer=document.createElement(media==='application/pdf'?'iframe':'img');
  viewer.src=activeUrl;viewer.className='kt80-original-viewer';
  if(viewer.tagName==='IFRAME'){viewer.title='Преглед на оригиналния PDF';viewer.setAttribute('sandbox','');}
  else viewer.alt='Изображение от оригиналния файл';
  body.append(viewer);
  $('kt80OriginalMessage').textContent='Преглед на оригинала. При нужда използвайте „Изтегли оригинала“.';
 }else if(['txt','csv','md','json'].includes(ext(name))){
  const pre=document.createElement('pre');pre.textContent=decode(new Uint8Array(data)).slice(0,300000);
  pre.className='kt80-original-text';body.append(pre);
  $('kt80OriginalMessage').textContent='Преглед на текстовото съдържание (макс. 300 000 знака).';
 }else{
  $('kt80OriginalMessage').textContent='Този формат не се визуализира надеждно в браузъра. Използвайте „Изтегли оригинала“ и го отворете с подходящото приложение.';
 }
}
async function openOriginal(filename){
 const input=$('kt80InputFile'),source=input?.files?.[0];if(!source)throw Error('Първо изберете оригиналната преписка');
 const token=++openToken;
 const modal=shell();modal.hidden=false;$('kt80OriginalTitle').textContent='Оригинал · '+filename;$('kt80OriginalMessage').textContent='Отваряне на документа…';
 $('kt80OriginalContent').replaceChildren();$('kt80OriginalDownload').removeAttribute('href');
 try{
  const data=/\.zip$/i.test(source.name)?await extractZIP(source,normalize(filename)):await source.arrayBuffer();
  if(token!==openToken)return;
  previewContent(data,filename);
 }catch(e){if(token!==openToken)return;$('kt80OriginalMessage').textContent='Не може да се отвори: '+(e?.message||e)}
}
document.addEventListener('kt80:case-reset',close);
root.KT80DossierOriginals=Object.freeze({openOriginal,close});
})(window);
