/* V26.4 original DOCX template bridge: templates must be hosted alongside this script. */
(function(root){'use strict';
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const MAP={A:[18,19,20,21],B:[16,17,18,19]};
const templatePaths={A:'templates/V26_3_Obrazec_A.docx',B:'templates/V26_3_Obrazec_B.docx'};
function nodes(p,n){return Array.from(p.getElementsByTagNameNS(NS,n))}
async function make(scenario,paragraphs,metadata){
 scenario=({'А':'A','Б':'B'})[scenario]||scenario;
 if(!MAP[scenario])throw Error('ГИС сценарият А/Б не е потвърден.');
 if(!Array.isArray(paragraphs)||paragraphs.length!==4||paragraphs.some(x=>!String(x).trim()))throw Error('Липсват четирите проверени абзаца.');
 if(!root.fflate?.unzipSync||!root.fflate?.zipSync){await new Promise((resolve,reject)=>{const el=document.createElement('script');el.src='https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js';el.onload=resolve;el.onerror=()=>reject(Error('Неуспешно зареждане на ZIP библиотеката.'));document.head.appendChild(el)});}
 if(!root.fflate?.unzipSync||!root.fflate?.zipSync)throw Error('Липсва ZIP библиотека.');
 const response=await fetch(templatePaths[scenario],{cache:'no-store'});
 if(!response.ok)throw Error('Оригиналният образец '+scenario+' не е публикуван. Не се създава заместител.');
 const zip=root.fflate.unzipSync(new Uint8Array(await response.arrayBuffer()));
 const entry=zip['word/document.xml'];if(!entry)throw Error('Невалиден Word образец.');
 const xml=new DOMParser().parseFromString(new TextDecoder().decode(entry),'application/xml');
 if(xml.getElementsByTagName('parsererror').length)throw Error('Грешка в Word XML.');
 const body=nodes(xml,'body')[0];
 const ps=Array.from(body.childNodes).filter(x=>x.nodeType===1&&x.namespaceURI===NS&&x.localName==='p');
 if(ps.length<34)throw Error('Непозната структура на Word образеца.');
 const expected=['С реализацията','Електроснабдяването','Водоснабдяването','Отпадъчните води'];
 const expectedB=['С реализацията','Електроснабдяването','Водозахранването','Отпадъчните води'];
 const labels=scenario==='A'?expected:expectedB;
 for(let i=0;i<4;i++){const text=nodes(ps[MAP[scenario][i]],'t').map(t=>t.textContent).join('').trim();if(!text.replace(/^\s+/,'').startsWith(labels[i]))throw Error('Неочакван абзац в оригиналния Word образец.');}
 // Preflight original template: mandatory highlighted text must not be editable.
 const plannedEditable=new Set([...MAP[scenario],...(scenario==='A'?[22,23,24,25,31,26,27,28,29,30,6,7,10,13,16,17]:[20,21,22,23,24,25,31,26,27,28,29,30,5,6,7,9,11,12,14,15])]);
 const mandatory=ps.map((p,i)=>({p,i})).filter(({p})=>nodes(p,'shd').some(n=>/^(?:ffff00|fff2cc|ffeb9c|ffff99)$/i.test(n.getAttributeNS(NS,'fill')||n.getAttribute('w:fill')||n.getAttribute('fill')||''))||nodes(p,'highlight').some(n=>/yellow/i.test(n.getAttributeNS(NS,'val')||n.getAttribute('w:val')||n.getAttribute('val')||'')));
 const mandatoryIndices=new Set(mandatory.map(x=>x.i));
 // In original B, yellow also marks case-specific sample text; only designated fields may change.
 const caseSpecificHighlighted=scenario==='B'?new Set([9,14,21,22,23,24,25,31]):new Set([10,16,22,23,24,25,31]);
 for(const i of MAP[scenario])if(mandatoryIndices.has(i))throw Error('Задължителен жълт блок съвпада с характеристиката на ИП: '+(i+1));
 // Mandatory highlighted paragraphs are immutable; case details are carried by other editable fields.
 const writable=(index)=>!mandatoryIndices.has(index)||caseSpecificHighlighted.has(index);
 for(let i=0;i<4;i++){
  const p=ps[MAP[scenario][i]],runs=nodes(p,'r');
  if(!runs.length||nodes(p,'drawing').length||nodes(p,'fldChar').length)throw Error('Защитен или сложен абзац; редакцията е спряна.');
  const texts=nodes(p,'t');if(!texts.length)throw Error('Липсва текстово поле.');
  const value=String(paragraphs[i]).trim();
  // The source templates have four distinct administrative sentences.
  // Do not replace them with raw excerpts or generic missing-data notes.
  if(!value.startsWith(labels[i]))throw Error('Абзац '+(i+1)+' трябва да започва с „'+labels[i]+'“ според образец '+scenario+'.');
  if(/Няма данни в преписката|ПРОЕКТ, за проверка|Източник:|ЗА ЕКСПЕРТНА ПРОВЕРКА|извлечено от преписката|необходима е експертна проверка/i.test(value))throw Error('Абзац '+(i+1)+' съдържа техническа бележка вместо проверен административен текст.');
  texts[0].textContent=value;texts[0].setAttribute('xml:space','preserve');
  for(const t of texts.slice(1))t.textContent='';
 }
 // Protect the administrative conclusion and parcel/recipient sections from stale sample facts.
 // Protected territories (ЗЗТ) and Natura 2000 protected zones (ЗБР) are distinct concepts.
 const protectedTerritoryText=nodes(xml,'t').map(t=>t.textContent).join(' ');
 if(!protectedTerritoryText.includes('защитени територии'))throw Error('Липсва отделната проверка за защитени територии по ЗЗТ.');
 // Case-specific identity, subject, and incoming reference must be supplied and reviewed.
 const required=['recipient','address','subject','incomingReference','salutation','legalParagraphs'];
 if(!metadata||required.some(k=>k!=='legalParagraphs'&&!String(metadata[k]||'').trim()))throw Error('Липсват потвърдени адресат, адрес, предмет, входящ номер или обръщение.');
 const replaceParagraph=(index,value)=>{
  if(!writable(index))return;
  const p=ps[index],texts=nodes(p,'t');if(!texts.length)throw Error('Липсва променливо текстово поле.');
  if(nodes(p,'drawing').length||nodes(p,'fldChar').length)throw Error('Променливото поле съдържа защитен елемент.');
  texts[0].textContent=value;texts[0].setAttribute('xml:space','preserve');for(const t of texts.slice(1))t.textContent='';
 };
 const legalIndices=scenario==='A'?[22,23,24,25,31]:[20,21,22,23,24,25,31];
 if(!Array.isArray(metadata.legalParagraphs)||metadata.legalParagraphs.length<legalIndices.length||metadata.legalParagraphs.slice(0,legalIndices.length).some(x=>!String(x).trim()))throw Error('Не са потвърдени всички фактически и правни констатации.');
 // Normalize quoted dossier titles without changing the substantive subject.
 const normalizedSubject=String(metadata.subject||'').replace(/\s+/g,' ').replace(/\bи\s+зграждането\b/gi,'изграждането').replace(/\bСк\s+лад\b/g,'Склад').replace(/\bпро\s+мишлени\b/gi,'промишлени').replace(/„{2,}/g,'„').replace(/“{2,}/g,'“').replace(/\s+([,.;:])/g,'$1').trim();
 metadata={...metadata,subject:normalizedSubject};
 const parcelIds=[...new Set((String(metadata.parcelIds||'').match(/\b\d{5}\.\d+\.\d+(?:\.\d+){0,2}\b/g)||[]).map(id=>id.split('.').slice(0,3).join('.')))];
 if(!parcelIds.length)throw Error('Липсват потвърдени кадастрални идентификатори.');
 const location=String(metadata.location||'').trim();
 const parcelDescription=(parcelIds.length===1?'поземлен имот с идентификатор ':'поземлени имоти с идентификатори ')+parcelIds.join(', ')+(location?', находящ'+(parcelIds.length===1?' се':'и се')+' в '+location:'');
 if(scenario==='A'){
  replaceParagraph(6,metadata.recipient);replaceParagraph(7,metadata.address);
  replaceParagraph(10,'Относно: '+metadata.subject+' — '+parcelDescription);replaceParagraph(13,metadata.salutation);
  replaceParagraph(16,'Във връзка с уведомление '+metadata.incomingReference+' за '+metadata.subject+', '+parcelDescription+'.');
 }else{
  replaceParagraph(5,metadata.recipient);replaceParagraph(6,'');replaceParagraph(7,metadata.address);
  replaceParagraph(9,'Относно: '+metadata.subject+' — '+parcelDescription);replaceParagraph(11,metadata.salutation);replaceParagraph(12,'');
  replaceParagraph(14,'Във връзка с уведомление '+metadata.incomingReference+' за '+metadata.subject+', '+parcelDescription+'.');
 }
 legalIndices.forEach((index,i)=>replaceParagraph(index,String(metadata.legalParagraphs[i])));
 // The procedure statement and five impact findings are case-specific, never reusable sample findings.
 if(!String(metadata.procedureFinding||'').trim())throw Error('Липсва проверена констатация за приложимата процедура по Наредбата за ОС.');
 if(!Array.isArray(metadata.impactFindings)||metadata.impactFindings.length!==5||metadata.impactFindings.some(v=>!String(v).trim()))throw Error('Липсват петте проверени констатации за въздействията.');
 replaceParagraph(scenario==='A'?17:15,metadata.procedureFinding);
 const impactIndices=[26,27,28,29,30];
 const used=new Set([...MAP[scenario],...legalIndices,...(scenario==='A'?[6,7,10,13,16,17]:[5,6,7,9,11,12,14,15])]);
 if(impactIndices.some(i=>used.has(i)))throw Error('Конфликт между полета на образеца — генерирането е спряно за защита на правния текст.');
 for(let i=0;i<5;i++)if(!mandatoryIndices.has(impactIndices[i]))replaceParagraph(impactIndices[i],String(metadata.impactFindings[i]));
 // Remove stale example identifiers only from explicitly writable paragraphs.
 for(let i=0;i<ps.length;i++){
  if(!writable(i))continue;
  const p=ps[i],current=nodes(p,'t').map(t=>t.textContent||'').join('');
  if(!/\b\d{5}\.\d+\.\d+\b/.test(current))continue;
  if(/подпис/i.test(current))continue;
  // Replace the combined paragraph exactly once: Word may split a single
  // cadastral identifier across multiple runs. Per-run substitutions can
  // duplicate identifiers and corrupt the administrative sentence.
  const updated=current.replace(/\b\d{5}\.\d+\.\d+(?:\.\d+){0,2}\b/g,id=>parcelIds.includes(id)?id:parcelIds.join(', '));
  if(updated!==current)replaceParagraph(i,updated);
 }
 // The confirmed parcel list is the single source of truth for the proposal.
 // Unknown sample IDs mean an unmapped template paragraph, not an unconfirmed parcel.
 const unmatched=nodes(xml,'t').flatMap(t=>(t.textContent||'').match(/\b\d{5}\.\d+\.\d+(?:\.\d+){0,2}\b/g)||[]).filter(id=>!parcelIds.includes(id));
 if(unmatched.length)throw Error('Останал е примерен идентификатор в образеца: '+[...new Set(unmatched)].join(', ')+'. Поправете полето на образеца, без повторно потвърждаване на имотите.');
 // Protect template paragraphs that are not explicitly approved for case-specific replacement.
 const editableIndices=new Set([...MAP[scenario],...legalIndices,...impactIndices.filter(i=>!mandatoryIndices.has(i)),...(scenario==='A'?[6,7,10,13,16,17]:[5,6,7,9,11,12,14,15])].filter(writable));
 // The two signature slots must remain present and untouched in the template body.
 const signatureCandidates=ps.map((p,i)=>({i,text:nodes(p,'t').map(t=>t.textContent).join('')})).filter(x=>/електронен\s+подпис|електронно\s+подпис|подписал|подпис\s*:/i.test(x.text));
 for(const item of signatureCandidates){if(editableIndices.has(item.i))throw Error('Поле за подпис попада сред редактираните абзаци: '+(item.i+1));}
 const sourceXml=new DOMParser().parseFromString(new TextDecoder().decode(entry),'application/xml');
 const originalParagraphs=Array.from(nodes(sourceXml,'body')[0].childNodes).filter(x=>x.nodeType===1&&x.namespaceURI===NS&&x.localName==='p');
 for(let i=0;i<Math.min(originalParagraphs.length,ps.length);i++){
  if(editableIndices.has(i))continue;
  const originalText=nodes(originalParagraphs[i],'t').map(t=>t.textContent).join('');
  const currentText=nodes(ps[i],'t').map(t=>t.textContent).join('');
  if(originalText!==currentText)throw Error('Променен е фиксиран текст от образеца: абзац '+(i+1));
 }
 // Technical provenance belongs in the ZIP README, never after the official signatures.
 // Preserve original template package parts: the generated proposal only edits document.xml.
 const protectedParts=Object.keys(zip).filter(name=>name!=='word/document.xml');
 const protectedSnapshot=protectedParts.map(name=>[name,zip[name]]);
 for(const [name,bytes] of protectedSnapshot){
  if(!bytes || zip[name]!==bytes)throw Error('Променена е защитена част от образеца: '+name);
 }
 // Internal workflow: explicit empty signature slots at start and end.
 // They are labels only, not embedded electronic signatures or certificates.
 const makeSlot=label=>{const p=xml.createElementNS(NS,'w:p'),r=xml.createElementNS(NS,'w:r'),t=xml.createElementNS(NS,'w:t');t.textContent=label;r.appendChild(t);p.appendChild(r);return p;};
 const first=Array.from(body.childNodes).find(n=>n.nodeType===1&&n.localName==='p');
 if(!first)throw Error('Липсва начало на документа за полето за съгласуване.');
 body.insertBefore(makeSlot('Място за електронен подпис — вътрешно съгласуване'),first);
 body.insertBefore(makeSlot('РАБОТЕН ПРОЕКТ — ЗА ЕКСПЕРТНА ПРОВЕРКА. НЕ Е ИЗДАДЕН АДМИНИСТРАТИВЕН АКТ.'),first);
 const section=Array.from(body.childNodes).find(n=>n.nodeType===1&&n.localName==='sectPr');
 if(!section)throw Error('Липсва крайна секция за поле за подпис.');
 body.insertBefore(makeSlot('Място за електронен подпис — окончателно подписване'),section);
 zip['word/document.xml']=new TextEncoder().encode(new XMLSerializer().serializeToString(xml));
 return new Blob([root.fflate.zipSync(zip,{level:6})],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
root.V26TemplateWord=Object.freeze({make,templatePaths});
})(typeof window!=='undefined'?window:globalThis);
