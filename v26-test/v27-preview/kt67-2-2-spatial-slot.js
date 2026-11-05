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
// KT68: restore the four run styles of the approved "Относно" paragraph in
// both Word outputs, without touching their underlying institutional shell.
// Original KT42 has filled the whole subject into the first (bold) run.
function formatGeneratedWord(bytes,{scenario,parcelIds=[],zoneCodes=[],kind='classic'}={}){
 const zip=root.fflate.unzipSync(bytes),raw=zip['word/document.xml'];
 if(!raw)throw Error('КТ68: липсва Word XML за стиловата проверка.');
 const tree=new DOMParser().parseFromString(new TextDecoder().decode(raw),'application/xml');
 if(tree.getElementsByTagName('parsererror').length)throw Error('КТ68: грешка в Word XML.');
 const body=tree.getElementsByTagNameNS(ns,'body')[0];
 const ps=Array.from(body?.children||[]).filter(p=>p.localName==='p');
 const expected=kind==='expert'?49:(scenario==='А'?41:43);
 if(ps.length!==expected)throw Error('КТ68: отклонение от заключената Word структура.');
 const allText=p=>Array.from(p.getElementsByTagNameNS(ns,'t'));
 const value=p=>allText(p).map(t=>t.textContent).join('');
 const subj=ps[10],ts=allText(subj),full=value(subj);
 const head='Относно: Уведомление за инвестиционно предложение (ИП): ';
 const split=full.lastIndexOf('“ в поземлен');
 if(!full.startsWith(head+'„')||split<head.length||ts.length<4)
  throw Error('КТ68: неизвестна структура на „Относно“; форматирането е спряно без подмяна.');
 let tail=full.slice(split+1),quoted=full.slice(head.length,split+1);
 const ids=Array.isArray(parcelIds)?parcelIds:[];
 if(ids.length===1)tail=tail.replace(/^ в поземлени имоти с идентификатори /u,' в поземлен имот с идентификатор ');
 const pieces=['Относно',': Уведомление за инвестиционно предложение (ИП): ',quoted,tail];
 const runs=pieces.map((_,i)=>ts[i]?.parentNode);
 const bold=r=>{const pr=Array.from(r?.children||[]).find(x=>x.localName==='rPr');
   const b=Array.from(pr?.children||[]).find(x=>x.localName==='b');
   return !!b&&b.getAttributeNS(ns,'val')!=='0'&&b.getAttribute('w:val')!=='0';};
 if(!bold(runs[0])||bold(runs[1])||!bold(runs[2])||bold(runs[3]))
  throw Error('КТ68: заглавният стил на Word е различен от еталоните КТ35/39/R02.');
 for(let i=0;i<ts.length;i++){ts[i].textContent=pieces[i]||'';ts[i].setAttribute('xml:space','preserve');}
 // Only variable spatial paragraphs can change; approved example case text is
 // left intact. The GIS intersection/geometry itself is NEVER changed.
 const spatialIndex=kind==='expert'?23:scenario==='А'?22:23;
 const p=ps[spatialIndex],before=value(p);
 if(scenario==='Б'&&/е установено пространствено пресичане със защитена зона/u.test(before)){
   if(!ids.length||!zoneCodes.length)throw Error('КТ68: липсват потвърдени имоти или кодове на зони.');
   const one=ids.length===1;
   const leading=one?'Поземленият имот с идентификатор '+ids[0]:
      'Един или повече от поземлените имоти с идентификатори '+ids.join(', ');
   const zoneText=(zoneCodes.length===1?'защитена зона ':'защитени зони ')+zoneCodes.join(', ');
   const after=leading+' '+(one?'попада':'попадат')+' изцяло или частично в границите на '+zoneText+
    '. Конкретното пространствено положение и площта на попадане са отразени в самостоятелния ГИС анализ.';
   const nodes=allText(p);
   nodes[0].textContent=after;nodes[0].setAttribute('xml:space','preserve');
   for(let i=1;i<nodes.length;i++)nodes[i].textContent='';
 }
 if(scenario==='А'&&ids.length===1&&/^Поземлените имоти с идентификатори /u.test(before)){
   const after=before.replace(/^Поземлените имоти с идентификатори /u,'Поземленият имот с идентификатор ')
     .replace(' не попадат в границите',' не попада в границите');
   const nodes=allText(p);nodes[0].textContent=after;nodes[0].setAttribute('xml:space','preserve');
   for(let i=1;i<nodes.length;i++)nodes[i].textContent='';
 }
 if(scenario==='Б'){
   const zonePara=ps[24],old=value(zonePara);
   if(/^Пресичащи се защитени зони:/u.test(old)){
     const nodes=allText(zonePara);
     nodes[0].textContent=old.replace(/^Пресичащи се защитени зони:/u,
       'Защитени зони, в чиито граници попада имотът или попадат разглежданите имоти:');
     nodes[0].setAttribute('xml:space','preserve');
     for(let i=1;i<nodes.length;i++)nodes[i].textContent='';
   }
 }
 zip['word/document.xml']=new TextEncoder().encode(new XMLSerializer().serializeToString(tree));
 return root.fflate.zipSync(zip,{level:6});
}
async function fix(blob,{scenario,zones=[],parcelIds=[]}={}){
 if(scenario!=='А'&&scenario!=='Б')return blob;
 const codes=[...new Set(zones.map(x=>String(typeof x==='string'?x:x?.sitecode||x?.code||'').trim()).filter(x=>/^BG\d{7}$/.test(x)))];
 if(scenario==='Б'&&!codes.length)throw Error('КТ67-2.2: няма потвърдена защитена зона за Б.');
 if(!root.fflate?.unzipSync||!root.fflate?.zipSync)throw Error('КТ67-2.2: липсва валидаторът на ZIP.');
 const outer=root.fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
 const name='01_Proekt_na_stanovishte_Klasicheski.docx';
 if(!outer[name])throw Error('КТ67/68: липсва класически Word.');
 outer[name]=scenario==='А'?patchClassicAHeader(outer[name]):patchWord(outer[name],codes);
 const ids=Array.isArray(parcelIds)?parcelIds:[];
 outer[name]=formatGeneratedWord(outer[name],{scenario,parcelIds:ids,zoneCodes:codes,kind:'classic'});
 const expertName='02_Proekt_na_stanovishte_Eksperten.docx';
 if(!outer[expertName])throw Error('КТ68: липсва експертният Word.');
 outer[expertName]=formatGeneratedWord(outer[expertName],{scenario,parcelIds:ids,zoneCodes:codes,kind:'expert'});
 return new Blob([root.fflate.zipSync(outer,{level:0})],{type:'application/zip'});
}
root.KT6722SpatialFix=Object.freeze({fix,patchWord,patchClassicAHeader,formatGeneratedWord});
})(window);