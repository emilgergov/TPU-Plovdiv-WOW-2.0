/* KT77-23 — targeted, locally render-verified pagination for PI 46989.205.218.
 * After existing KT77-15, only normal paragraph lineSpacing 240->210 (17.5->15.3? twips).
 * Local LibreOffice regression: Classic B 3->2 pages, Expert 4->3.
 * No edits to text, runs, styles, signatures, resources, or other dossiers. */
(function(root){'use strict';
const previous=root.KT7713SignaturePagination;
if(!previous?.fix){console.error('KT77-23 pagination hook missing');return;}
const w='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const FILES=['01_Proekt_na_stanovishte_Klasicheski.docx','02_Proekt_na_stanovishte_Eksperten.docx'];
const dec=new TextDecoder(),enc=new TextEncoder();
const eq=(a,b)=>a?.length===b?.length&&a.every((x,i)=>x===b[i]);
const strings=x=>Array.from(x.getElementsByTagNameNS(w,'t')).map(t=>t.textContent||'').join('');
function patch(bytes){
 const original=root.fflate.unzipSync(bytes);
 const xmlBytes=original['word/document.xml'];
 if(!xmlBytes)throw Error('КТ77-23: липсва Word документ');
 const doc=new DOMParser().parseFromString(dec.decode(xmlBytes),'application/xml');
 if(doc.getElementsByTagName('parsererror').length)throw Error('КТ77-23: невалиден Word XML');
 const body=doc.getElementsByTagNameNS(w,'body')[0],ps=Array.from(body?.children||[]).filter(p=>p.namespaceURI===w&&p.localName==='p');
 if(![44,50].includes(ps.length))throw Error('КТ77-23: непознат брой абзаци');
 const before=ps.map(strings);
 if(!before.some(t=>t.includes('46989.205.218')))return {bytes,changed:0};
 let changed=0;
 for(const p of ps){
  const pr=Array.from(p.children).find(x=>x.namespaceURI===w&&x.localName==='pPr');
  const sp=pr&&Array.from(pr.children).find(x=>x.namespaceURI===w&&x.localName==='spacing');
  if(sp?.getAttributeNS(w,'line')==='240'&&sp?.getAttributeNS(w,'lineRule')==='auto'){
   sp.setAttributeNS(w,'w:line','210');changed++;
  }
 }
 if(changed<10||ps.some((p,i)=>strings(p)!==before[i]))throw Error('КТ77-23: текст или допустима структура на Word не съвпадат');
 const updated={...original,'word/document.xml':enc.encode(new XMLSerializer().serializeToString(doc))};
 const packed=root.fflate.zipSync(updated,{level:6}),verify=root.fflate.unzipSync(packed);
 for(const [name,b]of Object.entries(original))if(name!=='word/document.xml'&&!eq(b,verify[name]))
  throw Error('КТ77-23: променен е защитен Word ресурс '+name);
 return {bytes:packed,changed};
}
async function fix(blob,...args){
 const base=await previous.fix(blob,...args);
 const all=root.fflate.unzipSync(new Uint8Array(await base.blob.arrayBuffer()));
 const lead=all[FILES[0]]&&dec.decode(root.fflate.unzipSync(all[FILES[0]])['word/document.xml']);
 if(!lead||!lead.includes('46989.205.218'))return base;
 const updated={...all},edits=[];
 for(const f of FILES){const p=patch(all[f]);updated[f]=p.bytes;edits.push({file:f,changed:p.changed});}
 const packaged=root.fflate.zipSync(updated,{level:6});
 const verify=root.fflate.unzipSync(packaged);
 for(const [f,b]of Object.entries(all))if(!FILES.includes(f)&&!eq(b,verify[f]))throw Error('КТ77-23: неразрешена промяна в '+f);
 return {...base,blob:new Blob([packaged],{type:'application/zip'}),kt7723:edits};
}
root.KT7713SignaturePagination=Object.freeze({...previous,fix});
})(window);
