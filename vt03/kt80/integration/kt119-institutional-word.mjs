// Shared institutional Word renderer, extracted from the accepted KT119 layout.
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
export function renderInstitutionalWord({templateBytes,codec,parseXml,serializeXml,text,title:docTitle}){
 const lines=text.replace(/\r\n/g,'\n').split('\n');
 const subject=lines[0];
 if(!subject?.startsWith('Относно:'))throw Error('Липсва потвърден ред „Относно:“.');
 if(typeof docTitle!=='string'||!docTitle.trim())throw Error('Липсва наименование на административния документ.');
 const bodyLines=lines.slice(1).filter(line=>line.trim().length>0);
 const contents=codec.unzipSync(templateBytes);
 const dom=parseXml(new TextDecoder().decode(contents['word/document.xml']));
 if(dom.getElementsByTagName('parsererror').length)throw Error('Невалидна бланка.');
 const WN=(tag,text)=>{const n=dom.createElementNS(W,'w:'+tag);if(text!==undefined)n.textContent=text;return n};
 const addText=(p,text,weight=false,italic=false)=>{
   const r=WN('r'),prop=WN('rPr'),fonts=WN('rFonts'),size=WN('sz');
   fonts.setAttributeNS(W,'w:ascii','Verdana');fonts.setAttributeNS(W,'w:hAnsi','Verdana');fonts.setAttributeNS(W,'w:cs','Verdana');
   size.setAttributeNS(W,'w:val','20');prop.appendChild(fonts);
   const lang=WN('lang');lang.setAttributeNS(W,'w:val','bg-BG');prop.appendChild(lang);
   if(weight)prop.appendChild(WN('b'));if(italic)prop.appendChild(WN('i'));
   prop.appendChild(size);
   const t=WN('t',text);t.setAttribute('xml:space','preserve');
   r.appendChild(prop);r.appendChild(t);p.appendChild(r);
 };
 // Pure presentation rule: when the approved subject begins with a distinct title,
 // delimit that title typographically without modifying the expert-confirmed body.
 // Never mistake a quoted locality/address for the title.
 const quotedSubject=(line)=>{
   if(!line.startsWith('Относно:'))return line;
   const rest=line.slice('Относно:'.length);
   const loc=/\s+(?:в(?:ъв)?\s+(?:поземлен(?:ия)?\s+имот|ПИ(?=\s|[.,]|$)|УПИ(?=\s|[.,]|$)|имот\s+с\s+идентификатор|гр\.\s|град\s|с\.\s|землището\s|община\s|област\s)|,\s*(?:местност|находящ|разположен))/iu;
   const boundary=loc.exec(rest);
   if(!boundary)return line;
   const title=rest.slice(0,boundary.index).trim();
   if(title.length<5||title.length>180||/[„“]/u.test(title))return line;
   return 'Относно: '+ '„'+title+'“'+rest.slice(boundary.index);
 };
 const segmented=(p,line,isSubject=false)=>{
   // Expert-approved recipient block: each complete line is bold.
   if(line==='ДО'||line.startsWith('Възложител:')||line.startsWith('Адрес:')){
     addText(p,line,true);return;
   }
   if(isSubject&&line.startsWith('Относно:')){
     addText(p,'Относно:',true,true);
     const rest=line.slice('Относно:'.length);
     // Universal formatting, independent of whether the dossier is a plan,
     // programme, project or investment proposal. Only the *title* that is
     // explicitly quoted as the document subject is bold; location quotes
     // (e.g. the locality) are left italic.
     const quoted=[...rest.matchAll(/„[^“\n]{2,180}“/gu)];
     // A quoted locality, street, district or zone is *not* the title of the document.
     const candidate=quoted.find(m=>{
       const before=rest.slice(0,m.index).trimEnd();
       return !/(?:местност|ул\.|улица|квартал|район|село|гр\.|град|землище|община|област|защитена\s+зона|зона)\s*$/iu.test(before);
     });
     const approvedTitle=candidate?.[0]||'';
     const titleAt=approvedTitle?rest.indexOf(approvedTitle):-1;
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
   while(para.firstChild)para.removeChild(para.firstChild);
   if(props)para.appendChild(props);
   if(title)addText(para,line,true);else segmented(para,line,subject);
   if(textIn(para)!==line)throw Error('Text mismatch while formatting paragraph');
 };
 const formatTitle=para=>{
   let props=Array.from(para.childNodes).find(n=>n.namespaceURI===W&&n.localName==='pPr');
   if(!props){props=WN('pPr');para.insertBefore(props,para.firstChild)}
   for(const n of Array.from(props.childNodes).filter(n=>n.namespaceURI===W&&['spacing','jc','ind'].includes(n.localName)))props.removeChild(n);
   const spacing=WN('spacing');
   spacing.setAttributeNS(W,'w:before','240');spacing.setAttributeNS(W,'w:after','240');
   spacing.setAttributeNS(W,'w:line','240');spacing.setAttributeNS(W,'w:lineRule','auto');
   props.appendChild(spacing);
   const jc=WN('jc');jc.setAttributeNS(W,'w:val','center');props.appendChild(jc);
   for(const tag of ['keepNext','keepLines','widowControl'])props.appendChild(WN(tag));
 };
 const formatClosing=para=>{
   let props=Array.from(para.childNodes).find(n=>n.namespaceURI===W&&n.localName==='pPr');
   if(!props){props=WN('pPr');para.insertBefore(props,para.firstChild)}
   for(const n of Array.from(props.childNodes).filter(n=>n.namespaceURI===W&&n.localName==='spacing'))props.removeChild(n);
   const sp=WN('spacing');sp.setAttributeNS(W,'w:before','360');sp.setAttributeNS(W,'w:after','0');
   sp.setAttributeNS(W,'w:line','240');sp.setAttributeNS(W,'w:lineRule','auto');props.appendChild(sp);
   props.appendChild(WN('keepNext'));
 };
 const newPara=(line)=>{
   const p=WN('p'),pp=WN('pPr'),spacing=WN('spacing');
   spacing.setAttributeNS(W,'w:after','0');spacing.setAttributeNS(W,'w:line','240');
   spacing.setAttributeNS(W,'w:before','0');spacing.setAttributeNS(W,'w:lineRule','auto');pp.appendChild(spacing);
   const indent=WN('ind');indent.setAttributeNS(W,'w:firstLine','567');pp.appendChild(indent); // 1 cm first-line indent
   pp.appendChild(WN('widowControl'));
   const align=WN('jc');align.setAttributeNS(W,'w:val','both');pp.appendChild(align);p.appendChild(pp);
   segmented(p,line);if(textIn(p)!==line)throw Error('Text mismatch in new paragraph');
   return p;
 };
 const renderedSubject=quotedSubject(subject);
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
 const align=WN('jc');align.setAttributeNS(W,'w:val','left');signProps.appendChild(align);
 const closing=allPar.find(p=>textIn(p).trim()==='С уважение,');
 if(!closing)throw Error('Липсва заключителният реквизит „С уважение,“.');
 replacePara(closing,'С уважение,',false,true);
 formatClosing(closing);
 const locate=token=>paragraphs.find(p=>textIn(p).includes(token));
 // Re-apply bold recipient labels even when the built-in template changes.
 const recipient=allPar.find(p=>textIn(p).trim()==='ДО');
 const recipientParty=allPar.find(p=>textIn(p).startsWith('Възложител:'));
 const recipientAddress=allPar.find(p=>textIn(p).startsWith('Адрес:'));
 if(!recipient||!recipientParty||!recipientAddress)throw Error('Липсват реквизити за адресата.');
 for(const para of [recipient,recipientParty,recipientAddress])replacePara(para,textIn(para));
 const subj=locate('{{SUBJECT}}'),title=locate('{{DOCUMENT_TITLE}}'),anchor=locate('{{BODY_ANCHOR}}');
 if(!subj||!title||!anchor)throw Error('Липсва динамичен раздел в бланката.');
 replacePara(subj,renderedSubject,true);replacePara(title,docTitle.toLocaleUpperCase('bg-BG'),false,true);
 formatTitle(title);
 // KT120: Subject is justified, with the same 1 cm first-line indent as the body.
 let subjectProps=Array.from(subj.childNodes).find(n=>n.namespaceURI===W&&n.localName==='pPr');
 if(!subjectProps){subjectProps=WN('pPr');subj.insertBefore(subjectProps,subj.firstChild)}
 for(const node of Array.from(subjectProps.childNodes).filter(n=>n.namespaceURI===W&&(n.localName==='jc'||n.localName==='ind')))subjectProps.removeChild(node);
 const subjectAlign=WN('jc');subjectAlign.setAttributeNS(W,'w:val','both');subjectProps.appendChild(subjectAlign);
 const subjectIndent=WN('ind');subjectIndent.setAttributeNS(W,'w:firstLine','567');subjectProps.appendChild(subjectIndent);
 subjectProps.appendChild(WN('widowControl'));
 // Retain original confirmed subject content; formatting is independent from proposal text.
 const nodes=bodyLines.map(x=>newPara(x));
 // Keep the closing signature block together with the preceding substantive
 // paragraph. Without this, Word can strand "С уважение" on a new page.
 // This does not change a single character of the expert-confirmed text.
 const lastBody=nodes.at(-1);
 if(lastBody){
   const props=Array.from(lastBody.childNodes).find(n=>n.namespaceURI===W&&n.localName==='pPr');
   if(props&&!Array.from(props.childNodes).some(n=>n.namespaceURI===W&&n.localName==='keepNext'))props.appendChild(WN('keepNext'));
 }
 for(const p of nodes)body.insertBefore(p,anchor);
 body.removeChild(anchor);
 const actual=[textIn(subj),...nodes.map(textIn)].join('\n');
 const presentationText=[renderedSubject,...bodyLines].join('\n');
 if(actual!==presentationText)throw Error('DOCX не съвпада с потвърденото съдържание и единственото разрешено оформление на предмета.');
 // Preserve confirmed body text exactly. The subject may gain only approved title quotation marks.
 contents['word/document.xml']=new TextEncoder().encode(serializeXml(dom));
 return contents;
}
