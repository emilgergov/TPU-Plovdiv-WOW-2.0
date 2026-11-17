/* KT77-09.3: CLASSIC B = LOCKED KT39-B OOXML DOCUMENT.
 * Always start from KT39-B.docx, never from an AI-assembled Word body.
 * The case-derived Word is used ONLY as source of text at listed variable slots.
 * Confirmed fixed KT76-03 content/format is preserved at 8 approved fixed
 * positions. All original reference styles/media/headers/footers are retained.
 * No modifications to A, Expert, GIS, PDF1, PDF2, or old published versions.
 */
(function(root){'use strict';
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const NAME='01_Proekt_na_stanovishte_Klasicheski.docx';
const VARIABLE=Object.freeze([7,8,11,17,19,20,21,22,23,24,25,26,27,28,34]);
const APPROVED_FIXED=Object.freeze([18,29,30,31,32,33,35,36]);
const paragraphs=xml=>Array.from(xml.getElementsByTagNameNS(NS,'body')[0]?.childNodes||[]).filter(e=>e.nodeType===1&&e.localName==='p'&&e.namespaceURI===NS);
const children=(n,k)=>Array.from(n.childNodes||[]).filter(e=>e.nodeType===1&&e.localName===k&&e.namespaceURI===NS);
const nodes=(n,k)=>Array.from(n.getElementsByTagNameNS(NS,k));
const value=p=>nodes(p,'t').map(t=>t.textContent||'').join('');
const equal=(a,b)=>a?.length===b?.length&&a.every((x,i)=>x===b[i]);
const encoder=new TextEncoder(),decoder=new TextDecoder();
function parse(bytes){
 if(!bytes)throw Error('КТ77-09.3: липсва document.xml');
 const xml=new DOMParser().parseFromString(decoder.decode(bytes),'application/xml');
 if(xml.getElementsByTagName('parsererror').length)throw Error('КТ77-09.3: невалиден Word XML');
 return xml;
}
let referencePromise=null;
async function getReference(){
 if(!referencePromise)referencePromise=(async()=>{
  const url=new URL('v27-preview/etalon/KT39-B.docx',document.baseURI);
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok)throw Error('КТ77-09.3: заключеният КТ39-Б е недостъпен');
  const bytes=new Uint8Array(await response.arrayBuffer()),zip=root.fflate.unzipSync(bytes);
  const xml=parse(zip['word/document.xml']);
  if(paragraphs(xml).length!==43)throw Error('КТ77-09.3: КТ39-Б не съдържа 43 абзаца');
  return {zip,xml};
 })().catch(e=>{referencePromise=null;throw e});
 return referencePromise;
}
function replaceParagraph(target,current){
 const imported=target.ownerDocument.importNode(current,true);
 target.parentNode.replaceChild(imported,target);
 return imported;
}
function styleFromTemplate(doc,base,actual){
 const p=doc.importNode(base,true);
 const data=value(actual);
 if(!data.trim())throw Error('КТ77-09.3: празно променливо поле');
 const t=nodes(p,'t');
 if(!t.length)throw Error('КТ77-09.3: в еталона липсва стилов текстов сегмент');
 for(let i=0;i<t.length;i++){
  t[i].textContent=i===0?data:'';
  if(i===0)t[i].setAttribute('xml:space','preserve');
 }
 if(value(p)!==data)throw Error('КТ77-09.3: неуспешно пренасяне на фактите');
 return p;
}
function caseSpecific(doc,base,current,index){
 // The title has approved multiple formatted runs. Keep these specific
 // run boundaries but replace paragraph geometry with locked KT39-B values.
 if(index===11){
  const p=doc.importNode(current,true),pr=children(p,'pPr')[0],ref=children(base,'pPr')[0];
  if(ref){if(pr)p.replaceChild(doc.importNode(ref,true),pr);else p.insertBefore(doc.importNode(ref,true),p.firstChild);}
  return p;
 }
 const p=styleFromTemplate(doc,base,current);
 // Style-only emphasis in subject-specific spatial and conclusion slots:
 // never introduce a new assertion while splitting the already supplied text.
 if(index===24||index===34){
  const source=value(p),pattern=index===24?/\bпопада(?:\s+частично|\s+изцяло)?\b/iu:/„[^“]+“/u;
  const match=source.match(pattern);
  if(match&&match.index!==undefined){
   const first=children(p,'r').find(r=>nodes(r,'t').length);
   if(first){
    const basePr=children(first,'rPr')[0];
    for(const old of children(p,'r'))p.removeChild(old);
    const chunks=[source.slice(0,match.index),match[0],source.slice(match.index+match[0].length)];
    chunks.forEach((chunk,i)=>{
     if(!chunk)return;
     const run=doc.createElementNS(NS,'w:r'),pr=basePr?doc.importNode(basePr,true):doc.createElementNS(NS,'w:rPr');
     for(const b of [...nodes(pr,'b'),...nodes(pr,'bCs')])b.parentNode.removeChild(b);
     if(i===1)pr.appendChild(doc.createElementNS(NS,'w:b'));
     run.appendChild(pr);
     const t=doc.createElementNS(NS,'w:t');t.textContent=chunk;t.setAttribute('xml:space','preserve');run.appendChild(t);
     p.appendChild(run);
    });
   }
  }
 }
 if(value(p)!==value(current))throw Error('КТ77-09.3: променен текст при прилагане на шаблона в абзац '+index);
 return p;
}
async function fix(blob,{scenario='',parcelIds=[],zoneCodes=[]}={}){
 const mode=scenario==='B'?'Б':scenario==='A'?'А':scenario;
 if(mode==='А')return {blob,applied:false,reason:'Classic А остава по оригиналния КТ35-А'};
 if(mode!=='Б')throw Error('КТ77-09.3: непотвърден сценарий');
 if(!parcelIds.length||!zoneCodes.length)throw Error('КТ77-09.3: липсва потвърден имот или ЗЗ');
 if(!root.fflate?.unzipSync||!root.fflate?.zipSync)throw Error('КТ77-09.3: липсва ZIP библиотека');
 const outer=root.fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
 if(!outer[NAME])throw Error('КТ77-09.3: липсва Classic Б в ZIP');
 const existing=root.fflate.unzipSync(outer[NAME]),oldXml=parse(existing['word/document.xml']),old=paragraphs(oldXml);
 if(old.length!==43)throw Error('КТ77-09.3: изходният Classic Б няма 43 основни абзаца');
 const before=old.map(value);
 if(parcelIds.some(id=>!before[10].includes(String(id))))throw Error('КТ77-09.3: несъответстващ реален имот в „Относно:“');
 const whole=before.join('\n');
 if(!zoneCodes.some(code=>whole.includes(String(code))))throw Error('КТ77-09.3: няма потвърден код на ЗЗ в Word');
 const sample=parcelIds.length===1&&String(parcelIds[0])==='36676.129.457'&&zoneCodes.length===1&&zoneCodes[0]==='BG0000194';
 if(sample)return {blob,applied:false,reason:'Одобреният тестов Classic Б е запазен'};
 const ref=await getReference(),target=parse(ref.zip['word/document.xml']),reference=paragraphs(target);
 const approved=root.KT7603ClassicB?.approved;
 if(!approved)throw Error('КТ77-09.3: заключеният регистър на КТ39-Б не е зареден');
 for(let i=1;i<=43;i++){
  const original=reference[i-1],current=old[i-1],actual=before[i-1];
  if(APPROVED_FIXED.includes(i)){
   if(actual!==approved[i])throw Error('КТ77-09.3: променен фиксиран текст №'+i);
   replaceParagraph(original,current);
  }else if(VARIABLE.includes(i)){
   if(/\[\[(?:CHARACTERIZATION|LEGAL|PROCEDURE|IMPACTS|CONCLUSION)\]\]|\[\s*ЗА ЕКСПЕРТНА ПРОВЕРКА/iu.test(actual))
    throw Error('КТ77-09.3: непотвърдени данни в абзац №'+i);
   original.parentNode.replaceChild(caseSpecific(target,original,current,i),original);
  }
 }
 const final=paragraphs(target),after=final.map(value);
 if(final.length!==43)throw Error('КТ77-09.3: променена структура на еталона');
 for(let i=1;i<=43;i++)if((VARIABLE.includes(i)||APPROVED_FIXED.includes(i))&&after[i-1]!==before[i-1])
  throw Error('КТ77-09.3: променен текст извън данните на преписката, абзац '+i);
 if(after.join('\n').includes('36676.129.457')&&!parcelIds.includes('36676.129.457'))
  throw Error('КТ77-09.3: чужд тестов идентификатор в Word');
 if(after.includes('')){/* empty template separators are allowed */}
 const referencePackage={...ref.zip,'word/document.xml':encoder.encode(new XMLSerializer().serializeToString(target))};
 const revisedWord=root.fflate.zipSync(referencePackage,{level:6});
 const checked=root.fflate.unzipSync(revisedWord);
 for(const [path,bytes]of Object.entries(ref.zip))if(path!=='word/document.xml'&&!equal(checked[path],bytes))
  throw Error('КТ77-09.3: засегнат заключен Word ресурс '+path);
 const finalPackage={...outer,[NAME]:revisedWord};
 const result=new Blob([root.fflate.zipSync(finalPackage,{level:6})],{type:'application/zip'});
 const archive=root.fflate.unzipSync(new Uint8Array(await result.arrayBuffer()));
 for(const [path,bytes]of Object.entries(outer))if(path!==NAME&&!equal(archive[path],bytes))
  throw Error('КТ77-09.3: засегнат чужд документ '+path);
 return {blob:result,applied:true,reference:'KT39-B.docx',baseParagraphs:43,mutable:VARIABLE.length,fixed:APPROVED_FIXED.length,textVerified:true,otherFilesVerified:true};
}
root.KT77093LockedClassic=Object.freeze({fix});
})(typeof window!=='undefined'?window:globalThis);
