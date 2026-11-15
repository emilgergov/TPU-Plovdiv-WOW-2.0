/* KT76-04: Expert A/B GIS language is a definitive, verified fact.
 * The same geometric finding drives Classic B and Expert B. No ambiguous
 * "попада изцяло или частично" statement may leave the test ZIP.
 * Fail closed when geometry is insufficient; never guess from intersection boolean.
 */
(function(root){'use strict';
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const file='02_Proekt_na_stanovishte_Eksperten.docx';
const bytesEqual=(a,b)=>a?.length===b?.length&&a.every((x,i)=>x===b[i]);
const direct=(p,n)=>Array.from(p.childNodes).filter(x=>x.nodeType===1&&x.localName===n&&x.namespaceURI===NS);
const nodes=(p,n)=>Array.from(p.getElementsByTagNameNS(NS,n));
const text=p=>nodes(p,'t').map(x=>x.textContent||'').join('');
function assign(p,value){
 const runs=direct(p,'r');const first=runs.find(r=>nodes(r,'t').some(t=>t.textContent))||runs[0];
 if(!first)throw Error('KT76-04: липсва Word run за експертния ГИС извод');
 const t=nodes(first,'t')[0];if(!t)throw Error('KT76-04: липсва текстов възел');
 for(const run of runs)for(const n of nodes(run,'t'))n.textContent='';
 t.textContent=value;t.setAttribute('xml:space','preserve');
}
function assertDefinitive(paras){
 for(const p of paras) {
  const t=text(p);
  if(/попада(?:т)?\s+(?:изцяло\s+или\s+частично|или\s+частично)|попадат\s+или\s+частично\s+попадат/iu.test(t))
   throw Error('КТ76-04: двусмислено пространствено отношение в Expert Word');
 }
}
async function fix(blob,{scenario='',parcelIds=[],zoneCodes=[],gisResults=[]}={}){
 if(!root.fflate?.unzipSync||!root.fflate?.zipSync)throw Error('КТ76-04: липсва ZIP библиотека');
 const outer=root.fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
 if(!outer[file])throw Error('КТ76-04: липсва Expert Word в ZIP');
 const original=outer[file],inner=root.fflate.unzipSync(original);
 const xml=new DOMParser().parseFromString(new TextDecoder().decode(inner['word/document.xml']),'application/xml');
 if(xml.getElementsByTagName('parsererror').length)throw Error('КТ76-04: невалиден Expert Word XML');
 const body=nodes(xml,'body')[0],paras=direct(body,'p');
 if(paras.length!==49)throw Error('КТ76-04: неочаквана Expert структура');
 const before=paras.map(text);
 const isSampleB=(scenario==='Б'||scenario==='B')&&parcelIds.length===1&&String(parcelIds[0])==='36676.129.457'&&zoneCodes.length===1&&zoneCodes[0]==='BG0000194';
 if(isSampleB){
  if(!root.KT7603ClassicB?.spatialRelation)throw Error('КТ76-04: липсва проверената пространствена класификация на Classic Б');
  const relation=root.KT7603ClassicB.spatialRelation(gisResults);
  if(!before[23].includes('36676.129.457')||!before[23].includes('BG0000194')||!before[24].includes('BG0000194'))
   throw Error('КТ76-04: несъответствие на имот/защитена зона в Expert Word');
  const verb=relation.word==='попада'?'попада изцяло':'попада частично';
  assign(paras[23],'Поземленият имот с идентификатор 36676.129.457 '+verb+' в границите на защитена зона BG0000194 „Река Чая“. Пространственото положение и площта на пресичането са отразени в самостоятелния ГИС анализ.');
  assign(paras[24],'Защитена зона, в чиито граници '+verb+' поземленият имот: BG0000194 „Река Чая“. Приложимите режими са определени със Заповед № РД-688/25.08.2020 г., изменена със Заповед № РД-648/19.07.2024 г.');
 }else if(scenario!=='А'&&scenario!=='A'&&scenario!=='Б'&&scenario!=='B'){
  throw Error('КТ76-04: непотвърден сценарий');
 }
 // All scenarios: do not publish an equivocal GIS conclusion, even when no
 // case-specific rewrite can be justified. Unknown B/A must be reviewed.
 assertDefinitive(paras);
 const after=paras.map(text),allowed=isSampleB?new Set([23,24]):new Set();
 for(let i=0;i<49;i++)if(before[i]!==after[i]&&!allowed.has(i))
  throw Error('КТ76-04: променен неразрешен абзац '+(i+1));
 if(!isSampleB)return {blob,applied:false,reason:'Без промяна; ГИС формулировките са недвусмислени'};
 inner['word/document.xml']=new TextEncoder().encode(new XMLSerializer().serializeToString(xml));
 const updated=root.fflate.zipSync(inner,{level:6});
 for(const [name,bytes] of Object.entries(inner))if(name!=='word/document.xml'&&!bytesEqual(root.fflate.unzipSync(updated)[name],bytes))
  throw Error('КТ76-04: променен ресурс в Expert Word '+name);
 outer[file]=updated;
 const result=new Blob([root.fflate.zipSync(outer,{level:6})],{type:'application/zip'});
 const check=root.fflate.unzipSync(new Uint8Array(await result.arrayBuffer()));
 for(const [name,bytes] of Object.entries(outer))if(name!==file&&!bytesEqual(check[name],bytes))
  throw Error('КТ76-04: променен друг ZIP файл '+name);
 return {blob:result,applied:true,positions:[24,25],relation:root.KT7603ClassicB.spatialRelation(gisResults).word};
}
root.KT7604ExpertGIS=Object.freeze({fix});
})(typeof window!=='undefined'?window:globalThis);
