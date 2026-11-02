/* KT13.3: independently structured expert DOCX, using the official template
   solely as the institutional package shell (header, footer, logo, signatures). */
(function(root){'use strict';
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const ns=(doc,name)=>doc.createElementNS(NS,'w:'+name);
const all=(node,name)=>Array.from(node.getElementsByTagNameNS(NS,name));
const textOf=p=>all(p,'t').map(t=>t.textContent).join('');
function paragraph(doc,value,{bold=false,heading=false,center=false}={}){
 const p=ns(doc,'p'),pPr=ns(doc,'pPr'),spacing=ns(doc,'spacing');
 spacing.setAttributeNS(NS,'w:after',heading?'160':'110');pPr.appendChild(spacing);
 if(center){const jc=ns(doc,'jc');jc.setAttributeNS(NS,'w:val','center');pPr.appendChild(jc);}
 p.appendChild(pPr);
 const r=ns(doc,'r'),rPr=ns(doc,'rPr'),font=ns(doc,'rFonts');
 font.setAttributeNS(NS,'w:ascii','Verdana');font.setAttributeNS(NS,'w:hAnsi','Verdana');font.setAttributeNS(NS,'w:cs','Verdana');rPr.appendChild(font);
 const size=ns(doc,'sz');size.setAttributeNS(NS,'w:val','20');rPr.appendChild(size);
 if(bold||heading)rPr.appendChild(ns(doc,'b'));r.appendChild(rPr);
 const t=ns(doc,'t');t.setAttribute('xml:space','preserve');t.textContent=String(value);r.appendChild(t);p.appendChild(r);return p;
}
// KT24.3: style the confirmed quoted IP title and trailing location without changing any characters.
function subjectParagraph(doc,prefix,subject){
 const p=paragraph(doc,prefix+subject);
 const match=/„[^“]+“/.exec(subject);
 if(!match)return p; // Never guess boundaries when the expert has not supplied quotes.
 const first=prefix+subject.slice(0,match.index),quoted=match[0],tail=subject.slice(match.index+quoted.length);
 const runs=all(p,'r');if(!runs.length)return p;
 const original=runs[0],makeRun=(value,bold,italic)=>{
  const run=original.cloneNode(true),t=all(run,'t')[0],rPr=all(run,'rPr')[0];
  if(!t||!rPr)return null;t.textContent=value;
  if(bold)rPr.appendChild(ns(doc,'b'));
  if(italic)rPr.appendChild(ns(doc,'i'));
  return run;
 };
 p.removeChild(original);
 for(const [value,bold,italic] of [[first,false,false],[quoted,true,true],[tail,false,true]]){
  if(value){const run=makeRun(value,bold,italic);if(run)p.appendChild(run);}
 }
 return p;
}
async function mapPng(svg){
 if(typeof svg!=='string'||!svg.includes('<svg')||typeof document==='undefined')return null;
 const img=new Image(),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
 try{
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Неуспешно растеризиране на ГИС картата.'));img.src=url;});
  const canvas=document.createElement('canvas');canvas.width=1100;canvas.height=715;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Липсва графичен контекст за картата.');
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(Error('PNG картата не е създадена.')),'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
 }finally{URL.revokeObjectURL(url);}
}
function mapParagraph(doc){
 // KT24.3: keep the overview map with the following Figure 1 caption.
 const p=ns(doc,'p'),pPr=ns(doc,'pPr');pPr.appendChild(ns(doc,'keepNext'));pPr.appendChild(ns(doc,'keepLines'));
 const alignment=ns(doc,'jc');alignment.setAttributeNS(NS,'w:val','center');pPr.appendChild(alignment);p.appendChild(pPr);
 const r=ns(doc,'r'),drawing=ns(doc,'drawing');
 const wp='http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';
 const a='http://schemas.openxmlformats.org/drawingml/2006/main';
 const pic='http://schemas.openxmlformats.org/drawingml/2006/picture';
 const rel='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
 const el=(parent,uri,name,attrs={})=>{const node=doc.createElementNS(uri,name);for(const [k,v] of Object.entries(attrs))node.setAttribute(k,String(v));parent.appendChild(node);return node;};
 const inline=el(drawing,wp,'wp:inline',{distT:0,distB:0,distL:0,distR:0});
 el(inline,wp,'wp:extent',{cx:5486400,cy:3566160});
 el(inline,wp,'wp:docPr',{id:927,name:'ГИС обзорна карта'});
 const graphic=el(inline,a,'a:graphic'),data=el(graphic,a,'a:graphicData',{uri:pic});
 const picture=el(data,pic,'pic:pic'),nv=el(picture,pic,'pic:nvPicPr');
 el(nv,pic,'pic:cNvPr',{id:0,name:'gis-overview.png'});el(nv,pic,'pic:cNvPicPr');
 const fill=el(picture,pic,'pic:blipFill');
 const blip=el(fill,a,'a:blip');blip.setAttributeNS(rel,'r:embed','rIdV27GISMap');
 const stretch=el(fill,a,'a:stretch');el(stretch,a,'a:fillRect');
 const sp=el(picture,pic,'pic:spPr'),xf=el(sp,a,'a:xfrm');
 el(xf,a,'a:off',{x:0,y:0});el(xf,a,'a:ext',{cx:5486400,cy:3566160});
 const geom=el(sp,a,'a:prstGeom',{prst:'rect'});el(geom,a,'a:avLst');
 r.appendChild(drawing);p.appendChild(r);return p;
}
async function make(draft,options={}){
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
 if(!m.subject||!m.incomingReference||!m.salutation)throw Error('КТ13: липсват потвърдени основни административни реквизити.');
 const legal=(m.legalParagraphs||[]).slice(0,scenario==='A'?5:7),impacts=m.impactFindings||[];
 if(legal.length<(scenario==='A'?5:7)||legal.some(x=>!x)||!m.procedureFinding||impacts.length!==5||impacts.some(x=>!x))throw Error('КТ13: липсват проверени фактически, правни или въздействени констатации.');
 const isPending=x=>/\[ЗА ЕКСПЕРТНА ПРОВЕРКА/.test(String(x||''));
 const pendingRequired=[m.recipient,m.address,m.subject,m.incomingReference,m.salutation,...legal,m.procedureFinding,...impacts];
 const reviewPending=pendingRequired.some(isPending);
 if(!Array.isArray(draft.parcels)||!draft.parcels.length||draft.parcels.some(p=>!/^\d{5}\.\d+\.\d+$/.test(String(p.id||''))))throw Error('КТ13: невалиден или липсващ имотен обхват.');
 if(!Array.isArray(draft.characterization)||draft.characterization.length!==4||draft.characterization.some(x=>!String(x||'').trim()))throw Error('КТ13: четирите характеристики трябва да бъдат редактирани и потвърдени.');
 const subject=String(m.subject); // KT24.3: confirmed subject must remain byte-for-byte unchanged in Word output.
 const confirmed=xs=>xs.filter(x=>!isPending(x));
 const aiSections=(()=>{
  const out={},raw=String(draft.aiDraft||'');
  const re=/^\s*\[\[(CHARACTERIZATION|LEGAL|PROCEDURE|IMPACTS)\]\]\s*$/gm;
  const matches=[...raw.matchAll(re)];
  for(let i=0;i<matches.length;i++){
   const key=matches[i][1],start=matches[i].index+matches[i][0].length,end=i+1<matches.length?matches[i+1].index:raw.length;
   const value=raw.slice(start,end).trim().slice(0,3500);
   if(value&&!out[key]&&!/\[\[(?:CHARACTERIZATION|LEGAL|PROCEDURE|IMPACTS)\]\]/.test(value))out[key]=value;
  }
  return out;
 })();
 // Do not let an AI narrative override the GIS determination or assert unverified procedural exemptions.
 const unsupportedAi=x=>/(?:не е приложима процедура|не подлежи на процедура|не се изисква оценка|не попадат в границите на защитени зони или територии|намалява вероятността за задължително|малко вероятно|не показва наличие на рискове|намалява риска|намалява риск|по-нисък риск|нисък риск|незначителн(?:о|и|а) въздейств|без значим(?:о|и|а) въздейств|не се очаква въздейств|липса на значими въздействия|не поражда въздействия|извън защитени зони,? което)/i.test(x);
 const safeAi=key=>aiSections[key]&&!unsupportedAi(aiSections[key])&&!/защитени територии|BG[0-9]{7}|не се налага|не се изисква|не подлежи|няма вероятност|липсват въздействия|липсват рискове|не оказва въздействие/i.test(aiSections[key]);
 const aiProposal=key=>safeAi(key)?aiSections[key].split(/\n\s*\n/).filter(Boolean).slice(0,7).map(x=>paragraph(doc,x)):[];

 const mapBytes=options.mapPngBytes?.byteLength?Uint8Array.from(options.mapPngBytes):(options.mapSvg?await mapPng(options.mapSvg):null);
 // KT24.3: signature areas are blank; no visible workflow or signature labels.
 const recipientValue=String(m.recipient||'').trim()||'Възложителя: ХХХХХХХХХХХХХХ';
 const addressValue=String(m.address||'').trim()||'ХХХХХХХХХХХХХХ';
 const blocks=[
  paragraph(doc,''),
  paragraph(doc,'ПРОЕКТ НА СТАНОВИЩЕ',{heading:true}),
  paragraph(doc,/^До\s*:/i.test(recipientValue)?recipientValue:'До: '+recipientValue,{bold:true}),paragraph(doc,/^Адрес\s*:/i.test(addressValue)?addressValue:'Адрес: '+addressValue),
  subjectParagraph(doc,'Относно: ',subject),
  paragraph(doc,(/\b\d{1,2}\.\d{1,2}\.\d{4}\b/.test(String(m.incomingReference||''))&&!/\[ЗА ЕКСПЕРТНА ПРОВЕРКА/.test(String(m.incomingReference)))?String(m.incomingReference).replace(/^Преписка:\s*/i,'').replace(/^Вх\.\s*№\s*/i,'Вх. № '):'Вх. № ОВОС-ХХХХ / ХХ.ХХ.ХХХХ г.'),
  ...(isPending(m.salutation)?[]:[paragraph(doc,m.salutation)]),
  paragraph(doc,'I. ПРЕДМЕТ И ИМОТЕН ОБХВАТ',{heading:true}),
  paragraph(doc,'Предмет на ИП: '+subject),
  paragraph(doc,'Поземлени имоти: '+draft.parcels.map(p=>p.id+(p.location?' — '+p.location:'')+' ('+(p.role==='leading'?'предмет на ИП':'съпътстващ')+')').join('; ')),
  ...(m.location?[paragraph(doc,'Местоположение: '+m.location)]:[]),
  paragraph(doc,'II. ПРОСТРАНСТВЕН АНАЛИЗ',{heading:true}),
  paragraph(doc,draft.scenario==='Б'?'По наличните ГИС данни е установено пространствено пресичане със защитена зона: '+draft.zones.join(', ')+'.':'По наличните ГИС данни не е установено пресичане на потвърдените имоти със защитена зона.'),
  paragraph(doc,'В съответствие с принципа за пространствено онагледяване на инвестиционните предложения, отразен в приложение №3 към чл. 10, ал. 2, част Б, т. 3 от Наредбата за оценка за съвместимост, в настоящия експертен проект е включено обзорно картографско извлечение от извършения ГИС анализ.'),
  ...(mapBytes?[mapParagraph(doc)]:[]),
  ...(mapBytes?[paragraph(doc,'Фигура 1. Пространствено положение на имотите спрямо защитените зони от мрежата „Натура 2000“.',{center:true})]:[]),
  paragraph(doc,'Картографското извлечение от ГИС анализа представя пространствените резултати и имотния обхват; пълният ГИС анализ е в самостоятелен PDF.'),
  paragraph(doc,'III. ХАРАКТЕРИСТИКА НА ПРЕДЛОЖЕНИЕТО',{heading:true}),
  ...confirmed(draft.characterization).map(x=>paragraph(doc,String(x).replace(/\[ОТКЪС ОТ ПРЕПИСКАТА\s*[—-]\s*ЗА СВЕРЯВАНЕ\]/gi,'[ЗА ЕКСПЕРТНА ПРОВЕРКА — непълен откъс; необходимо е сверяване с оригиналната преписка]').replace(/^\s*[-–]\s*/,''))),

  paragraph(doc,'IV. ФАКТИЧЕСКИ И ПРАВНИ КОНСТАТАЦИИ',{heading:true}),
  paragraph(doc,'Правните основания се уточняват чрез съпоставка на документите в преписката с интегрирания нормативен архив. До потвърждаването им: ЗА ЕКСПЕРТНА ПРОВЕРКА.'),

  paragraph(doc,'V. ПРОЦЕДУРНА ПРЕЦЕНКА',{heading:true}),
  paragraph(doc,'Приложимата процедура се определя след проверка на цялата преписка и относимите правни основания. Само от пространствения резултат не може да се прави извод за наличие или липса на проведени процедури и административни актове. ЗА ЕКСПЕРТНА ПРОВЕРКА.'),
  paragraph(doc,'VI. КОНСТАТАЦИИ ЗА ВЪЗДЕЙСТВИЯТА',{heading:true}),
  ...(safeAi('IMPACTS')?aiProposal('IMPACTS'):[paragraph(doc,'От ГИС анализа е установен единствено пространственият статус на имотите спрямо защитените зони. Извод за вероятност, характер и значимост на въздействията изисква отделна експертна оценка на дейностите и доказателствата.')]),
  ...(!aiSections.IMPACTS&&impacts.some(isPending)?[paragraph(doc,'Не е изготвена окончателна оценка на въздействията. Изводите се попълват след проверка на приложимите режими и доказателствата.')]:[]),
  ...(draft.aiDraft&&!Object.keys(aiSections).length?[paragraph(doc,'AI текстът не е структуриран по раздели — изисква се проверка на формата.')]:[]),
  paragraph(doc,'VII. СЪПЪТСТВАЩИ ДОКУМЕНТИ',{heading:true}),
  paragraph(doc,'ГИС анализ (самостоятелен PDF); Нормативни и документални референции (самостоятелен PDF, когато е изготвен).'),
  paragraph(doc,'НЕОБХОДИМА Е ЕКСПЕРТНА ПРОВЕРКА НА ПРЕПИСКАТА, ПРАВНИТЕ ОСНОВАНИЯ И ИЗВОДИТЕ. Документът не представлява издаден административен акт.')
 ];
 body.replaceChildren(...blocks,paragraph(doc,''),sect.cloneNode(true));
 const serialized=new XMLSerializer().serializeToString(doc);
 const signatureParagraphs=all(doc,'p');
 if(signatureParagraphs.length<2)throw Error('КТ13: липсват двете позиции за електронен подпис в експертния документ.');
 if(mapBytes){
  const relPath='word/_rels/document.xml.rels',relsDoc=new DOMParser().parseFromString(new TextDecoder().decode(zip[relPath]),'application/xml');
  const relRoot=relsDoc.documentElement,relNS='http://schemas.openxmlformats.org/package/2006/relationships';
  const existing=Array.from(relRoot.children).find(x=>x.getAttribute('Id')==='rIdV27GISMap');
  if(existing)throw Error('Дублирана ГИС връзка в Word.');
  const relationship=relsDoc.createElementNS(relNS,'Relationship');
  for(const [k,v] of Object.entries({Id:'rIdV27GISMap',Type:'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',Target:'media/v27-gis-overview.png'}))relationship.setAttribute(k,v);
  relRoot.appendChild(relationship);
  zip[relPath]=new TextEncoder().encode(new XMLSerializer().serializeToString(relsDoc));
  const ctPath='[Content_Types].xml',ctDoc=new DOMParser().parseFromString(new TextDecoder().decode(zip[ctPath]),'application/xml');
  const ctNS='http://schemas.openxmlformats.org/package/2006/content-types';
  if(!Array.from(ctDoc.documentElement.children).some(x=>x.getAttribute('Extension')==='png')){
   const def=ctDoc.createElementNS(ctNS,'Default');def.setAttribute('Extension','png');def.setAttribute('ContentType','image/png');ctDoc.documentElement.appendChild(def);
   zip[ctPath]=new TextEncoder().encode(new XMLSerializer().serializeToString(ctDoc));
  }
  zip['word/media/v27-gis-overview.png']=new original.constructor(mapBytes);
 }
 zip['word/document.xml']=new TextEncoder().encode(serialized);
 return new Blob([root.fflate.zipSync(zip,{level:6})],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
root.V26ExpertWord=Object.freeze({make});
})(typeof window!=='undefined'?window:globalThis);
