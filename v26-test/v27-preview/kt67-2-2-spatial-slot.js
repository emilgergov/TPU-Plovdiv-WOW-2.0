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
// KT68: Only the confidentiality geometry in Classic A is changed. Classic B
// is the approved visual reference, the KT56 original template is immutable.
function patchClassicAHeader(bytes){
 const zip=root.fflate.unzipSync(bytes),raw=zip['word/document.xml'];
 if(!raw)throw Error('КТ68: липсва Word XML в класически А.');
 const tree=new DOMParser().parseFromString(new TextDecoder().decode(raw),'application/xml');
 if(tree.getElementsByTagName('parsererror').length)throw Error('КТ68: невалиден Word XML.');
 const body=tree.getElementsByTagNameNS(ns,'body')[0];
 const paras=Array.from(body?.children||[]).filter(x=>x.localName==='p');
 const values=paras.slice(0,2).map(p=>Array.from(p.getElementsByTagNameNS(ns,'t')).map(t=>t.textContent).join('').trim());
 if(values[0]!=='Ниво на конфиденциалност 0'||values[1]!=='[TLP-WHITE]')
  throw Error('КТ68: неочакван ред на реквизитите в класически А.');
 function ensure(parent,name){
  let child=Array.from(parent.children).find(x=>x.namespaceURI===ns&&x.localName===name);
  if(!child){child=tree.createElementNS(ns,'w:'+name);parent.appendChild(child);}
  return child;
 }
 const set=(el,name,value)=>el.setAttributeNS(ns,'w:'+name,value);
 for(let i=0;i<2;i++){
  const pr=ensure(paras[i],'pPr');
  set(ensure(pr,'jc'),'val','right');
  const ind=ensure(pr,'ind'),spacing=ensure(pr,'spacing');
  for(const [name,value] of Object.entries({left:'0',right:'0',firstLine:'0'}))set(ind,name,value);
  for(const [name,value] of Object.entries({before:'0',after:'0',line:'240',lineRule:'auto'}))set(spacing,name,value);
  if(i===0&&!Array.from(pr.children).some(x=>x.namespaceURI===ns&&x.localName==='keepNext')){
   const keep=tree.createElementNS(ns,'w:keepNext');pr.insertBefore(keep,pr.firstChild);
  }
 }
 zip['word/document.xml']=new TextEncoder().encode(new XMLSerializer().serializeToString(tree));
 return root.fflate.zipSync(zip,{level:6});
}
async function fix(blob,{scenario,zones=[]}={}){
 if(scenario!=='А'&&scenario!=='Б')return blob;
 const codes=[...new Set(zones.map(x=>String(typeof x==='string'?x:x?.sitecode||x?.code||'').trim()).filter(x=>/^BG\d{7}$/.test(x)))];
 if(scenario==='Б'&&!codes.length)throw Error('КТ67-2.2: няма потвърдена защитена зона за Б.');
 if(!root.fflate?.unzipSync||!root.fflate?.zipSync)throw Error('КТ67-2.2: липсва валидаторът на ZIP.');
 const outer=root.fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
 const name='01_Proekt_na_stanovishte_Klasicheski.docx';
 if(!outer[name])throw Error('КТ67/68: липсва класически Word.');
 outer[name]=scenario==='А'?patchClassicAHeader(outer[name]):patchWord(outer[name],codes);
 return new Blob([root.fflate.zipSync(outer,{level:0})],{type:'application/zip'});
}
root.KT6722SpatialFix=Object.freeze({fix,patchWord,patchClassicAHeader});
})(window);