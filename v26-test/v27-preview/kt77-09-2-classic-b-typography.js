/* KT77-09.2: typography-only Classic B mutable slots.
 * Source of paragraph and run properties: locked KT39-B DOCX.
 * Read-only with respect to ALL 43 paragraph texts; no legal/factual rewrites.
 * Rebuild four segments only where the confirmed real subject or actual
 * references support them; sample B remains byte-identical.
 */
(function(root){'use strict';
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const NAME='01_Proekt_na_stanovishte_Klasicheski.docx';
const slots=Object.freeze([19,20,21,22,23,24,25,27,28,29,35]);
const visible=(n)=>Array.from(n.getElementsByTagNameNS(NS,'t')).map(t=>t.textContent||'').join('');
const direct=(n,k)=>Array.from(n.childNodes||[]).filter(x=>x.nodeType===1&&x.namespaceURI===NS&&x.localName===k);
const paragraphs=(xml)=>direct(xml.getElementsByTagNameNS(NS,'body')[0],'p');
const equal=(a,b)=>a?.length===b?.length&&a.every((x,i)=>x===b[i]);
const make=(xml,name)=>xml.createElementNS(NS,'w:'+name);
function parse(data){
 const xml=new DOMParser().parseFromString(new TextDecoder().decode(data),'application/xml');
 if(xml.getElementsByTagName('parsererror').length)throw Error('КТ77-09.2: невалиден Word XML');
 return xml;
}
let etalon=null;
async function reference(){
 if(etalon)return etalon;
 const response=await fetch('v27-preview/etalon/KT39-B.docx',{cache:'no-store'});
 if(!response.ok)throw Error('КТ77-09.2: липсва заключеният еталон КТ39-Б');
 const bytes=new Uint8Array(await response.arrayBuffer());
 const inside=root.fflate.unzipSync(bytes),original=parse(inside['word/document.xml']);
 const ps=paragraphs(original);
 if(ps.length!==43)throw Error('КТ77-09.2: еталонът не съдържа 43 абзаца');
 etalon=ps;return ps;
}
function runStyle(p,index){
 const rs=direct(p,'r').filter(x=>visible(x).trim());
 const src=rs[index]||rs[0];
 return src?direct(src,'rPr')[0]:null;
}
function copyStyle(xml,p,ref){
 const old=direct(p,'pPr')[0],fixed=direct(ref,'pPr')[0];
 if(old&&fixed)p.replaceChild(xml.importNode(fixed,true),old);
 else if(fixed)p.insertBefore(xml.importNode(fixed,true),p.firstChild);
}
function formatRuns(xml,p,segments,ref,boldFlags=[]){
 if(segments.join('')!==visible(p))throw Error('КТ77-09.2: риск от промяна на текста');
 const prior=visible(p);
 for(const run of direct(p,'r'))p.removeChild(run);
 const rPr=runStyle(ref,0);
 for(let i=0;i<segments.length;i++){
  const value=segments[i];if(!value)continue;
  const run=make(xml,'r'),pr=rPr?xml.importNode(rPr,true):make(xml,'rPr');
  for(const old of direct(pr,'b'))pr.removeChild(old);
  for(const old of direct(pr,'bCs'))pr.removeChild(old);
  if(boldFlags[i])pr.appendChild(make(xml,'b'));
  const t=make(xml,'t');t.setAttribute('xml:space','preserve');t.textContent=value;
  run.appendChild(pr);run.appendChild(t);p.appendChild(run);
 }
 if(visible(p)!==prior)throw Error('КТ77-09.2: текстът е променен при форматиране');
}
function segmented(text,index){
 if(index===27){
  const match=text.match(/чл\.\s*12,\s*ал\.\s*2/u);
  if(match&&match.index!==undefined)return {parts:[text.slice(0,match.index),match[0],text.slice(match.index+match[0].length)],bold:[false,true,false]};
 }
 if(index===35){
  const match=text.match(/„[^“]+“/u);
  if(match&&match.index!==undefined){
   const start=match.index,end=start+match[0].length;
   const after=text.slice(end);
   const final=after.match(/(?:За окончателния процедурен извод|не е необходимо провеждане на процедура)[\s\S]*$/u);
   if(final&&final.index!==undefined){
    const mid=after.slice(0,final.index),tail=after.slice(final.index);
    return {parts:[text.slice(0,start),match[0],mid,tail],bold:[false,true,false,true]};
   }
   return {parts:[text.slice(0,start),match[0],after],bold:[false,true,false]};
  }
 }
 return null;
}
async function fix(blob,{scenario='',parcelIds=[],zoneCodes=[]}={}){
 const mode=scenario==='B'?'Б':scenario==='A'?'А':scenario;
 if(mode==='А')return {blob,applied:false,reason:'Сценарий А непокътнат'};
 if(mode!=='Б')throw Error('КТ77-09.2: неопределен сценарий');
 if(!root.fflate?.unzipSync||!root.fflate?.zipSync)throw Error('КТ77-09.2: липсва ZIP библиотека');
 const outer=root.fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
 const original=outer[NAME];if(!original)throw Error('КТ77-09.2: липсва Classic Б');
 const inner=root.fflate.unzipSync(original),xml=parse(inner['word/document.xml']),ps=paragraphs(xml);
 if(ps.length!==43)throw Error('КТ77-09.2: неочакван брой основни абзаци');
 const textBefore=ps.map(visible);
 if(!parcelIds.every(id=>textBefore[10].includes(String(id)))||!zoneCodes.some(z=>textBefore.join('\n').includes(z)))
  throw Error('КТ77-09.2: липсва реалният имот или потвърдена ЗЗ');
 const sample=parcelIds.length===1&&String(parcelIds[0])==='36676.129.457'&&zoneCodes.length===1&&zoneCodes[0]==='BG0000194';
 if(sample)return {blob,applied:false,reason:'Одобреният образец Б се запазва без промени'};
 const refs=await reference();
 for(const n of slots){
  const p=ps[n-1],prior=visible(p);
  copyStyle(xml,p,refs[n-1]);
  const plan=segmented(prior,n);
  if(plan)formatRuns(xml,p,plan.parts,refs[n-1],plan.bold);
 }
 const textAfter=ps.map(visible);
 if(!textAfter.every((t,i)=>t===textBefore[i]))throw Error('КТ77-09.2: променен Word текст');
 inner['word/document.xml']=new TextEncoder().encode(new XMLSerializer().serializeToString(xml));
 const newClassic=root.fflate.zipSync(inner,{level:6});
 const test=root.fflate.unzipSync(newClassic);
 for(const [path,bytes] of Object.entries(inner))if(path!=='word/document.xml'&&!equal(test[path],bytes))
  throw Error('КТ77-09.2: променен DOCX ресурс '+path);
 outer[NAME]=newClassic;
 const result=new Blob([root.fflate.zipSync(outer,{level:6})],{type:'application/zip'});
 const check=root.fflate.unzipSync(new Uint8Array(await result.arrayBuffer()));
 for(const [path,bytes] of Object.entries(outer))if(path!==NAME&&!equal(bytes,check[path]))
  throw Error('КТ77-09.2: променен ZIP файл '+path);
 return {blob:result,applied:true,positions:slots,textExact:true,otherFilesExact:true};
}
root.KT77092ClassicBTypography=Object.freeze({fix});
})(typeof window!=='undefined'?window:globalThis);
