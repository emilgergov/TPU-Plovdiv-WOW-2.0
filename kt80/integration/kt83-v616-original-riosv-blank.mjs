/**
 * WOW KT83 V61.6 — original institution blank integration.
 * Input is the user's already approved original DOCX, selected LOCALLY.
 * Never publish the original file or copy its WMF/EMF media to GitHub.
 * The locked archival hash anchors the ONLY approved universal OUT shell.
 */
const EXPECTED_SHA256='4a6fb4a40f1cfc7331c64e0a4e7fd1fa8f41f6843dd2bf66c3d4bbaf17a77723';
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const DOCX_TYPE='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const accepted={
 recipient:'Получател: ХХХХХХХХХХХХХ',
 address:'Адрес: ХХХХХХХХХХХХХ',
 subject:'Относно:',
 title:'ИМЕ НА ДОКУМЕНТА',
 closing:'С уважение,'
};
const trimmed=x=>typeof x==='string'?x.trim():'';
const fail=s=>{throw new TypeError('РИОСВ бланка V61.6: '+s)};
const utf8=b=>new TextDecoder().decode(b);
const bytes=s=>new TextEncoder().encode(s);
const elems=(parent,name)=>Array.from(parent.getElementsByTagNameNS(NS,name));
const children=(parent,name)=>Array.from(parent.childNodes||[]).filter(n=>n.nodeType===1&&n.namespaceURI===NS&&n.localName===name);
const text=p=>elems(p,'t').map(n=>n.textContent||'').join('').trim();
const el=(xml,name)=>xml.createElementNS(NS,'w:'+name);
function paragraph(xml,value,{bold=false,align='both'}={}){
 const p=el(xml,'p'),pr=el(xml,'pPr'),jc=el(xml,'jc'),spacing=el(xml,'spacing');
 jc.setAttributeNS(NS,'w:val',align);spacing.setAttributeNS(NS,'w:line','240');
 spacing.setAttributeNS(NS,'w:lineRule','auto');spacing.setAttributeNS(NS,'w:after','100');
 pr.appendChild(jc);pr.appendChild(spacing);p.appendChild(pr);
 const r=el(xml,'r'),rpr=el(xml,'rPr'),fonts=el(xml,'rFonts'),sz=el(xml,'sz');
 for(const attr of ['ascii','hAnsi','cs'])fonts.setAttributeNS(NS,'w:'+attr,'Verdana');
 sz.setAttributeNS(NS,'w:val','20');rpr.appendChild(fonts);rpr.appendChild(sz);
 if(bold)rpr.appendChild(el(xml,'b'));
 r.appendChild(rpr);const t=el(xml,'t');t.textContent=value;t.setAttribute('xml:space','preserve');
 r.appendChild(t);p.appendChild(r);return p;
}
function rewrite(xml,p,value,{bold=false}={}){
 const nr=paragraph(xml,value,{bold});
 for(const node of Array.from(p.childNodes||[]))if(node.namespaceURI===NS&&node.localName!=='pPr')p.removeChild(node);
 for(const node of Array.from(nr.childNodes||[]))if(node.namespaceURI===NS&&node.localName==='r')
  p.appendChild(node.cloneNode(true));
}
function unique(ps,label){
 const x=ps.filter(p=>text(p)===label);
 if(x.length!==1)fail('нееднозначно поле '+label);
 return x[0];
}
async function digest(arr){
 if(!globalThis.crypto?.subtle)fail('липсва сигурна проверка SHA-256');
 const h=new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',arr));
 return Array.from(h,b=>b.toString(16).padStart(2,'0')).join('');
}
export async function makeOriginalBlankReviewDOCX({templateBytes,zipEngine,record,recipient=null,address=null}={}){
 if(!(templateBytes instanceof Uint8Array)||templateBytes.byteLength<1000||templateBytes.byteLength>5000000)
  fail('невалиден оригинален файл');
 if(await digest(templateBytes)!==EXPECTED_SHA256)fail('бланката не съвпада с предоставения и приет оригинал');
 if(!zipEngine||typeof zipEngine.unzipSync!=='function'||typeof zipEngine.zipSync!=='function')
  fail('липсва ZIP модул');
 if(!record||record.schema!=='KT80_REVIEW_DOCUMENT_V614'||record.status!=='EXPERT_REVIEW_ONLY'||
   record.formalIssuanceAllowed!==false||record.signatures?.length!==2||
   record.signatures.some(s=>s.status!=='НЕПОДПИСАНО'))
  fail('неоторизиран работен документ');
 const zip=zipEngine.unzipSync(templateBytes);
 for(const part of ['word/document.xml','word/header3.xml','word/footer3.xml',
   'word/media/image1.emf','word/media/image2.wmf','word/media/image3.wmf'])
   if(!zip[part])fail('оригиналът е непълен: '+part);
 const input=utf8(zip['word/document.xml']);
 const dom=new DOMParser().parseFromString(input,'application/xml');
 if(dom.getElementsByTagName('parsererror').length)fail('невалиден Word XML');
 const body=elems(dom,'body')[0];if(!body)fail('липсва тяло');
 const ps=children(body,'p');
 if(ps.length!==39)fail('очаквана структура на оригиналната бланка 39 абзаца');
 for(const v of Object.values(accepted))unique(ps,v);
 if(!text(ps[1]).includes('[TLP-WHITE]')||!elems(ps[37],'pict').length)
   fail('неоткрити оригинални класификация или подписен ред');
 if(!trimmed(record.subject)||!trimmed(record.body))fail('липсват предмет или мотиви');
 const bodyLines=record.body.split(/\r?\n/).map(trimmed).filter(Boolean);
 if(!bodyLines.length||bodyLines.length>200)fail('невалиден обем на мотивите');
 for(const p of ps.slice(12,36)){
   if(text(p)||elems(p,'drawing').length||elems(p,'pict').length)
      fail('очаквано празно поле съдържа оригинален материал; отказ');
 }
 rewrite(dom,ps[4],'Получател: '+(trimmed(recipient)||record.recipient));
 rewrite(dom,ps[5],'Адрес: '+(trimmed(address)||'ХХХХХХХХХХХХХ'));
 rewrite(dom,ps[8],'Относно: '+record.subject);
 rewrite(dom,ps[11],'ПРОЕКТ ЗА ЕКСПЕРТЕН ПРЕГЛЕД',{bold:true});
 for(const p of ps.slice(12,36))body.removeChild(p);
 const closing=ps[36];
 for(const line of ['РАБОТЕН ПРОЕКТ — НЕ Е ИЗХОДЯЩ АДМИНИСТРАТИВЕН АКТ',...bodyLines]){
   body.insertBefore(paragraph(dom,line),closing);
 }
 const picture=ps[37];
 body.insertBefore(paragraph(dom,'Първи електронен подпис: НЕПОДПИСАНО'),picture);
 const extra=paragraph(dom,'Втори електронен подпис: НЕПОДПИСАНО');
 body.insertBefore(extra,ps[38]);
 const xml=new XMLSerializer().serializeToString(dom);
 const output={...zip,'word/document.xml':bytes(xml)};
 const out=zipEngine.zipSync(output,{level:6});
 return Object.freeze({bytes:out,mediaType:DOCX_TYPE,status:'EXPERT_REVIEW_ONLY',caseId:record.caseId,
  originalBlankSha256:EXPECTED_SHA256,headerFooterMediaUnmodified:true,signaturesUnsigned:true});
}
export const ORIGINAL_BLANK_SHA256=EXPECTED_SHA256;
