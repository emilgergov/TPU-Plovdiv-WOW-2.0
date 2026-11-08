/* KT77-11.2: read-only A/B exact specimen OOXML report; no generator or public-site changes */
(function(root){'use strict';
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main',S={A:{file:'KT35-A.docx',n:41},B:{file:'KT39-B.docx',n:43}};
const children=(e,n)=>Array.from(e?.childNodes||[]).filter(x=>x.nodeType===1&&x.namespaceURI===W&&x.localName===n);
const nodes=(e,n)=>Array.from(e.getElementsByTagNameNS(W,n));
const attrib=(e,k='val')=>e?.getAttributeNS(W,k)??e?.getAttribute('w:'+k)??null;
const child=(e,n)=>children(e,n)[0];
const one=(e,n,k='val')=>attrib(child(e,n),k);
const text=e=>nodes(e,'t').map(x=>x.textContent||'').join('');
const flag=(e,n)=>{const x=child(e,n);return x?attrib(x)!=='0'&&attrib(x)!=='false':null};
function extract(bytes,mode){
 const zip=root.fflate.unzipSync(bytes),raw=zip['word/document.xml'];if(!raw)throw Error('КТ77-11: липсва Word XML '+mode);
 const xml=new DOMParser().parseFromString(new TextDecoder().decode(raw),'application/xml');
 if(xml.getElementsByTagName('parsererror').length)throw Error('КТ77-11: невалиден XML '+mode);
 const paras=children(nodes(xml,'body')[0],'p');
 if(paras.length!==S[mode].n)throw Error('КТ77-11: '+mode+' има '+paras.length+' вместо '+S[mode].n+' абзаца');
 const rows=paras.map((p,i)=>{
  const pr=child(p,'pPr'),sp=child(pr,'spacing'),runs=children(p,'r'),shown=runs.filter(r=>text(r));
  return {number:i+1,text:text(p),empty:!text(p),paragraph_style:one(pr,'pStyle'),align:one(pr,'jc'),
   spacing:{before:attrib(sp,'before'),after:attrib(sp,'after'),line:attrib(sp,'line'),lineRule:attrib(sp,'lineRule')},
   runs:shown.map(r=>{const rp=child(r,'rPr'),fonts=child(rp,'rFonts');return {
    text:text(r),bold:flag(rp,'b'),italic:flag(rp,'i'),underline:one(rp,'u'),size:one(rp,'sz'),
    font:attrib(fonts,'ascii'),font_eastasia:attrib(fonts,'eastAsia'),highlight:one(rp,'highlight'),
    xml:new XMLSerializer().serializeToString(r)
   }}),paragraph_xml:new XMLSerializer().serializeToString(p)};
 });
 const parts=Object.keys(zip).filter(k=>/^(word\/(header|footer|media|styles|numbering)|\[Content_Types\])/u.test(k)).sort();
 return {specimen:S[mode].file,paragraphs:rows,count:paras.length,resources:parts.map(name=>({name,bytes:zip[name].length}))};
}
async function audit(){
 if(!root.fflate?.unzipSync)throw Error('КТ77-11: fflate липсва');
 const out={schema:'KT77-11-2-readonly-both-original-ooxml',source_commit:'f407b176b477afb699643b73ce82ddf2e83badb0',readOnly:true,generatedAt:new Date().toISOString(),A:null,B:null};
 for(const [mode,spec] of Object.entries(S)){
  const url=new URL('v27-preview/etalon/'+spec.file,document.baseURI),res=await fetch(url,{cache:'no-store'});
  if(!res.ok)throw Error('КТ77-11: липсва еталон '+mode+' (HTTP '+res.status+')');
  out[mode]=extract(new Uint8Array(await res.arrayBuffer()),mode);
 }
 if(out.A.count!==41||out.B.count!==43)throw Error('КТ77-11: несъответствие с двата еталона');
 return Object.freeze(out);
}
function download(report){
 const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='KT77_11_2_A_B_LOCKED_OOXML_REPORT.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
root.KT7711ReadOnlyOOXML=Object.freeze({audit,download,extract});
})(typeof window!=='undefined'?window:globalThis);
