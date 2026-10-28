/* V26.4 original DOCX template bridge: templates must be hosted alongside this script. */
(function(root){'use strict';
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const MAP={A:[18,19,20,21],B:[16,17,18,19]};
const templatePaths={A:'templates/V26_3_Obrazec_A.docx',B:'templates/V26_3_Obrazec_B.docx'};
function nodes(p,n){return Array.from(p.getElementsByTagNameNS(NS,n))}
async function make(scenario,paragraphs){
 if(!MAP[scenario])throw Error('ГИС сценарият А/Б не е потвърден.');
 if(!Array.isArray(paragraphs)||paragraphs.length!==4||paragraphs.some(x=>!String(x).trim()))throw Error('Липсват четирите проверени абзаца.');
 if(!root.JSZip)throw Error('Липсва JSZip.');
 const response=await fetch(templatePaths[scenario],{cache:'no-store'});
 if(!response.ok)throw Error('Оригиналният образец '+scenario+' не е публикуван. Не се създава заместител.');
 const zip=await root.JSZip.loadAsync(await response.arrayBuffer());
 const entry=zip.file('word/document.xml');if(!entry)throw Error('Невалиден Word образец.');
 const xml=new DOMParser().parseFromString(await entry.async('string'),'application/xml');
 if(xml.getElementsByTagName('parsererror').length)throw Error('Грешка в Word XML.');
 const body=nodes(xml,'body')[0];
 const ps=Array.from(body.childNodes).filter(x=>x.nodeType===1&&x.namespaceURI===NS&&x.localName==='p');
 if(ps.length!==41)throw Error('Непозната версия на Word образеца.');
 for(let i=0;i<4;i++){
  const p=ps[MAP[scenario][i]],runs=nodes(p,'r');
  if(!runs.length||runs.some(r=>nodes(r,'highlight').length)||nodes(p,'drawing').length||nodes(p,'fldChar').length)throw Error('Защитен или сложен абзац; редакцията е спряна.');
  const texts=nodes(p,'t');if(!texts.length)throw Error('Липсва текстово поле.');
  texts[0].textContent=String(paragraphs[i]);texts[0].setAttribute('xml:space','preserve');
  for(const t of texts.slice(1))t.textContent='';
 }
 zip.file('word/document.xml',new XMLSerializer().serializeToString(xml));
 return zip.generateAsync({type:'blob',compression:'DEFLATE'});
}
root.V26TemplateWord=Object.freeze({make,templatePaths});
})(typeof window!=='undefined'?window:globalThis);
