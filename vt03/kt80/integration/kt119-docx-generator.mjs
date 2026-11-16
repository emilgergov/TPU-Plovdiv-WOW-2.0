import {makeAutomaticTemplate} from './kt120-embedded-word-template.mjs';
/* КТ119 — DOCX from the approved RIOSV-Plovdiv source document.
 * The file is processed locally. Never upload the dossier or template.
 * Only the confirmed expert text is inserted, byte-for-byte per paragraph.
 */
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const el=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x};
const q=x=>String(x??'').trim();
let templateBytes=null;
function install(){
 const root=document.getElementById('kt117Stage5'),button=document.getElementById('kt119WordCreate');
 if(!root||!button)return false;
 const status=el('p','Използва се вградената одобрена бланка на РИОСВ – Пловдив.');
 status.style.cssText='color:#e8ce99;font:12px/1.5 Verdana,Arial;margin:8px 0';
 button.parentElement?.insertAdjacentElement('afterend',status);
 const WN=(tag,text)=>{const n=document.createElementNS(W,'w:'+tag);if(text!==undefined)n.textContent=text;return n};
 const addText=(p,text,weight=false,italic=false)=>{
   const r=WN('r'),prop=WN('rPr'),fonts=WN('rFonts'),size=WN('sz');
   fonts.setAttributeNS(W,'w:ascii','Verdana');fonts.setAttributeNS(W,'w:hAnsi','Verdana');fonts.setAttributeNS(W,'w:cs','Verdana');
   size.setAttributeNS(W,'w:val','20');prop.append(fonts);
   if(weight)prop.append(WN('b'));if(italic)prop.append(WN('i'));
   prop.append(size);
   const t=WN('t',text);t.setAttribute('xml:space','preserve');
   r.append(prop,t);p.append(r);
 };
 const segmented=(p,line,isSubject=false)=>{
   // Expert-approved recipient block: each complete line is bold.
   if(line==='ДО'||line.startsWith('Възложител:')||line.startsWith('Адрес:')){
     addText(p,line,true);return;
   }
   if(isSubject&&line.startsWith('Относно:')){
     addText(p,'Относно:',true,true);
     const rest=line.slice('Относно:'.length);
     // Only the exact approved investment-title span is bold, not quoted localities.
     const approvedTitle='„Складове за промишлени стоки и офиси“';
     const titleAt=rest.indexOf(approvedTitle);
     if(titleAt>=0){
       if(titleAt>0)addText(p,rest.slice(0,titleAt),false,true);
       addText(p,approvedTitle,true,true);
       if(titleAt+approvedTitle.length<rest.length)addText(p,rest.slice(titleAt+approvedTitle.length),false,true);
     }else addText(p,rest,false,true);
     return;
   }
   const regex=/(?:чл\.\s*\d+[а-я]?|ал\.\s*\d+|т\.\s*\d+|§\s*\d+|приложени(?:е|ето|я)\s*№\s*\d+)/giu;
   let start=0,m;while((m=regex.exec(line))){
     if(m.index>start)addText(p,line.slice(start,m.index));
     addText(p,m[0],true);start=m.index+m[0].length;
   }
   if(start<line.length)addText(p,line.slice(start));
   if(!line.length)addText(p,'');
 };
 const textIn=p=>Array.from(p.getElementsByTagNameNS(W,'t')).map(n=>n.textContent).join('');
 const replacePara=(para,line,subject=false,title=false)=>{
   const props=Array.from(para.childNodes).find(n=>n.localName==='pPr'&&n.namespaceURI===W);
   para.replaceChildren();if(props)para.append(props);
   if(title)addText(para,line,true);else segmented(para,line,subject);
   if(textIn(para)!==line)throw Error('Text mismatch while formatting paragraph');
 };
 const newPara=(line)=>{
   const p=WN('p'),pp=WN('pPr'),spacing=WN('spacing'),lineEl=WN('spacing');
   spacing.setAttributeNS(W,'w:after','0');spacing.setAttributeNS(W,'w:line','240');
   spacing.setAttributeNS(W,'w:before','0');spacing.setAttributeNS(W,'w:lineRule','auto');pp.append(spacing);
   const indent=WN('ind');indent.setAttributeNS(W,'w:firstLine','850');pp.append(indent); // 1.5 cm first-line indent
   const align=WN('jc');align.setAttributeNS(W,'w:val','both');pp.append(align);p.append(pp);
   segmented(p,line);if(textIn(p)!==line)throw Error('Text mismatch in new paragraph');
   return p;
 };
 try{
   templateBytes=makeAutomaticTemplate();
   const zip=window.fflate.unzipSync(templateBytes);
   const text=new TextDecoder().decode(zip['word/document.xml']);
   if(!text.includes('{{SUBJECT}}')||!text.includes('{{DOCUMENT_TITLE}}')||!text.includes('{{BODY_ANCHOR}}'))throw Error('Невалидни контролни полета');
   status.textContent='Бланката се прилага автоматично; експертът не избира файл.';
 }catch(e){templateBytes=null;status.textContent='Бланката не е готова: '+String(e.message||e)}
 window.KT119TemplateReady=()=>!!templateBytes;
 window.KT119Download=async()=>{
   const approved=window.KT117Document?.snapshot?.(),stage4=window.KT116ExpertHandoff?.snapshot?.();
   if(!templateBytes||!approved||!stage4||approved.caseId!==stage4.caseId||
      approved.stage4Version!==stage4.version){status.textContent='Няма проверена бланка или валиден потвърден текст за текущата преписка.';return;}
   try{
     const raw=approved.text.replace(/\r\n/g,'\n');
     const lines=raw.split('\n'),subject=lines[0];
     if(!subject?.startsWith('Относно:'))throw Error('Липсва потвърден ред „Относно:“.');
     const bodyLines=lines.slice(1).filter(x=>x.trim().length>0);
     const chosen=stage4.text.match(/ИЗБРАН\s+ПАНЕЛ\s*:\s*0?\d{1,2}\s*[—–-]\s*([^\n]+)/iu);
     if(!chosen)throw Error('Липсва потвърдено наименование на административния документ.');
     const docTitle=chosen[1].trim();
     const contents=window.fflate.unzipSync(templateBytes);
     const xml=new TextDecoder().decode(contents['word/document.xml']),dom=new DOMParser().parseFromString(xml,'application/xml');
     if(dom.getElementsByTagName('parsererror').length)throw Error('Невалидна бланка.');
     const body=dom.getElementsByTagNameNS(W,'body')[0];
     if(!body)throw Error('Липсва тяло на документа.');
     const paragraphs=Array.from(body.childNodes).filter(n=>n.namespaceURI===W&&n.localName==='p');
     // Enforce the signed-off KT119 layout independently of Word's inherited paragraph styles.
     const allPar=Array.from(body.getElementsByTagNameNS(W,'p'));
     const signatureParas=allPar.filter(p=>textIn(p).trim().startsWith('Електронен подпис:'));
     if(signatureParas.length!==2)throw Error('Бланката трябва да съдържа точно два блока за електронен подпис.');
     const firstSignature=signatureParas[0];
     let signProps=Array.from(firstSignature.childNodes).find(n=>n.namespaceURI===W&&n.localName==='pPr');
     if(!signProps){signProps=WN('pPr');firstSignature.insertBefore(signProps,firstSignature.firstChild)}
     for(const jc of Array.from(signProps.getElementsByTagNameNS(W,'jc')))jc.parentNode.removeChild(jc);
     const align=WN('jc');align.setAttributeNS(W,'w:val','left');signProps.append(align);
     const closing=allPar.find(p=>textIn(p).trim()==='С уважение,');
     if(!closing)throw Error('Липсва заключителният реквизит „С уважение,“.');
     replacePara(closing,'С уважение,',false,true);
     const locate=token=>paragraphs.find(p=>textIn(p).includes(token));
     // Re-apply bold recipient labels even when the built-in template changes.
     const recipient=allPar.find(p=>textIn(p).trim()==='ДО');
     const recipientParty=allPar.find(p=>textIn(p).startsWith('Възложител:'));
     const recipientAddress=allPar.find(p=>textIn(p).startsWith('Адрес:'));
     if(!recipient||!recipientParty||!recipientAddress)throw Error('Липсват реквизити за адресата.');
     for(const para of [recipient,recipientParty,recipientAddress])replacePara(para,textIn(para));
     const subj=locate('{{SUBJECT}}'),title=locate('{{DOCUMENT_TITLE}}'),anchor=locate('{{BODY_ANCHOR}}');
     if(!subj||!title||!anchor)throw Error('Липсва динамичен раздел в бланката.');
     replacePara(subj,subject,true);replacePara(title,docTitle,false,true);
     // KT120: Subject is justified, with the same 1.5 cm first-line indent as the body.
     let subjectProps=Array.from(subj.childNodes).find(n=>n.namespaceURI===W&&n.localName==='pPr');
     if(!subjectProps){subjectProps=WN('pPr');subj.insertBefore(subjectProps,subj.firstChild)}
     for(const node of Array.from(subjectProps.childNodes).filter(n=>n.namespaceURI===W&&(n.localName==='jc'||n.localName==='ind')))subjectProps.removeChild(node);
     const subjectAlign=WN('jc');subjectAlign.setAttributeNS(W,'w:val','both');subjectProps.append(subjectAlign);
     const subjectIndent=WN('ind');subjectIndent.setAttributeNS(W,'w:firstLine','850');subjectProps.append(subjectIndent);
     const nodes=bodyLines.map(x=>newPara(x));
     for(const p of nodes)body.insertBefore(p,anchor);
     body.removeChild(anchor);
     const actual=[textIn(subj),...nodes.map(textIn)].join('\n');
     if(actual.replace(/\n+/g,'\n')!==raw.replace(/\n+/g,'\n').replace(/^\n|\n$/g,''))throw Error('DOCX не съвпада с експертно потвърденото съдържание.');
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
