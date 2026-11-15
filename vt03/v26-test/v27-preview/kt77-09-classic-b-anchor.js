/* KT77-09: frozen case-neutral paragraphs from accepted Classic B ZIP (2026-11-08).
 * Hidden reference property IDs are NOT used for GIS, metadata or legal decisions.
 * Source: accepted B/36676.129.457 before ZT insertion; only eight case-neutral
 * paragraphs (18,29-33,35-36) cloned with original approved OOXML formatting.
 * All remaining original 35 paragraphs are left byte-identical at XML-node level;
 * PDFs, Expert, A, ZIP README, templates, original KT76 modules remain untouched.
 * Any unsupported input fails closed; no invented official findings or orders.
 */
(function(root){'use strict';
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const CLASSIC='01_Proekt_na_stanovishte_Klasicheski.docx';
const BASE64='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';
const POSITIONS=Object.freeze([18,29,30,31,32,33,35,36]);
const txt=p=>Array.from(p.getElementsByTagNameNS(NS,'t')).map(t=>t.textContent||'').join('');
const paras=xml=>Array.from(xml.getElementsByTagNameNS(NS,'body')[0]?.childNodes||[]).filter(n=>n.nodeType===1&&n.localName==='p'&&n.namespaceURI===NS);
const equal=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>v===b[i]);
const decode=(bytes)=>new TextDecoder().decode(bytes);
let reference=null;
function source(){
 if(reference)return reference;
 if(!root.fflate?.unzlibSync)throw Error('КТ77-09: липсва fflate unzlib');
 const bytes=Uint8Array.from(atob(BASE64),c=>c.charCodeAt(0));
 const parsed=JSON.parse(decode(root.fflate.unzlibSync(bytes)));
 if(Object.keys(parsed).sort().join(',')!==POSITIONS.slice().sort((a,b)=>a-b).join(','))throw Error('КТ77-09: невалиден регистър на постоянните абзаци');
 const approved=root.KT7603ClassicB?.approved;
 if(!approved)throw Error('КТ77-09: липсва заключеният регистър КТ76-03');
 const out={};
 for(const i of POSITIONS){
  const xml=new DOMParser().parseFromString(parsed[i],'application/xml');
  if(xml.getElementsByTagName('parsererror').length)throw Error('КТ77-09: невалиден референтен абзац '+i);
  const p=xml.documentElement;
  if(p.namespaceURI!==NS||p.localName!=='p'||txt(p)!==approved[i])
   throw Error('КТ77-09: съдържанието на еталонен абзац '+i+' не съответства на заключения регистър');
  out[i]=p;
 }
 reference=Object.freeze(out);return reference;
}
async function fix(blob,{scenario='',parcelIds=[],zoneCodes=[]}={}){
 const mode=scenario==='B'?'Б':scenario==='A'?'А':scenario;
 if(mode==='А')return {blob,applied:false,reason:'Classic А е непроменен и се контролира от КТ66'};
 if(mode!=='Б')throw Error('КТ77-09: непотвърден сценарий');
 if(!Array.isArray(parcelIds)||!parcelIds.length||!Array.isArray(zoneCodes)||!zoneCodes.length)
  throw Error('КТ77-09: Б изисква реални идентификатори и потвърдени защитени зони');
 if(parcelIds.some(id=>!/^[0-9]{5}\.[0-9]+\.[0-9]+$/.test(String(id)))||zoneCodes.some(z=>!/^BG[0-9]{7}$/.test(String(z))))
  throw Error('КТ77-09: некоректни имотни идентификатори или кодове на ЗЗ');
 if(!root.fflate?.unzipSync||!root.fflate?.zipSync)throw Error('КТ77-09: липсва ZIP библиотека');
 const outer=root.fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
 if(!outer[CLASSIC])throw Error('КТ77-09: липсва Classic Б');
 const original=outer[CLASSIC];
 const inner=root.fflate.unzipSync(original);
 const doc=new DOMParser().parseFromString(decode(inner['word/document.xml']),'application/xml');
 if(doc.getElementsByTagName('parsererror').length)throw Error('КТ77-09: невалиден Word XML');
 const ps=paras(doc);
 if(ps.length!==43)throw Error('КТ77-09: нарушена структура от 43 абзаца');
 const input=ps.map(txt),whole=input.join('\n');
 for(const id of parcelIds)if(!input[10].includes(id))throw Error('КТ77-09: реалният имот '+id+' липсва от Относно');
 if(!zoneCodes.some(code=>whole.includes(code)))throw Error('КТ77-09: реалната защитена зона липсва');
 // The KT76-03 sample is already stabilized and must stay unchanged.
 const sample=parcelIds.length===1&&String(parcelIds[0])==='36676.129.457'&&zoneCodes.length===1&&String(zoneCodes[0])==='BG0000194';
 const ref=source();
 if(sample){
  for(const i of POSITIONS)if(input[i-1]!==txt(ref[i]))throw Error('КТ77-09: одобреният пример Б е променен — абзац '+i);
  return {blob,applied:false,reason:'Одобреният тест Б е съхранен'};
 }
 if(/\b36676\.129\.457\b/.test(whole)&&!parcelIds.includes('36676.129.457'))
  throw Error('КТ77-09: открит чужд тестов имот в реалния Classic Б');
 const replaced=[];
 for(const i of POSITIONS){
  const current=ps[i-1],replacement=doc.importNode(ref[i],true);
  current.parentNode.replaceChild(replacement,current);
  replaced.push(i);
 }
 const updated=paras(doc);
 if(updated.length!==43)throw Error('КТ77-09: регресия в броя абзаци');
 for(let i=0;i<43;i++){
  if(!POSITIONS.includes(i+1)&&txt(updated[i])!==input[i])
   throw Error('КТ77-09: недопустима промяна на променлив абзац '+(i+1));
  if(POSITIONS.includes(i+1)&&txt(updated[i])!==txt(ref[i+1]))
   throw Error('КТ77-09: неуспешно възстановяване на постоянен абзац '+(i+1));
 }
 const nextInner={...inner,'word/document.xml':new TextEncoder().encode(new XMLSerializer().serializeToString(doc))};
 const rebuilt=root.fflate.zipSync(nextInner,{level:6});
 const check=root.fflate.unzipSync(rebuilt);
 for(const [name,bytes] of Object.entries(inner))if(name!=='word/document.xml'&&!equal(bytes,check[name]))
  throw Error('КТ77-09: променен ресурс '+name);
 const nextOuter={...outer,[CLASSIC]:rebuilt};
 const result=new Blob([root.fflate.zipSync(nextOuter,{level:6})],{type:'application/zip'});
 const checkOuter=root.fflate.unzipSync(new Uint8Array(await result.arrayBuffer()));
 for(const [name,bytes] of Object.entries(outer))if(name!==CLASSIC&&!equal(bytes,checkOuter[name]))
  throw Error('КТ77-09: променен друг файл '+name);
 return {blob:result,applied:true,positions:replaced,paragraphs:43,reference:'approved-Classic-B',readonlyOtherFiles:true};
}
root.KT7709ClassicBAnchor=Object.freeze({fix,referencePositions:POSITIONS});
})(typeof window!=='undefined'?window:globalThis);
