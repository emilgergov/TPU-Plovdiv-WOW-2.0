/* KT67-2.2: exact correction of a single variable spatial slot in the
 * generated Classic B DOCX. The original KT42 writer and KT56 template
 * remain immutable. No legal, fixed, or AI-authored paragraph is modified. */
(function(root){'use strict';
const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
function patchWord(bytes,codes){
 const doczip=root.fflate.unzipSync(bytes),xml=doczip['word/document.xml'];
 if(!xml)throw Error('КТ67-2.2: липсва Word XML в класическия Б.');
 const tree=new DOMParser().parseFromString(new TextDecoder().decode(xml),'application/xml');
 if(tree.getElementsByTagName('parsererror').length)throw Error('КТ67-2.2: грешка в Word XML.');
 const body=tree.getElementsByTagNameNS(ns,'body')[0];
 const paras=Array.from(body.children).filter(x=>x.localName==='p');
 if(paras.length!==43)throw Error('КТ67-2.2: неочаквана структура на класически Б.');
 const nodes=Array.from(paras[24].getElementsByTagNameNS(ns,'t'));
 const before=nodes.map(x=>x.textContent).join('');
 if(!/^Пресичащи се защитени зони:\s*\./u.test(before)) {
  const valid=codes.every(x=>before.includes(x));
  if(!valid)throw Error('КТ67-2.2: пространствените данни в Word не съвпадат с ГИС.');
  return bytes;
 }
 const after=before.replace(/^Пресичащи се защитени зони:\s*\./u,'Пресичащи се защитени зони: '+codes.join(', ')+'.');
 if(!nodes.length)throw Error('КТ67-2.2: няма текстов елемент в пространствения абзац.');
 nodes[0].textContent=after;
 nodes[0].setAttribute('xml:space','preserve');
 for(let i=1;i<nodes.length;i++)nodes[i].textContent='';
 doczip['word/document.xml']=new TextEncoder().encode(new XMLSerializer().serializeToString(tree));
 return root.fflate.zipSync(doczip,{level:6});
}
async function fix(blob,{scenario,zones=[]}={}){
 if(scenario!=='Б')return blob;
 const codes=[...new Set(zones.map(x=>String(typeof x==='string'?x:x?.sitecode||x?.code||'').trim()).filter(x=>/^BG\d{7}$/.test(x)))];
 if(!codes.length)throw Error('КТ67-2.2: няма потвърдена защитена зона за Б.');
 if(!root.fflate?.unzipSync||!root.fflate?.zipSync)throw Error('КТ67-2.2: липсва валидаторът на ZIP.');
 const outer=root.fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
 const name='01_Proekt_na_stanovishte_Klasicheski.docx';
 if(!outer[name])throw Error('КТ67-2.2: липсва класически Word Б.');
 outer[name]=patchWord(outer[name],codes);
 return new Blob([root.fflate.zipSync(outer,{level:0})],{type:'application/zip'});
}
root.KT6722SpatialFix=Object.freeze({fix,patchWord});
})(window);