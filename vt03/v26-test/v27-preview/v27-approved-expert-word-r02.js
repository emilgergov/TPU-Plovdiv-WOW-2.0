/* V27 R02 APPROVED — browser DOCX authoring adapter.
 * Preserves the institutional DOCX shell, authentic GIS PNG and safety-reviewed
 * AI paragraphs from V26ExpertWord; changes the actual ZIP's expert Word to the
 * approved four-part administrative composition. No invented legal outcomes.
 */
(function(root){'use strict';
const engine=root.V26ExpertWord;
if(!engine?.make)throw Error('V27 R02: липсва защитеният генератор на Word.');
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const all=(node,name)=>Array.from(node.getElementsByTagNameNS(NS,name));
const str=x=>String(x??'').trim();
const textOf=node=>all(node,'t').map(n=>n.textContent).join('');
const n=(doc,t)=>doc.createElementNS(NS,'w:'+t);
const wa=(el,name,value)=>el.setAttributeNS(NS,'w:'+name,String(value));
function p(doc,text,{heading=false,title=false,subtitle=false,caption=false,bold=false}={}){
 const el=n(doc,'p'),pr=n(doc,'pPr'),jc=n(doc,'jc'),space=n(doc,'spacing'),ind=n(doc,'ind');
 wa(jc,'val',heading||title||subtitle||caption?'center':'both');
 wa(space,'before',heading?'190':title?'230':subtitle?'0':'0');
 wa(space,'after',heading?'110':title?'20':subtitle?'180':caption?'150':'105');
 wa(space,'line','240');wa(space,'lineRule','auto');
 wa(ind,'firstLine',heading||title||subtitle||caption?'0':'565');
 pr.append(jc,space,ind);
 if(heading||title)pr.appendChild(n(doc,'keepNext'));
 el.appendChild(pr);
 const run=n(doc,'r'),rp=n(doc,'rPr'),fonts=n(doc,'rFonts'),sz=n(doc,'sz');
 for(const key of ['ascii','hAnsi','cs'])wa(fonts,key,'Verdana');
 wa(sz,'val',title?'24':'20');rp.append(fonts,sz);
 if(heading||title||bold)rp.appendChild(n(doc,'b'));
 if(caption)rp.appendChild(n(doc,'i'));
 run.appendChild(rp);
 const t=n(doc,'t');t.setAttribute('xml:space','preserve');t.textContent=str(text);run.appendChild(t);el.appendChild(run);
 return el;
}
function slot(doc){
 const el=n(doc,'p'),pr=n(doc,'pPr'),spacing=n(doc,'spacing');
 wa(spacing,'after','330');pr.appendChild(spacing);el.appendChild(pr);return el;
}
function safeSection(paragraphs,start,end){
 const a=paragraphs.findIndex(x=>textOf(x).trim()===start),
       b=paragraphs.findIndex((x,i)=>i>a&&textOf(x).trim()===end);
 if(a<0||b<=a)throw Error('V27 R02: липсва проверен AI раздел: '+start);
 return paragraphs.slice(a+1,b).map(textOf).map(str).filter(Boolean);
}
function unique(xs){
 const seen=new Set();
 return xs.filter(x=>{const key=x.toLocaleLowerCase('bg').replace(/\s+/g,' ').replace(/[.!?]+$/,'').trim();
  if(seen.has(key))return false;seen.add(key);return true;});
}
async function make(draft,options={}){
 if(draft?.schema!=='KT13_EXPERT_DRAFT_V1')throw Error('V27 R02: липсва единният проверен проект.');
 if(options.requireAiAuthor!==true)throw Error('V27 R02: експертният Word се издава само с проверен AI автор.');
 const reviewed=await engine.make(draft,options);
 const zip=root.fflate.unzipSync(new Uint8Array(await reviewed.arrayBuffer()));
 const src=zip['word/document.xml'];if(!src)throw Error('V27 R02: липсва базовият DOCX.');
 const xml=new DOMParser().parseFromString(new TextDecoder().decode(src),'application/xml');
 if(xml.getElementsByTagName('parsererror').length)throw Error('V27 R02: невалиден базов Word XML.');
 const body=all(xml,'body')[0],original=Array.from(body.children).filter(x=>x.localName==='p');
 const originalSect=Array.from(body.children).find(x=>x.localName==='sectPr');
 if(!originalSect)throw Error('V27 R02: липсва институционалният футер.');
 const characterization=safeSection(original,'III. ХАРАКТЕРИСТИКА НА ПРЕДЛОЖЕНИЕТО','IV. ФАКТИЧЕСКИ И ПРАВНИ КОНСТАТАЦИИ');
 const legal=safeSection(original,'IV. ФАКТИЧЕСКИ И ПРАВНИ КОНСТАТАЦИИ','V. ПРОЦЕДУРНА ПРЕЦЕНКА');
 const procedure=safeSection(original,'V. ПРОЦЕДУРНА ПРЕЦЕНКА','VI. КОНСТАТАЦИИ ЗА ВЪЗДЕЙСТВИЯТА');
 const impacts=safeSection(original,'VI. КОНСТАТАЦИИ ЗА ВЪЗДЕЙСТВИЯТА','VII. СЪПЪТСТВАЩИ ДОКУМЕНТИ');
 if(![characterization,legal,procedure,impacts].every(x=>x.length>0))throw Error('V27 R02: AI раздел без одобрено съдържание.');
 const map=original.find(x=>all(x,'drawing').length>0);
 if(!map||!zip['word/media/v27-gis-overview.png'])throw Error('V27 R02: реалното ГИС извлечение липсва.');
 const m=draft.metadata||{},title=str(m.subject).replace(/^Относно:\s*/i,'').replace(/^(?:инвестиционно предложение\s*)+/i,'').trim();
 const parcels=draft.parcels.map(q=>q.id);
 if(!title||!parcels.length||new Set(parcels).size!==parcels.length)throw Error('V27 R02: липсва потвърден предмет или имоти.');
 const prefix=(parcels.length===1?'Поземлен имот с идентификатор ':'Поземлени имоти с идентификатори ')+parcels.join(', ')+(m.location?', '+str(m.location):'');
 const outside=draft.scenario==='А';
 if(!outside&&draft.scenario!=='Б')throw Error('V27 R02: неопределен ГИС сценарий.');
 const zoneList=Array.isArray(draft.zones)?draft.zones.map(str):[];
 if(!outside&&(!zoneList.length||zoneList.some(z=>!/^BG\d{7}$/.test(z))))
  throw Error('V27 R02: сценарий Б без проверени кодове на зони.');
 const legalSrc=(draft.legalSources||[]).filter(s=>s?.projectRevisionAccepted===true||s?.revisionVerified===true);
 const hasArt31=legalSrc.some(s=>/чл\.\s*31,\s*ал\.\s*1/i.test(s.article||''));
 const hasArt2=legalSrc.some(s=>/чл\.\s*2,\s*ал\.\s*1/i.test(s.article||'')&&/съвместимост/i.test(s.title||''));
 const parts=[
  slot(xml),
  p(xml,str(m.recipient)||'Възложителя: ХХХХ',{bold:true}),
  p(xml,str(m.address)||'Адрес: ХХХХ'),
  p(xml,'Относно: '+title+' — '+prefix,{bold:true}),
  p(xml,'ПРОЕКТ НА ЕКСПЕРТНО СТАНОВИЩЕ',{title:true}),
  p(xml,'по чл. 2, ал. 2 от Наредбата за ОС',{subtitle:true}),
  p(xml,'Във връзка с уведомлението с '+(str(m.incomingReference)||'Вх. № ОВОС-ХХХХ / ХХ.ХХ.ХХХХ г.')+' за '+title+' са разгледани потвърденият предмет и имотен обхват, предоставените документи и резултатите от пространствения анализ.'),
  p(xml,'1. ПРЕДМЕТ НА ИНВЕСТИЦИОННОТО ПРЕДЛОЖЕНИЕ И ФАКТИЧЕСКА ХАРАКТЕРИСТИКА',{heading:true}),
  p(xml,'Разгледано е инвестиционното предложение „'+title+'“ за '+prefix+'. Водещ имот: '+draft.parcels.filter(q=>q.role==='leading').map(q=>q.id).join(', ')+'. Съпътстващи имоти: '+(draft.parcels.filter(q=>q.role==='ancillary').map(q=>q.id).join(', ')||'не са посочени')+'.'),
  ...unique(characterization).map(t=>p(xml,t)),
  p(xml,'2. ПРОСТРАНСТВЕНО ПОЛОЖЕНИЕ И ОТНОСИМ НОРМАТИВЕН РЕЖИМ',{heading:true}),
  p(xml,outside
    ?'При извършения ГИС анализ е установено, че '+prefix+(parcels.length===1?' не попада':' не попадат')+' в границите на защитени зони от екологичната мрежа „Натура 2000“. Пространственият извод се отнася до потвърдените имотни геометрии.'
    :'При извършения ГИС анализ е установено пресичане '+(parcels.length===1?'на потвърдения имот':'на един или повече от потвърдените имоти')+' със защитени зони: '+zoneList.join(', ')+'. Конкретният обхват на пресичането е отразен в самостоятелния ГИС анализ.'),
  p(xml,'При преценката са отчетени установеното пространствено положение, характерът и предназначението на инвестиционното предложение, известните технически решения и възможните преки, косвени и кумулативни въздействия върху предмета и целите на опазване на защитените зони.'),
  ...(hasArt2?[p(xml,'Относима нормативна основа: чл. 2, ал. 1 от Наредбата за ОС — съобразен с вида на предложението и установеното пространствено положение.')]:[]),
  ...unique(legal).map(t=>p(xml,t)),
  p(xml,'В съответствие с принципа за пространствено онагледяване, отразен в приложение № 3 към чл. 10, ал. 2, част Б, т. 3 от Наредбата за ОС, е представено обзорно картографско извлечение от извършения ГИС анализ.'),
 ];
 // The actual GIS image generated by the original secure renderer is retained,
 // not replaced by an illustrative drawing. Preserve its image relationship.
 const mapNode=map.cloneNode(true),mapPr=all(mapNode,'pPr')[0]||n(xml,'pPr');
 if(!mapPr.parentNode)mapNode.insertBefore(mapPr,mapNode.firstChild);
 if(!all(mapPr,'keepNext').length)mapPr.appendChild(n(xml,'keepNext'));
 if(!all(mapPr,'keepLines').length)mapPr.appendChild(n(xml,'keepLines'));
 parts.push(mapNode,p(xml,'Фигура 1. Пространствено положение на имотите спрямо защитените зони от мрежата „Натура 2000“. Източник: ГИС анализ.',{caption:true}));
 parts.push(
  p(xml,'3. ПРЕЦЕНКА НА ВЕРОЯТНИТЕ ВЪЗДЕЙСТВИЯ',{heading:true}),
  ...(hasArt31?[p(xml,'Преценката е извършена във връзка с чл. 31, ал. 1 от Закона за биологичното разнообразие, като са отчетени вероятните въздействия самостоятелно и във взаимодействие с други дейности.')]:[]),
  ...unique(impacts).map(t=>p(xml,t)),
  p(xml,'4. ПРЕЦЕНКА НА КОМПЕТЕНТНИЯ ОРГАН',{heading:true}),
  ...unique(procedure).map(t=>p(xml,t))
 );
 const confirmedFinding=str(m.procedureFinding);
 const pending=/\[\s*ЗА ЕКСПЕРТНА ПРОВЕРКА|НЯМА ДАННИ|непотвърден/i.test(confirmedFinding);
 const lawConfirmed=Array.isArray(m.legalFindingSources)&&m.legalFindingSources.some(x=>str(x)&&!/НЯМА ДАННИ/i.test(String(x)));
 if(confirmedFinding&&!pending&&lawConfirmed)parts.push(p(xml,confirmedFinding,{bold:true}));
 else parts.push(p(xml,'Окончателният процедурен извод се потвърждава от компетентния орган въз основа на пълната преписка и приложимите нормативни основания.'));
 parts.push(
  p(xml,'Настоящият проект се отнася единствено до заявените параметри на инвестиционното предложение и не замества необходимите съгласувания или разрешения по други нормативни актове.'),
  slot(xml)
 );
 body.replaceChildren(...parts,originalSect.cloneNode(true));
 const serial=new XMLSerializer().serializeToString(xml);
 if(serial.includes('УВАЖАЕМИ ГОСПОЖИ И ГОСПОДА'))throw Error('V27 R02: необработено обръщение.');
 for(const x of ['1. ПРЕДМЕТ','2. ПРОСТРАНСТВЕНО','3. ПРЕЦЕНКА','4. ПРЕЦЕНКА'])
  if(!serial.includes(x))throw Error('V27 R02: липсва раздел '+x);
 zip['word/document.xml']=new TextEncoder().encode(serial);
 return new Blob([root.fflate.zipSync(zip,{level:6})],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
root.V26ExpertWord=Object.freeze({make,layout:'V27_EXPERT_R02_APPROVED'});
})(typeof window!=='undefined'?window:globalThis);
