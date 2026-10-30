/* KT13.3: independently structured expert DOCX, using the official template
   solely as the institutional package shell (header, footer, logo, signatures). */
(function(root){'use strict';
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const ns=(doc,name)=>doc.createElementNS(NS,'w:'+name);
const all=(node,name)=>Array.from(node.getElementsByTagNameNS(NS,name));
const textOf=p=>all(p,'t').map(t=>t.textContent).join('');
function paragraph(doc,value,{bold=false,heading=false}={}){
 const p=ns(doc,'p'),pPr=ns(doc,'pPr'),spacing=ns(doc,'spacing');
 spacing.setAttributeNS(NS,'w:after',heading?'160':'110');pPr.appendChild(spacing);p.appendChild(pPr);
 const r=ns(doc,'r'),rPr=ns(doc,'rPr'),font=ns(doc,'rFonts');
 font.setAttributeNS(NS,'w:ascii','Verdana');font.setAttributeNS(NS,'w:hAnsi','Verdana');font.setAttributeNS(NS,'w:cs','Verdana');rPr.appendChild(font);
 const size=ns(doc,'sz');size.setAttributeNS(NS,'w:val',heading?'24':'20');rPr.appendChild(size);
 if(bold||heading)rPr.appendChild(ns(doc,'b'));r.appendChild(rPr);
 const t=ns(doc,'t');t.setAttribute('xml:space','preserve');t.textContent=String(value);r.appendChild(t);p.appendChild(r);return p;
}
async function make(draft){
 if(draft?.schema!=='KT13_EXPERT_DRAFT_V1')throw Error('КТ13: липсва провереният експертен проект.');
 const scenario=draft.scenario==='А'?'A':'B';
 if(!root.fflate?.unzipSync||!root.fflate?.zipSync)throw Error('КТ13: ZIP библиотеката не е заредена.');
 const paths=root.V26TemplateWord?.templatePaths;
 if(!paths?.[scenario])throw Error('КТ13: липсва институционален образец.');
 const response=await fetch(paths[scenario],{cache:'no-store'});
 if(!response.ok)throw Error('КТ13: оригиналният образец не е достъпен.');
 const zip=root.fflate.unzipSync(new Uint8Array(await response.arrayBuffer()));
 const original=zip['word/document.xml'];if(!original)throw Error('КТ13: невалиден DOCX образец.');
 const doc=new DOMParser().parseFromString(new TextDecoder().decode(original),'application/xml');
 if(doc.getElementsByTagName('parsererror').length)throw Error('КТ13: невалиден Word XML.');
 const body=all(doc,'body')[0];if(!body)throw Error('КТ13: липсва Word body.');
 const source=Array.from(body.children);
 // Two unsigned internal workflow slots: one before the draft and one after it.
 // Do not copy names or apparent signatures from the source template.
 const sect=source.find(x=>x.localName==='sectPr');
 if(!sect)throw Error('КТ13: липсва секционна настройка с институционалния колонтитул.');
 const rels=zip['word/_rels/document.xml.rels'];
 if(!rels||!Object.keys(zip).some(x=>/^word\/header\d*\.xml$/.test(x))||!Object.keys(zip).some(x=>/^word\/footer\d*\.xml$/.test(x))||!Object.keys(zip).some(x=>/^word\/media\//.test(x)))throw Error('КТ13: липсва лого, хедър или футер на институционалния образец.');
 const m=draft.metadata;
 if(!m.recipient||!m.address||!m.subject||!m.incomingReference||!m.salutation)throw Error('КТ13: липсват потвърдени административни реквизити.');
 const legal=(m.legalParagraphs||[]).slice(0,scenario==='A'?5:7),impacts=m.impactFindings||[];
 if(legal.length<(scenario==='A'?5:7)||legal.some(x=>!x)||!m.procedureFinding||impacts.length!==5||impacts.some(x=>!x))throw Error('КТ13: липсват проверени фактически, правни или въздействени констатации.');
 const isPending=x=>/\[ЗА ЕКСПЕРТНА ПРОВЕРКА/.test(String(x||''));
 const pendingRequired=[m.recipient,m.address,m.subject,m.incomingReference,m.salutation,...legal,m.procedureFinding,...impacts];
 if(pendingRequired.some(isPending))throw Error('КТ13: има непотвърдени реквизити или правни констатации; експертният Word не се генерира.');
 if(!Array.isArray(draft.parcels)||!draft.parcels.length||draft.parcels.some(p=>!/^\\d{5}\\.\\d+\\.\\d+$/.test(String(p.id||''))))throw Error('КТ13: невалиден или липсващ имотен обхват.');
 if(!Array.isArray(draft.characterization)||draft.characterization.length!==4||draft.characterization.some(x=>!String(x||'').trim()||isPending(x)||/ОТКЪС ОТ ПРЕПИСКАТА|ЗА СВЕРЯВАНЕ/i.test(x)))throw Error('КТ13: четирите характеристики трябва да бъдат редактирани и потвърдени.');
 const subject=String(m.subject).replace(/^Относно:\s*/i,'').replace(/^(?:инвестиционно предложение\s*)+/i,'').replace(/^[„“"\s]+|[„“"\s]+$/g,'').replace(/\s+/g,' ').trim();
 const confirmed=xs=>xs.filter(x=>!isPending(x));
 const blocks=[
  paragraph(doc,'Място за електронен подпис — вътрешно съгласуване'),
  paragraph(doc,'РАБОТЕН ЕКСПЕРТЕН ПРОЕКТ — НЕ Е АДМИНИСТРАТИВЕН АКТ',{heading:true}),
  ...(isPending(m.recipient)?[]:[paragraph(doc,m.recipient,{bold:true})]),...(isPending(m.address)?[]:[paragraph(doc,m.address)]),
  paragraph(doc,'Относно: '+subject,{bold:true}),
  ...(isPending(m.incomingReference)?[]:[paragraph(doc,'Преписка: '+m.incomingReference)]),
  ...(isPending(m.salutation)?[]:[paragraph(doc,m.salutation)]),
  paragraph(doc,'I. ПРЕДМЕТ И ИМОТЕН ОБХВАТ',{heading:true}),
  paragraph(doc,'Предмет на ИП: '+subject),
  paragraph(doc,'Поземлени имоти: '+draft.parcels.map(p=>p.id+' ('+(p.role==='leading'?'предмет на ИП':'съпътстващ')+')').join('; ')),
  ...(m.location?[paragraph(doc,'Местоположение: '+m.location)]:[]),
  paragraph(doc,'II. ПРОСТРАНСТВЕН АНАЛИЗ',{heading:true}),
  paragraph(doc,draft.scenario==='Б'?'По наличните ГИС данни е установено пространствено пресичане със защитена зона: '+draft.zones.join(', ')+'.':'По наличните ГИС данни не е установено пресичане на потвърдените имоти със защитена зона.'),
  paragraph(doc,'Пространствените резултати и картографската основа са представени в Приложение №1.'),
  paragraph(doc,'III. ХАРАКТЕРИСТИКА НА ПРЕДЛОЖЕНИЕТО',{heading:true}),
  ...confirmed(draft.characterization).map(x=>paragraph(doc,x)),

  paragraph(doc,'IV. ФАКТИЧЕСКИ И ПРАВНИ КОНСТАТАЦИИ',{heading:true}),
  ...confirmed(legal).map(x=>paragraph(doc,x)),

  paragraph(doc,'V. ПРОЦЕДУРНА ПРЕЦЕНКА',{heading:true}),
  paragraph(doc,isPending(m.procedureFinding)?'Приложимата процедура не е потвърдена; изисква се преценка от компетентен експерт.':m.procedureFinding),
  paragraph(doc,'VI. КОНСТАТАЦИИ ЗА ВЪЗДЕЙСТВИЯТА',{heading:true}),
  ...confirmed(impacts).map(x=>paragraph(doc,x)),
  ...(impacts.some(isPending)?[paragraph(doc,'Не е изготвена окончателна оценка на въздействията. Изводите се попълват след проверка на приложимите режими и доказателствата.')]:[]),
  paragraph(doc,'VII. ПРИЛОЖЕНИЯ',{heading:true}),
  paragraph(doc,'Приложение №1 — ГИС анализ (самостоятелен PDF). Приложение №2 — Нормативни и документални референции (самостоятелен PDF, когато е изготвен).'),
  paragraph(doc,'НЕОБХОДИМА Е ЕКСПЕРТНА ПРОВЕРКА НА ПРЕПИСКАТА, ПРАВНИТЕ ОСНОВАНИЯ И ИЗВОДИТЕ. Документът не представлява издаден административен акт.')
 ];
 body.replaceChildren(...blocks,paragraph(doc,'Място за електронен подпис — окончателно подписване'),sect.cloneNode(true));
 const serialized=new XMLSerializer().serializeToString(doc);
 if((serialized.match(/подпис/gi)||[]).length<2)throw Error('КТ13: липсват две полета за подпис в експертния документ.');
 zip['word/document.xml']=new TextEncoder().encode(serialized);
 return new Blob([root.fflate.zipSync(zip,{level:6})],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
root.V26ExpertWord=Object.freeze({make});
})(typeof window!=='undefined'?window:globalThis);
