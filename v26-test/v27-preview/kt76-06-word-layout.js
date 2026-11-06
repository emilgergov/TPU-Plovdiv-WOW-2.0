/* KT76-06: scoped visual-layout corrections for the approved test dossier.
 * No changes to legal wording, existing Classic B approval, GIS/PDF or KT75.
 * Preserves 43/49 paragraph architecture, Word headers, footers and signature image.
 */
(function(root){'use strict';
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main',W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const FILES=['01_Proekt_na_stanovishte_Klasicheski.docx','02_Proekt_na_stanovishte_Eksperten.docx'];
const equal=(a,b)=>a?.length===b?.length&&a.every((v,i)=>v===b[i]);
function children(p,local){return Array.from(p.childNodes||[]).filter(x=>x.nodeType===1&&x.localName===local&&x.namespaceURI===NS)}
function nodes(p,local){return Array.from(p.getElementsByTagNameNS(NS,local))}
function get(p,local){return children(p,local)[0]}
function set(xml,el,key,value){el.setAttributeNS(W,'w:'+key,value)}
function create(xml,name){return xml.createElementNS(NS,'w:'+name)}
function ensure(xml,p,name){let x=get(p,name);if(!x){x=create(xml,name);p.insertBefore(x,p.firstChild)}return x}
function text(p){return nodes(p,'t').map(x=>x.textContent||'').join('')}
function patch(docx,kind){
 const parts=root.fflate.unzipSync(docx),raw=parts['word/document.xml'];
 if(!raw)throw Error('КТ76-06: липсва Word XML '+kind);
 const xml=new DOMParser().parseFromString(new TextDecoder().decode(raw),'application/xml');
 if(nodes(xml,'parsererror').length)throw Error('КТ76-06: невалиден Word XML '+kind);
 const body=nodes(xml,'body')[0],ps=children(body,'p');
 const expect=kind==='classic'?43:49,firstBlank=kind==='classic'?36:42,sign=kind==='classic'?40:46;
 if(ps.length!==expect)throw Error('КТ76-06: изменен брой абзаци '+kind);
 const oldTexts=ps.map(text);
 if(!oldTexts[10].includes('36676.129.457')||!oldTexts[10].includes('малък едноетажен обслужващ обект'))
  throw Error('КТ76-06: неизвестен предмет/имот; корекцията е отказана');
 // Reduce only body paragraph LINE HEIGHT, without changing Verdana 10,
 // exact wording, alignment, indent or paragraph before/after spacing.
 for(let i=15;i<firstBlank;i++){
  const pr=get(ps[i],'pPr');
  const spacing=pr&&get(pr,'spacing');
  if(spacing&&spacing.getAttributeNS(W,'line')==='240')set(xml,spacing,'line','210');
 }
 // Four historical empty paragraphs have no semantic or signature content.
 // Keep all four for exact specimen architecture; avoid their page-height cost.
 for(let i=firstBlank;i<firstBlank+4;i++){
  const p=ps[i];
  if(text(p)||nodes(p,'pict').length||nodes(p,'drawing').length)
   throw Error('КТ76-06: непразен абзац за страниране '+(i+1));
  const pr=ensure(xml,p,'pPr');
  for(const c of children(pr,'spacing').concat(children(pr,'pStyle'),children(pr,'keepNext'),children(pr,'keepLines'),children(pr,'pageBreakBefore')))pr.removeChild(c);
  const spacing=create(xml,'spacing');
  set(xml,spacing,'before','0');set(xml,spacing,'after','0');set(xml,spacing,'line','20');set(xml,spacing,'lineRule','exact');
  pr.insertBefore(spacing,pr.firstChild);
 }
 // Greeting stays with the (untouched) native Office signature line.
 const signed=ps[sign],signature=ps[sign+1];
 if(!text(signed).includes('С уважение,')||!nodes(signature,'pict').length)
  throw Error('КТ76-06: непознат директорски подпис');
 const sp=ensure(xml,signed,'pPr');ensure(xml,sp,'keepNext');
 if(kind==='expert'){
  // The approved locality is a display normalization, not a GIS fact change.
  const ts=nodes(ps[10],'t');
  let changed=0;
  for(const t of ts){
   if((t.textContent||'').includes('местност ПОПСКОТО')){
    t.textContent=t.textContent.replace('местност ПОПСКОТО','местност „Попското“');changed++;
   }
  }
  if(changed!==1&&!text(ps[10]).includes('местност „Попското“'))
   throw Error('КТ76-06: неизвестно изписване на местността');
  // These are body analysis paragraphs, not headings. Keep their entire text.
  for(let i=32;i<=36;i++){
   for(const run of children(ps[i],'r')){
    if(!nodes(run,'t').some(t=>(t.textContent||'').length))continue;
    const rp=ensure(xml,run,'rPr');
    let b=get(rp,'b');
    if(!b){b=create(xml,'b');rp.insertBefore(b,rp.firstChild);}
    set(xml,b,'val','0');
    let cs=get(rp,'bCs');if(cs)set(xml,cs,'val','0');
   }
  }
 }
 const current=ps.map(text);
 for(let i=0;i<expect;i++){
  const intended=kind==='expert'&&i===10?oldTexts[i].replace('местност ПОПСКОТО','местност „Попското“'):oldTexts[i];
  if(current[i]!==intended)throw Error('КТ76-06: неразрешена промяна в текста на абзац '+(i+1));
 }
 if(!nodes(ps[sign+1],'pict').length)throw Error('КТ76-06: изчезнал подпис');
 parts['word/document.xml']=new TextEncoder().encode(new XMLSerializer().serializeToString(xml));
 const revised=root.fflate.zipSync(parts,{level:6}),check=root.fflate.unzipSync(revised);
 for(const [name,bytes] of Object.entries(parts))if(name!=='word/document.xml'&&!equal(bytes,check[name]))
  throw Error('КТ76-06: променен ресурс в '+kind+' '+name);
 return {bytes:revised,paragraphs:expect,changedWordText:kind==='expert'?'местност „Попското“':'без съдържателни промени'};
}
async function fix(blob,{scenario='',parcelIds=[],zoneCodes=[]}={}){
 const ids=parcelIds.map(String);
 if(!['Б','B'].includes(scenario)||ids.length!==1||ids[0]!=='36676.129.457'||zoneCodes.length!==1||zoneCodes[0]!=='BG0000194')
  return {blob,applied:false,reason:'Вън от проверения тестов образец'};
 const outer=root.fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
 for(const n of FILES)if(!outer[n])throw Error('КТ76-06: липсва '+n);
 const before={...outer};
 const modified=[];
 for(let i=0;i<FILES.length;i++){
  const v=patch(before[FILES[i]],i?'expert':'classic');
  outer[FILES[i]]=v.bytes;modified.push(v);
 }
 const result=new Blob([root.fflate.zipSync(outer,{level:6})],{type:'application/zip'});
 const check=root.fflate.unzipSync(new Uint8Array(await result.arrayBuffer()));
 for(const [name,bytes] of Object.entries(before))if(!FILES.includes(name)&&!equal(bytes,check[name]))
  throw Error('КТ76-06: променен неприлежащ ZIP ресурс '+name);
 return {blob:result,applied:true,documents:modified};
}
root.KT7606WordLayout=Object.freeze({fix});
})(typeof window!=='undefined'?window:globalThis);
