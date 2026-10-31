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

async function renderOverview(svg){
 if(ArrayBuffer.isView(svg)&&svg.byteLength>64&&svg[0]===137&&svg[1]===80&&svg[2]===78&&svg[3]===71)return svg;
 if(!svg||!svg.includes('<svg'))throw Error('КТ15.6: липсва обзорна ГИС карта.');
 const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
 try{
  const img=new Image();
  await new Promise((ok,no)=>{img.onload=ok;img.onerror=()=>no(Error('Невалидна ГИС карта.'));img.src=url;});
  const canvas=document.createElement('canvas');canvas.width=1100;canvas.height=680;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,1100,680);
  const ratio=Math.min(1060/img.width,640/img.height);
  ctx.drawImage(img,(1100-img.width*ratio)/2,(680-img.height*ratio)/2,img.width*ratio,img.height*ratio);
  const blob=await new Promise((ok,no)=>canvas.toBlob(b=>b?ok(b):no(Error('Неуспешно PNG преобразуване.')),'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
 }finally{URL.revokeObjectURL(url)}
}
function mapParagraph(doc){
 const xml='<w:p xmlns:w="'+NS+'" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:r><w:drawing><wp:inline><wp:extent cx="5181600" cy="3202996"/><wp:docPr id="91" name="Обзорна ГИС карта"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="91" name="gis-overview.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdV26Map"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="5181600" cy="3202996"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';
 const parsed=new DOMParser().parseFromString(xml,'application/xml');
 if(parsed.getElementsByTagName('parsererror').length)throw Error('Невалиден DrawingML.');
 return doc.importNode(parsed.documentElement,true);
}
async function make(draft,overviewSvg){
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
 const mapBytes=await renderOverview(overviewSvg);
 const m=draft.metadata;
 if(!m.recipient||!m.address||!m.subject||!m.incomingReference||!m.salutation)throw Error('КТ13: липсват потвърдени административни реквизити.');
 const legal=(m.legalParagraphs||[]).slice(0,scenario==='A'?5:7),impacts=m.impactFindings||[];
 if(legal.length<(scenario==='A'?5:7)||legal.some(x=>!x)||!m.procedureFinding||impacts.length!==5||impacts.some(x=>!x))throw Error('КТ13: липсват проверени фактически, правни или въздействени констатации.');
 const isPending=x=>/\[ЗА ЕКСПЕРТНА ПРОВЕРКА/.test(String(x||''));
 const pendingRequired=[m.recipient,m.address,m.subject,m.incomingReference,m.salutation,...legal,m.procedureFinding,...impacts];
 const reviewPending=pendingRequired.some(isPending);
 if(!Array.isArray(draft.parcels)||!draft.parcels.length||draft.parcels.some(p=>!/^\d{5}\.\d+\.\d+$/.test(String(p.id||''))))throw Error('КТ13: невалиден или липсващ имотен обхват.');
 if(!Array.isArray(draft.characterization)||draft.characterization.length!==4||draft.characterization.some(x=>!String(x||'').trim()))throw Error('КТ13: четирите характеристики трябва да бъдат редактирани и потвърдени.');
 const subject=String(m.subject).replace(/^Относно:\s*/i,'').replace(/^(?:инвестиционно предложение\s*)+/i,'').replace(/^[„“"\s]+|[„“"\s]+$/g,'').replace(/\s+/g,' ').trim();
 const confirmed=xs=>xs.filter(x=>!isPending(x));
 const blocks=[
  paragraph(doc,'Място за електронен подпис — вътрешно съгласуване'),
  paragraph(doc,'РАБОТЕН ЕКСПЕРТЕН ПРОЕКТ — НЕ Е АДМИНИСТРАТИВЕН АКТ',{heading:true}),
  ...(isPending(m.recipient)?[]:[paragraph(doc,m.recipient,{bold:true})]),...(isPending(m.address)?[]:[paragraph(doc,m.address)]),
  paragraph(doc,'Относно: '+subject,{bold:true}),
  ...(isPending(m.incomingReference)?[]:[paragraph(doc,'Преписка: '+m.incomingReference)]),
  ...(isPending(m.salutation)?[]:[paragraph(doc,m.salutation)]),
  paragraph(doc,'ЕКСПЕРТНА АНАЛИТИЧНА СПРАВКА',{heading:true}),
  ...(draft.authoredText?[paragraph(doc,'АВТОРСКИ ЕКСПЕРТЕН АНАЛИЗ',{heading:true}),...String(draft.authoredText).split(/\\n\\s*\\n/).map(t=>t.trim()).filter(Boolean).map(t=>paragraph(doc,t))]:[]),
  paragraph(doc,'Основа: потвърден имотен обхват, резултат от ГИС анализа и налични документи по преписката.'),
  paragraph(doc,'Статус: проект за експертен преглед; не замества официално становище или административен акт.'),
  paragraph(doc,'I. ПРЕДМЕТ И ИМОТЕН ОБХВАТ',{heading:true}),
  paragraph(doc,'Предмет на ИП: '+subject),
  paragraph(doc,'Поземлени имоти: '+draft.parcels.map(p=>p.id+' ('+(p.role==='leading'?'предмет на ИП':'съпътстващ')+')').join('; ')),
  ...(m.location?[paragraph(doc,'Местоположение: '+m.location)]:[]),
  paragraph(doc,'II. ПРОСТРАНСТВЕН АНАЛИЗ',{heading:true}),
  paragraph(doc,'В съответствие с принципа за пространствено онагледяване на инвестиционните предложения, отразен в приложение №3 към чл. 10, ал. 2, част Б, т. 3 от Наредбата за оценка за съвместимост, в настоящия експертен проект е включено обзорно картографско извлечение от извършения ГИС анализ.'),
  mapParagraph(doc),
  paragraph(doc,'Фигура 1. Пространствено положение на имотите спрямо защитените зони от мрежата „Натура 2000“.',{bold:true}),
  paragraph(doc,'Източник: ГИС анализ, Приложение №1.'),
  paragraph(doc,draft.scenario==='Б'?'По наличните ГИС данни е установено пространствено пресичане със защитена зона: '+draft.zones.join(', ')+'.':'По наличните ГИС данни не е установено пресичане на потвърдените имоти със защитена зона.'),
  paragraph(doc,'Приложение №1 — ГИС анализ представя пространствените резултати, картографската основа и имотния обхват.'),
  paragraph(doc,'Обхват на анализа: '+draft.parcels.length+' потвърдени поземлени имота; '+draft.parcels.filter(p=>p.role==='leading').length+' с роля „предмет на ИП“ и '+draft.parcels.filter(p=>p.role==='ancillary').length+' съпътстващи.'),
  paragraph(doc,'Проверка на източниците: '+draft.evidence.findingsCount+' документални констатации и '+draft.evidence.warningsCount+' предупреждения от обработката на преписката. Тези показатели не заместват експертна проверка.'),
  paragraph(doc,'III. ХАРАКТЕРИСТИКА НА ПРЕДЛОЖЕНИЕТО',{heading:true}),
  ...confirmed(draft.characterization).map(x=>paragraph(doc,x)),

  paragraph(doc,'КОНТРОЛ НА ДОКАЗАТЕЛСТВАТА',{heading:true}),
  paragraph(doc,reviewPending?'Статус на документалната проверка: има непотвърдени административни, правни или въздействени данни. Не се допуска използване като окончателно становище.':'Статус на документалната проверка: задължителните полета са попълнени; необходима е заключителна експертна проверка на източниците.'),
  paragraph(doc,'Пространствените изводи произтичат от ГИС резултата. Документалните и правните изводи подлежат на самостоятелна проверка по приложимите първични източници.'),
  ...(draft.evidence.warningsCount?[paragraph(doc,'Внимание: при обработката на преписката са отчетени '+draft.evidence.warningsCount+' предупреждения. Те следва да се прегледат преди използване на документа.')]:[]),
  paragraph(doc,'IV. ФАКТИЧЕСКИ И ПРАВНИ КОНСТАТАЦИИ',{heading:true}),
  ...confirmed(legal).map(x=>paragraph(doc,x)),

  paragraph(doc,'V. ПРОЦЕДУРНА ПРЕЦЕНКА',{heading:true}),
  paragraph(doc,isPending(m.procedureFinding)?'Приложимата процедура не е потвърдена; изисква се преценка от компетентен експерт.':m.procedureFinding),
  paragraph(doc,'VI. КОНСТАТАЦИИ ЗА ВЪЗДЕЙСТВИЯТА',{heading:true}),
  ...confirmed(impacts).map(x=>paragraph(doc,x)),
  ...(impacts.some(isPending)?[paragraph(doc,'Не е изготвена окончателна оценка на въздействията. Изводите се попълват след проверка на приложимите режими и доказателствата.')]:[]),
  paragraph(doc,'VII. ЕКСПЕРТНО ОБОБЩЕНИЕ',{heading:true}),
  paragraph(doc,draft.scenario==='Б'?'Установеното пространствено пресичане със защитена зона е основание за преценка на приложимите режими и изисквания по конкретното инвестиционно предложение; само по себе си то не представлява извод за недопустимост.':'Липсата на установено пространствено пресичане със защитена зона по анализираните имоти не отменя необходимостта от проверка на приложимите нормативни изисквания и фактическите обстоятелства по преписката.'),
  paragraph(doc,'Правната и процедурната преценка се основава на проверените документи и приложимите разпоредби; непотвърдените данни и предупрежденията подлежат на изрична експертна проверка преди използване в официално становище.'),
  paragraph(doc,'VIII. СЪПЪТСТВАЩИ МАТЕРИАЛИ',{heading:true}),
  paragraph(doc,'Пълен ГИС анализ — самостоятелен PDF №1 в ZIP пакета. Нормативни и документални референции — самостоятелен PDF №2, когато е изготвен.'),
  paragraph(doc,'НЕОБХОДИМА Е ЕКСПЕРТНА ПРОВЕРКА НА ПРЕПИСКАТА, ПРАВНИТЕ ОСНОВАНИЯ И ИЗВОДИТЕ. Документът не представлява издаден административен акт.')
 ];
 body.replaceChildren(...blocks,paragraph(doc,'Място за електронен подпис — окончателно подписване'),sect.cloneNode(true));
 const serialized=new XMLSerializer().serializeToString(doc);
 if((serialized.match(/подпис/gi)||[]).length<2)throw Error('КТ13: липсват две полета за подпис в експертния документ.');

 const relDoc=new DOMParser().parseFromString(new TextDecoder().decode(rels),'application/xml');
 const relRoot=relDoc.documentElement,relNS='http://schemas.openxmlformats.org/package/2006/relationships';
 if(Array.from(relRoot.children).some(x=>x.getAttribute('Id')==='rIdV26Map'))throw Error('Конфликт на Word relationship.');
 const rel=relDoc.createElementNS(relNS,'Relationship');
 rel.setAttribute('Id','rIdV26Map');rel.setAttribute('Type','http://schemas.openxmlformats.org/officeDocument/2006/relationships/image');rel.setAttribute('Target','media/v26-gis-overview.png');relRoot.appendChild(rel);
 zip['word/_rels/document.xml.rels']=new TextEncoder().encode(new XMLSerializer().serializeToString(relDoc));
 const typesDoc=new DOMParser().parseFromString(new TextDecoder().decode(zip['[Content_Types].xml']),'application/xml');
 const typesRoot=typesDoc.documentElement,typesNS='http://schemas.openxmlformats.org/package/2006/content-types';
 if(!Array.from(typesRoot.children).some(x=>x.getAttribute('Extension')==='png')){
  const t=typesDoc.createElementNS(typesNS,'Default');t.setAttribute('Extension','png');t.setAttribute('ContentType','image/png');typesRoot.appendChild(t);
 }
 zip['[Content_Types].xml']=new TextEncoder().encode(new XMLSerializer().serializeToString(typesDoc));
 zip['word/media/v26-gis-overview.png']=mapBytes;
 zip['word/document.xml']=new TextEncoder().encode(serialized);
 return new Blob([root.fflate.zipSync(zip,{level:6})],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
root.V26ExpertWord=Object.freeze({make});
})(typeof window!=='undefined'?window:globalThis);
