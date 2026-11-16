/* КТ119 — DOCX from the approved RIOSV-Plovdiv source document.
 * The file is processed locally. Never upload the dossier or template.
 * Only the confirmed expert text is inserted, byte-for-byte per paragraph.
 */
const TEMPLATE_SHA256='c616f1cb88b9ef69c9f188bbbd9acfedf662ef779d3b3dca20818a04e95d4978';
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const el=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x};
const q=x=>String(x??'').trim();
let templateBytes=null;
const digest=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b))).map(n=>n.toString(16).padStart(2,'0')).join('');
function install(){
 const root=document.getElementById('kt117Stage5'),button=document.getElementById('kt119WordCreate');
 if(!root||!button)return false;
 const help=root.querySelector('.kt117-note')?.parentElement||root;
 const select=el('div');select.style.cssText='padding:13px;margin:12px 0;border:1px solid #998b5d;background:#183b2c;border-radius:8px;color:#f5e9c9;font:13px/1.5 Verdana,Arial';
 const title=el('strong','Бланка на РИОСВ – Пловдив');title.style.cssText='display:block;color:#f2d190;margin-bottom:7px';
 const description=el('div','Изберете проверения шаблон КТ119 само веднъж за текущата сесия. Файлът остава в браузъра; не се изпраща към сървър.');
 const file=el('input');file.type='file';file.accept='.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document';file.setAttribute('aria-label','Изберете одобрената DOCX бланка');file.style.cssText='display:block;margin:11px 0;color:#f8edd7;max-width:100%';
 const status=el('p','Не е избрана бланка.');status.style.cssText='color:#e8ce99;font-size:12px;margin:5px 0';
 select.append(title,description,file,status);
 const info=button.parentElement;info?.parentElement?.insertBefore(select,info);
 const WN=(tag,text)=>{const n=document.createElementNS(W,'w:'+tag);if(text!==undefined)n.textContent=text;return n};
 const addText=(p,text,weight=false,italic=false)=>{
   const r=WN('r'),prop=WN('rPr'),fonts=WN('rFonts'),size=WN('sz');
   fonts.setAttributeNS(W,'w:ascii','Verdana');fonts.setAttributeNS(W,'w:hAnsi','Verdana');fonts.setAttributeNS(W,'w:cs','Verdana');
   size.setAttributeNS(W,'w:val','20');prop.append(fonts,size);
   if(weight)prop.append(WN('b'));if(italic)prop.append(WN('i'));
   const t=WN('t',text);t.setAttribute('xml:space','preserve');
   r.append(prop,t);p.append(r);
 };
 const segmented=(p,line,isSubject=false)=>{
   if(isSubject&&line.startsWith('Относно:')){
     addText(p,'Относно:',true);addText(p,line.slice(8),false,true);return;
   }
   const regex=/(?:чл\.\s*\d+[а-я]?|ал\.\s*\d+|т\.\s*\d+|приложени(?:е|ето)\s*№\s*\d+)/giu;
   let start=0,m;while((m=regex.exec(line))){
     if(m.index>start)addText(p,line.slice(start,m.index));
     addText(p,m[0],true);start=m.index+m[0].length;
   }
   if(start<line.length)addText(p,line.slice(start));
   if(!line.length)addText(p,'');
 };
 const textIn=p=>Array.from(p.getElementsByTagNameNS(W,'t')).map(n=>n.textContent).join('');
 const replacePara=(para,line,subject=false)=>{
   const props=Array.from(para.childNodes).find(n=>n.localName==='pPr'&&n.namespaceURI===W);
   para.replaceChildren();if(props)para.append(props);
   segmented(para,line,subject);
   if(textIn(para)!==line)throw Error('Text mismatch while formatting paragraph');
 };
 const newPara=(line)=>{
   const p=WN('p'),pp=WN('pPr'),spacing=WN('spacing'),lineEl=WN('spacing');
   spacing.setAttributeNS(W,'w:after','120');spacing.setAttributeNS(W,'w:line','240');
   spacing.setAttributeNS(W,'w:lineRule','auto');pp.append(spacing);p.append(pp);
   segmented(p,line);if(textIn(p)!==line)throw Error('Text mismatch in new paragraph');
   return p;
 };
 file.addEventListener('change',async()=>{
   templateBytes=null;document.dispatchEvent(new Event('kt119:template-ready'));
   try{
     const chosen=file.files?.[0];if(!chosen)throw Error('Не е избран файл.');
     if(chosen.size>250000||chosen.size<25000)throw Error('Неочакван размер на бланката.');
     const data=await chosen.arrayBuffer(),sha=await digest(data);
     if(sha!==TEMPLATE_SHA256)throw Error('Това не е проверената бланка КТ119. Изберете файла от тестовия пакет.');
     if(!window.fflate?.unzipSync||!window.fflate?.zipSync)throw Error('Библиотеката за DOCX не е заредена.');
     const zip=window.fflate.unzipSync(new Uint8Array(data));
     const xml=new TextDecoder().decode(zip['word/document.xml']||new Uint8Array());
     if(!xml.includes('{{SUBJECT}}')||!xml.includes('{{BODY_ANCHOR}}')||!xml.includes('{{DOCUMENT_TITLE}}'))throw Error('Липсват контролни полета в бланката.');
     templateBytes=new Uint8Array(data);
     status.textContent='Бланката е проверена. След потвърждение на текста можете да създадете DOCX.';
   }catch(e){status.textContent=String(e.message||e);file.value='';}
   document.dispatchEvent(new Event('kt119:template-ready'));
 });
 window.KT119TemplateReady=()=>!!templateBytes;
 window.KT119Download=async()=>{
   const approved=window.KT117Document?.snapshot?.(),stage4=window.KT116ExpertHandoff?.snapshot?.();
   if(!templateBytes||!approved||!stage4||approved.caseId!==stage4.caseId||
      approved.stage4Version!==stage4.version){status.textContent='Няма проверена бланка или валиден потвърден текст за текущата преписка.';return;}
   try{
     const raw=approved.text.replace(/\r\n/g,'\n');
     const lines=raw.split('\n'),subject=lines[0];
     if(!subject?.startsWith('Относно:'))throw Error('Липсва потвърден ред „Относно:“.');
     const bodyLines=lines.slice(1);
     const chosen=stage4.text.match(/ИЗБРАН\s+ПАНЕЛ\s*:\s*0?\d{1,2}\s*[—–-]\s*([^\n]+)/iu);
     if(!chosen)throw Error('Липсва потвърдено наименование на административния документ.');
     const docTitle=chosen[1].trim();
     const contents=window.fflate.unzipSync(templateBytes);
     const xml=new TextDecoder().decode(contents['word/document.xml']),dom=new DOMParser().parseFromString(xml,'application/xml');
     if(dom.getElementsByTagName('parsererror').length)throw Error('Невалидна бланка.');
     const body=dom.getElementsByTagNameNS(W,'body')[0];
     if(!body)throw Error('Липсва тяло на документа.');
     const paragraphs=Array.from(body.childNodes).filter(n=>n.namespaceURI===W&&n.localName==='p');
     const locate=token=>paragraphs.find(p=>textIn(p).includes(token));
     const subj=locate('{{SUBJECT}}'),title=locate('{{DOCUMENT_TITLE}}'),anchor=locate('{{BODY_ANCHOR}}');
     if(!subj||!title||!anchor)throw Error('Липсва динамичен раздел в бланката.');
     replacePara(subj,subject,true);replacePara(title,docTitle);
     const nodes=bodyLines.map(x=>newPara(x));
     for(const p of nodes)body.insertBefore(p,anchor);
     body.removeChild(anchor);
     const actual=[textIn(subj),...nodes.map(textIn)].join('\n');
     if(actual!==raw)throw Error('DOCX не съвпада с експертно потвърденото съдържание.');
     // Never rewrite a confirmed run. Formatting changes only the appearance.
     contents['word/document.xml']=new TextEncoder().encode(new XMLSerializer().serializeToString(dom));
     const bytes=window.fflate.zipSync(contents,{level:6});
     const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
     const url=URL.createObjectURL(blob),link=el('a');
     link.href=url;link.download='RIOSV_Plovdiv_'+approved.caseId.replace(/[^a-zA-Z0-9_-]/g,'_')+'_v'+approved.version+'.docx';
     document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
     status.textContent='DOCX е създаден от потвърдената версия '+approved.version+'. Проверката на съдържанието премина успешно.';
   }catch(e){status.textContent='Неуспешно генериране: '+String(e.message||e);}
 };
 document.dispatchEvent(new Event('kt119:template-ready'));
 return true;
}
if(!install()){
 const o=new MutationObserver(()=>{if(install())o.disconnect()});
 o.observe(document.body,{subtree:true,childList:true});
}
