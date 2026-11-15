/* KT77-21: Non-reference Classic B acceptance aligned with KT39-B source.
 * The original KT77-08 fixture check remains EXACTLY unchanged for the approved
 * 36676.129.457 / BG0000194 test. For other cases, compare ALL KT77-10
 * immutable paragraphs to the real original KT39-B reference DOCX.
 * Read-only; never alters generated ZIP, DOCX, text, or document styles. */
(function(root){'use strict';
const previous=root.KT7708ClassicBGuard;
const generator=root.KT7710LockedClassic;
if(!previous?.verify||!generator?.immutable){console.error('KT77-21 guard dependencies missing');return;}
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const NAME='01_Proekt_na_stanovishte_Klasicheski.docx';
const immutable=Array.from(generator.immutable);
const editable=Array.from(generator.editable||[]);
const text=p=>Array.from(p.getElementsByTagNameNS(NS,'t')).map(n=>n.textContent||'').join('');
const parse=bytes=>{
 const xml=new DOMParser().parseFromString(new TextDecoder().decode(bytes),'application/xml');
 if(xml.getElementsByTagName('parsererror').length)throw Error('КТ77-21: невалиден Word XML');
 const body=xml.getElementsByTagNameNS(NS,'body')[0];
 const paragraphs=Array.from(body?.childNodes||[]).filter(n=>n.nodeType===1&&n.namespaceURI===NS&&n.localName==='p');
 if(paragraphs.length!==43)throw Error('КТ77-21: Classic Б не съдържа заключените 43 абзаца');
 return paragraphs;
};
let templatePromise=null;
async function source(){
 if(!templatePromise)templatePromise=(async()=>{
  const url=new URL('v27-preview/etalon/KT39-B.docx',document.baseURI);
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok)throw Error('КТ77-21: недостъпен заключен Word образец');
  const files=root.fflate.unzipSync(new Uint8Array(await response.arrayBuffer()));
  return {files,paragraphs:parse(files['word/document.xml'])};
 })().catch(e=>{templatePromise=null;throw e});
 return templatePromise;
}
async function verify(blob,options={}){
 const mode=options.scenario==='B'?'Б':options.scenario==='A'?'А':options.scenario;
 if(mode==='А')return previous.verify(blob,options);
 if(mode!=='Б')return previous.verify(blob,options);
 const ids=(options.parcelIds||[]).map(String);
 const zones=(options.zoneCodes||[]).map(String);
 const reference=ids.length===1&&ids[0]==='36676.129.457'&&zones.length===1&&zones[0]==='BG0000194';
 if(reference)return previous.verify(blob,options);
 if(!root.fflate?.unzipSync)throw Error('КТ77-21: липсва ZIP библиотека');
 if(!ids.length||!zones.length)throw Error('КТ77-21: липсват потвърдени ГИС имоти или защитени зони');
 const outer=root.fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
 if(!outer[NAME])throw Error('КТ77-21: липсва Classic Б');
 const entries=root.fflate.unzipSync(outer[NAME]);
 const current=parse(entries['word/document.xml']);
 const ref=await source();
 const different=immutable.filter(i=>text(current[i-1])!==text(ref.paragraphs[i-1]));
 if(different.length)throw Error('КТ77-21: изменени заключени абзаци '+different.join(', ')+'. ZIP не е създаден.');
 const missing=editable.filter(i=>!text(current[i-1]).trim()||/\[\[|\[ЗА ЕКСПЕРТНА ПРОВЕРКА|ПРЕДСТОИ/iu.test(text(current[i-1])));
 if(missing.length)throw Error('КТ77-21: липсват допустими променливи абзаци '+missing.join(', '));
 const heading=text(current[10]);
 if(ids.some(id=>!heading.includes(id)))throw Error('КТ77-21: липсва потвърден ПИ в заглавието');
 const combined=current.map(text).join('\n');
 if(zones.some(code=>!combined.includes(code)))throw Error('КТ77-21: липсва потвърдена защитена зона');
 for(const [name,bytes] of Object.entries(ref.files)){
  if(name==='word/document.xml')continue;
  const actual=entries[name];
  if(!actual||actual.length!==bytes.length||actual.some((v,i)=>v!==bytes[i]))
   throw Error('КТ77-21: променено оформление или ресурс '+name);
 }
 return Object.freeze({passed:true,scenario:'Б',paragraphs:43,checkedImmutable:immutable.length,checkedEditable:editable.length,source:'KT39-B.docx',readonly:true});
}
root.KT7708ClassicBGuard=Object.freeze({...previous,verify});
})(window);
