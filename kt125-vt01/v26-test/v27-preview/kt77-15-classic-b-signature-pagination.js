/* KT77-15: targeted Classic B closing paragraph spacing; baseline KT77-13, after ZT insertion. No text, signature objects or etalons are changed. */
(function(root){'use strict';
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const FILES=['01_Proekt_na_stanovishte_Klasicheski.docx','02_Proekt_na_stanovishte_Eksperten.docx'];
const dec=new TextDecoder(), enc=new TextEncoder();
const direct=(e,n)=>Array.from(e.childNodes||[]).filter(c=>c.nodeType===1&&c.namespaceURI===NS&&c.localName===n);
const kids=(e,n)=>Array.from(e.getElementsByTagNameNS(NS,n));
const textOf=p=>kids(p,'t').map(t=>t.textContent||'').join('');
const eq=(a,b)=>!!a&&!!b&&a.length===b.length&&a.every((x,i)=>x===b[i]);
function add(xml,parent,name){const n=xml.createElementNS(NS,'w:'+name);parent.appendChild(n);return n;}
function formatting(p,xml){let pr=direct(p,'pPr')[0];if(!pr){pr=xml.createElementNS(NS,'w:pPr');p.insertBefore(pr,p.firstChild);}return pr;}
function compactBlank(p,xml){
 const pr=formatting(p,xml);
 let spacing=direct(pr,'spacing')[0];if(!spacing){spacing=xml.createElementNS(NS,'w:spacing');const anchor=Array.from(pr.children).find(n=>['ind','contextualSpacing','mirrorIndents','suppressOverlap','jc','textDirection','textAlignment','rPr'].includes(n.localName));if(anchor)pr.insertBefore(spacing,anchor);else pr.appendChild(spacing);}
 spacing.setAttributeNS(NS,'w:before','0');
 spacing.setAttributeNS(NS,'w:after','0');
 spacing.setAttributeNS(NS,'w:line','40');
 spacing.setAttributeNS(NS,'w:lineRule','exact');
}
function compactExpertBody(p,xml){
 const pr=direct(p,'pPr')[0];if(!pr)return false;
 const spacing=direct(pr,'spacing')[0];if(!spacing)return false;
 const after=Number(spacing.getAttributeNS(NS,'after')||0);
 if(after>=98){spacing.setAttributeNS(NS,'w:after','0');return true;}
 return false;
}
function process(input,isExpert){
 const archive=root.fflate.unzipSync(input),bytes=archive['word/document.xml'];
 if(!bytes)throw Error('КТ77-13: липсва document.xml');
 const xml=new DOMParser().parseFromString(dec.decode(bytes),'application/xml');
 if(xml.getElementsByTagName('parsererror').length)throw Error('КТ77-13: невалиден Word XML');
 const body=kids(xml,'body')[0],paragraphs=direct(body,'p');
 const before=paragraphs.map(textOf),pos=before.findIndex(x=>x.trim()==='С уважение,');
 if(pos<4||pos>=paragraphs.length-2)throw Error('КТ77-13: неподходящ подписен блок');
 for(let i=pos-4;i<pos;i++){
  if(before[i].trim()||kids(paragraphs[i],'pict').length||kids(paragraphs[i],'drawing').length)
    throw Error('КТ77-13: преди подписа има неочаквано съдържание');
  compactBlank(paragraphs[i],xml);
 }
 for(let i=pos+2;i<paragraphs.length;i++){
  if(!before[i].trim()&&!kids(paragraphs[i],'pict').length&&!kids(paragraphs[i],'drawing').length)compactBlank(paragraphs[i],xml);
 }
 let compressed=0;
 // KT77-15: Classic B only. Tighten AFTER spacing on the last three
 // substantive paragraphs preceding the four already compacted blank lines.
 // This avoids changing any earlier impact-direction text or the signature.
 if(!isExpert && paragraphs.length===44 && pos===41 &&
    before.some(t=>/проверка за допустимост/i.test(t)) &&
    before.slice(pos-4,pos).every(t=>!t.trim())){
   const closing=paragraphs.slice(pos-7,pos-4);
   if(closing.length!==3||closing.some(p=>!textOf(p).trim()))
     throw Error('КТ77-15: непотвърдена структура на финалните абзаци в Classic Б');
   for(const p of closing){
     const pr=direct(p,'pPr')[0],spacing=pr&&direct(pr,'spacing')[0];
     if(!spacing)throw Error('КТ77-15: липсва интервалът след заключителен абзац');
     const after=Number(spacing.getAttributeNS(NS,'after')||0);
     if(!Number.isFinite(after)||after<90||after>120)
       throw Error('КТ77-15: неочаквано отстояние на заключителен абзац');
     spacing.setAttributeNS(NS,'w:after','0');
     compressed++;
   }
 }
 if(isExpert){
  paragraphs.forEach((p,i)=>{if(before[i].trim()&&before[i].trim()!=='С уважение,'&&compactExpertBody(p,xml))compressed++;});
  if(compressed<10)throw Error('КТ77-13: неочаквана експертна структура');
 }
 if(paragraphs.map(textOf).some((t,i)=>t!==before[i]))throw Error('КТ77-13: промяна на текст');
 if(kids(xml,'pict').length<1)throw Error('КТ77-13: липсва запазеният графичен подпис');
 const result={...archive,'word/document.xml':enc.encode(new XMLSerializer().serializeToString(xml))};
 const bytesOut=root.fflate.zipSync(result,{level:6}),verified=root.fflate.unzipSync(bytesOut);
 for(const [name,part]of Object.entries(archive))if(name!=='word/document.xml'&&!eq(part,verified[name]))throw Error('КТ77-13: променен ресурс '+name);
 return {bytes:bytesOut,paragraphCount:before.length,compressed,signaturePosition:pos+1};
}
async function fix(blob){
 if(!root.fflate?.zipSync||!root.fflate?.unzipSync)throw Error('КТ77-13: липсва fflate');
 const original=root.fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
 const result={...original},edits=[];
 for(let i=0;i<FILES.length;i++){
  const name=FILES[i];if(!original[name])throw Error('КТ77-13: липсва '+name);
  const out=process(original[name],i===1);result[name]=out.bytes;edits.push({name,...out});
 }
 const packed=root.fflate.zipSync(result,{level:6}),check=root.fflate.unzipSync(packed);
 for(const [name,bytes]of Object.entries(original))if(!FILES.includes(name)&&!eq(bytes,check[name]))throw Error('КТ77-13: променен ZIP ресурс '+name);
 return {blob:new Blob([packed],{type:'application/zip'}),edits};
}
root.KT7713SignaturePagination=Object.freeze({fix});
})(window);
