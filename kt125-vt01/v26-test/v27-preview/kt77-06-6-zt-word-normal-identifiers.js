/* KT77-06.6: cadastral identifiers in ZT statements use unbolded text, matching existing ZZ paragraphs. ZT category/name stays bold. No original Word alterations. */
/* KT77-06.1: one independent ZT constatation paragraph per Word (Classic A/B, Expert).
 * No changes to scenario, content generation, spatial conclusions, PDF1/PDF2, or signatures.
 * Strict guard: exactly one insertion, all previous paragraph texts remain byte-identical.
 */
(function(root){'use strict';
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const FILES=['01_Proekt_na_stanovishte_Klasicheski.docx','02_Proekt_na_stanovishte_Eksperten.docx'];
const eq=(a,b)=>a&&b&&a.length===b.length&&a.every((x,i)=>x===b[i]);
const direct=(e,n)=>Array.from(e.childNodes||[]).filter(x=>x.nodeType===1&&x.localName===n&&x.namespaceURI===NS);
const nodes=(e,n)=>Array.from(e.getElementsByTagNameNS(NS,n));
const txt=p=>nodes(p,'t').map(x=>x.textContent||'').join('');
const cleanName=v=>{const t=String(v||'').trim().toLocaleLowerCase('bg-BG').replace(/\s*[-–]\s*/g,' – ');return t.replace(/(^|[\s„–-])([а-я])/g,(m,a,b)=>a+b.toLocaleUpperCase('bg-BG'));};
const canon=v=>String(v||'').toLocaleUpperCase('bg-BG').replace(/[„“"']/g,'').replace(/\s+/g,' ').trim();
const part=(s,bold=false)=>({s:String(s),bold});
function parse(bytes,file){
 const zip=root.fflate.unzipSync(bytes),raw=zip['word/document.xml'];
 if(!raw)throw Error('КТ77-06: липсва document.xml за '+file);
 const xml=new DOMParser().parseFromString(new TextDecoder().decode(raw),'application/xml');
 if(nodes(xml,'parsererror').length)throw Error('КТ77-06: невалиден XML '+file);
 const body=nodes(xml,'body')[0],paras=direct(body,'p');
 return {zip,xml,body,paras,before:paras.map(txt)};
}
function lineFor(ids,findings,kind){
 const all=ids.flatMap(id=>{
  const f=findings.get(id);if(!f)throw Error('КТ77-06: липсва пространствен профил за '+id);
  return f.territories.map(z=>({id,z}));
 });
 const prefix=kind==='expert'?'При извършения пространствен анализ ':'При извършената пространствена проверка ';
 if(!all.length){
  return [part(prefix+'е установено, че '),part(ids.length===1?'поземленият имот с идентификатор ':'поземлените имоти с идентификатори '),part(ids.join(', ')),part(ids.length===1?' не попада в границите на защитени територии по смисъла на Закона за защитените територии (ЗЗТ).':' не попадат в границите на защитени територии по смисъла на Закона за защитените територии (ЗЗТ).')];
 }
 const archive=root.KT77R11ZZT?.archive?.sources||[];
 const items=[part(prefix+'е установено, че ')];
 all.forEach(({id,z},i)=>{
  const doc=archive.find(x=>x.kind==='protected_territory_site'&&x.source_verified===true&&x.declaration_order&&canon(x.title).includes(canon(z.name))&&canon(z.name));
  if(!doc?.declaration_order||!doc?.published_in)throw Error('КТ77-06: липсва заповед в ЗЗТ архива за '+z.name);
  const cat=cleanName(z.category).toLocaleLowerCase('bg-BG');
  const official=doc.title?.match(/„([^“]+)“/)?.[1]||cleanName(z.name);
  if(i)items.push(part('; '));
  items.push(part('поземленият имот с идентификатор '),part(id),part(' попада в границите на '),part(cat+' „'+official+'“',true),part(', защитена територия по смисъла на Закона за защитените територии (ЗЗТ), обявена със '+doc.declaration_order));
  items.push(part(', '+doc.published_in));
  if(doc.area_change_order)items.push(part(', с изменение със '+doc.area_change_order+(doc.area_change_publication?', '+doc.area_change_publication:'')));
 });
 items.push(part('.'));
 if(kind==='expert')items.push(part(' Констатацията се основава на пространствените данни от ПИ MASTER и е отразена в самостоятелния ГИС анализ.'));
 return items;
}
function insert(doc,segments,file){
 // Word spatial paragraph order is immediately after the paragraph identifying the zone declaration order.
 const matches=doc.paras.map((p,i)=>({i,t:txt(p)})).filter(x=>/защитен(?:а|и|ите)\s+зон|BG\d{7}/i.test(x.t)&&/заповед/i.test(x.t));
 const inBody=matches.filter(x=>x.i>=12);
 if(!inBody.length)throw Error('КТ77-06: не е намерен абзацът за заповедта на ЗЗ в '+file);
 const anchor=inBody[0],p=doc.paras[anchor.i],xml=doc.xml;
 const cp=p.cloneNode(true);
 for(const node of [...cp.childNodes])if(node.nodeType===1&&node.localName==='r'&&node.namespaceURI===NS)cp.removeChild(node);
 for(const node of [...cp.childNodes])if(node.nodeType===1&&node.localName!=='pPr'&&node.namespaceURI===NS)cp.removeChild(node);
 const sample=direct(p,'r').find(r=>nodes(r,'t').length)||direct(p,'r')[0];
 const fmt=sample&&direct(sample,'rPr')[0];
 for(const seg of segments){
  if(!seg.s)continue;
  const run=xml.createElementNS(NS,'w:r'),rPr=fmt?fmt.cloneNode(true):xml.createElementNS(NS,'w:rPr');
  for(const child of direct(rPr,'b'))rPr.removeChild(child);
  if(seg.bold){const bold=xml.createElementNS(NS,'w:b');rPr.appendChild(bold);}
  run.appendChild(rPr);
  const t=xml.createElementNS(NS,'w:t');t.setAttribute('xml:space','preserve');t.textContent=seg.s;run.appendChild(t);cp.appendChild(run);
 }
 if(!direct(cp,'r').length)throw Error('КТ77-06: празен констативен абзац');
 p.parentNode.insertBefore(cp,p.nextSibling);
 const after=direct(doc.body,'p'),texts=after.map(txt);
 if(after.length!==doc.before.length+1)throw Error('КТ77-06: грешен брой абзаци '+file);
 const restored=texts.slice(0,anchor.i+1).concat(texts.slice(anchor.i+2));
 if(restored.length!==doc.before.length||restored.some((v,i)=>v!==doc.before[i]))throw Error('КТ77-06: засегнат е стар абзац в '+file);
 doc.zip['word/document.xml']=new TextEncoder().encode(new XMLSerializer().serializeToString(xml));
 return {zip:root.fflate.zipSync(doc.zip,{level:6}),position:anchor.i+2,oldCount:doc.before.length,newCount:after.length};
}
async function fix(blob,{parcelIds=[]}={}){
 if(!root.fflate?.unzipSync||!root.fflate?.zipSync)throw Error('КТ77-06: липсва ZIP библиотека');
 const ids=[...new Set(parcelIds.map(String))];
 if(!ids.length)throw Error('КТ77-06: липсват потвърдени имоти');
 if(!root.KT77PiMasterIndex?.create)throw Error('КТ77-06: ПИ MASTER не е зареден');
 const idx=root.KT77PiMasterIndex.create(new URL('gis-data/pi-master/browser-index/',document.baseURI).href);
 const findings=new Map();
 for(const id of ids){
  const row=await idx.lookup(id);
  if(row.status!=='FOUND'||!Array.isArray(row.profile?.zt))throw Error('КТ77-06: липсва проверен ЗТ профил за '+id);
  findings.set(id,{territories:row.profile.zt.filter(z=>Number(z.intersect_m2??z.area_m2)>0).map(z=>({name:String(z.name_bg||z.name||''),category:String(z.category_bg||z.category||'')}))});
 }
 const original=root.fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
 const result={...original},edits=[];
 for(let j=0;j<FILES.length;j++){
  const file=FILES[j],input=original[file];
  if(!input)throw Error('КТ77-06: липсва '+file);
  const parsed=parse(input,file),segments=lineFor(ids,findings,j?'expert':'classic');
  const changed=insert(parsed,segments,file);
  const beforeParts=root.fflate.unzipSync(input),afterParts=root.fflate.unzipSync(changed.zip);
  for(const [p,b] of Object.entries(beforeParts))if(p!=='word/document.xml'&&!eq(b,afterParts[p]))throw Error('КТ77-06: променен Word ресурс '+p);
  result[file]=changed.zip;edits.push({file,paragraph:changed.position,oldCount:changed.oldCount,newCount:changed.newCount});
 }
 const zipped=new Blob([root.fflate.zipSync(result,{level:6})],{type:'application/zip'});
 const verify=root.fflate.unzipSync(new Uint8Array(await zipped.arrayBuffer()));
 for(const [p,b] of Object.entries(original))if(!FILES.includes(p)&&!eq(b,verify[p]))throw Error('КТ77-06: променен друг ZIP ресурс '+p);
 return {blob:zipped,applied:true,edits};
}
root.KT7706ZTConstatation=Object.freeze({fix});
})(window);