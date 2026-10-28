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
 for(let i=0;i<4;i++){
  const p=ps[MAP[scenario][i]],runs=nodes(p,'r');
  if(!runs.length||nodes(p,'drawing').length||nodes(p,'fldChar').length)throw Error('Защитен или сложен абзац; редакцията е спряна.');
  const texts=nodes(p,'t');if(!texts.length)throw Error('Липсва текстово поле.');
  texts[0].textContent=String(paragraphs[i]);texts[0].setAttribute('xml:space','preserve');
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
  const p=ps[index],texts=nodes(p,'t');if(!texts.length)throw Error('Липсва променливо текстово поле.');
  if(nodes(p,'drawing').length||nodes(p,'fldChar').length)throw Error('Променливото поле съдържа защитен елемент.');
  texts[0].textContent=value;texts[0].setAttribute('xml:space','preserve');for(const t of texts.slice(1))t.textContent='';
 };
 const legalIndices=scenario==='A'?[22,23,24,25,31]:[20,21,22,23,24,25,31];
 if(!Array.isArray(metadata.legalParagraphs)||metadata.legalParagraphs.length<legalIndices.length||metadata.legalParagraphs.slice(0,legalIndices.length).some(x=>!String(x).trim()))throw Error('Не са потвърдени всички фактически и правни констатации.');
 const parcelIds=String(metadata.parcelIds||'').match(/\b\d{5}\.\d+\.\d+(?:\.\d+){0,2}\b/g)||[];
 if(!parcelIds.length)throw Error('Липсват потвърдени кадастрални идентификатори.');
 if(scenario==='A'){
  replaceParagraph(6,metadata.recipient);replaceParagraph(7,metadata.address);
  replaceParagraph(10,'Относно: '+metadata.subject+' — имоти '+parcelIds.join(', '));replaceParagraph(13,metadata.salutation);
  replaceParagraph(16,'Във връзка с уведомление '+metadata.incomingReference+' за '+metadata.subject+', имоти '+parcelIds.join(', ')+'.');
 }else{
  replaceParagraph(5,metadata.recipient);replaceParagraph(6,'');replaceParagraph(7,metadata.address);
  replaceParagraph(9,'Относно: '+metadata.subject+' — имоти '+parcelIds.join(', '));replaceParagraph(11,metadata.salutation);replaceParagraph(12,'');
  replaceParagraph(14,'Във връзка с уведомление '+metadata.incomingReference+' за '+metadata.subject+', имоти '+parcelIds.join(', ')+'.');
 }
 legalIndices.forEach((index,i)=>replaceParagraph(index,String(metadata.legalParagraphs[i])));
 // The procedure statement and five impact findings are case-specific, never reusable sample findings.
 if(!String(metadata.procedureFinding||'').trim())throw Error('Липсва проверена констатация за приложимата процедура по Наредбата за ОС.');
 if(!Array.isArray(metadata.impactFindings)||metadata.impactFindings.length!==5||metadata.impactFindings.some(v=>!String(v).trim()))throw Error('Липсват петте проверени констатации за въздействията.');
 replaceParagraph(scenario==='A'?17:15,metadata.procedureFinding);
 const impactIndices=[26,27,28,29,30];
 const used=new Set([...MAP[scenario],...legalIndices,...(scenario==='A'?[6,7,10,13,16,17]:[5,6,7,9,11,12,14,15])]);
 if(impactIndices.some(i=>used.has(i)))throw Error('Конфликт между полета на образеца — генерирането е спряно за защита на правния текст.');
 for(let i=0;i<5;i++)replaceParagraph(impactIndices[i],String(metadata.impactFindings[i]));
 // The confirmed parcel list is the single source of truth for the proposal.
 // Unknown sample IDs mean an unmapped template paragraph, not an unconfirmed parcel.
 const unmatched=nodes(xml,'t').flatMap(t=>(t.textContent||'').match(/\b\d{5}\.\d+\.\d+(?:\.\d+){0,2}\b/g)||[]).filter(id=>!parcelIds.includes(id));
 if(unmatched.length)throw Error('Останал е примерен идентификатор в образеца: '+[...new Set(unmatched)].join(', ')+'. Поправете полето на образеца, без повторно потвърждаване на имотите.');
 const evidence=metadata.dossierEvidence;
 if(evidence){
  const addParagraph=(value)=>{
   const p=xml.createElementNS(NS,'w:p'),r=xml.createElementNS(NS,'w:r'),t=xml.createElementNS(NS,'w:t');
   t.setAttribute('xml:space','preserve');t.textContent=String(value);r.appendChild(t);p.appendChild(r);
   const section=nodes(body,'sectPr')[0];if(section&&section.parentNode===body)body.insertBefore(p,section);else body.appendChild(p);
  };
  addParagraph('ПРИЛОЖЕНА ДОКУМЕНТАЛНА ПРОСЛЕДИМОСТ — РАБОТНИ ДАННИ, ЗА ЕКСПЕРТНА ПРОВЕРКА');
  addParagraph('Единен анализ на преписката: сценарий '+String(evidence.diagnosis?.scenario||'НЕОПРЕДЕЛЕН')+'; пространствен статус: '+String(evidence.diagnosis?.spatialStatus||'нерешено')+'. Правната приложимост се потвърждава от експерта.');
  for(const item of (evidence.findings||[]).slice(0,20)){
   const sources=(item.evidence||[]).slice(0,5).map(e=>String(e.file||'неизвестен документ')+' ('+String(e.date||'дата предстои')+')').join('; ');
   addParagraph('Запис: '+String(item.key||'')+'; статус: '+String(item.status||'непотвърден')+'; източници: '+sources+'. Правна приложимост: ПРЕДСТОИ.');
  }
  for(const warning of (evidence.warnings||[]).slice(0,15))addParagraph('Предупреждение: '+String(warning.kind||'неуточнено')+'; документ: '+String(warning.file||'неизвестен'));
 }
 zip['word/document.xml']=new TextEncoder().encode(new XMLSerializer().serializeToString(xml));
 return new Blob([root.fflate.zipSync(zip,{level:6})],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
root.V26TemplateWord=Object.freeze({make,templatePaths});
})(typeof window!=='undefined'?window:globalThis);
