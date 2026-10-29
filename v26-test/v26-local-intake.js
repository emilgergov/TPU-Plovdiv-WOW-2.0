(()=>{'use strict';
const rx=/\b\d{5}\s*\.\s*\d+\s*\.\s*\d+(?:\s*\.\s*\d+){0,2}\b/g;
function normalizedIds(text){return [...String(text||'').matchAll(rx)].map(m=>parcelId(m[0].replace(/\s+/g,'')))}
function parcelId(id){return String(id).split('.').slice(0,3).join('.')}
function u16(v,p){return v.getUint16(p,true)}function u32(v,p){return v.getUint32(p,true)}
function loadScript(src){return new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=src;el.onload=resolve;el.onerror=()=>reject(Error('Неуспешно зареждане на библиотека: '+src));document.head.appendChild(el)})}
async function readEntry(bytes,v,item){
 const h=item.offset;if(h+30>bytes.byteLength||u32(v,h)!==0x04034b50)throw Error('Невалиден ZIP запис.');
 const start=h+30+u16(v,h+26)+u16(v,h+28);
 if(start+item.packed>bytes.byteLength)throw Error('Повреден ZIP запис.');
 if(item.method===0)return bytes.slice(start,start+item.packed);
 if(!window.fflate?.unzlibSync)await loadScript('https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js');
 const compressed=new Uint8Array(bytes,start,item.packed);
 const result=window.fflate.inflateSync(compressed);
 return result.buffer.slice(result.byteOffset,result.byteOffset+result.byteLength);
}
function withDeadline(promise,ms,label){return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(Error(label+' — надвишено време '+Math.round(ms/1000)+' сек.')),ms))])}
function intakeProgress(message,detail){if(typeof window.V26IntakeProgress==='function')window.V26IntakeProgress(message,detail)}
async function ocrPdfPage(page,worker){
 const viewport=page.getViewport({scale:1.65});const canvas=document.createElement('canvas');
 canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
 try{await page.render({canvasContext:canvas.getContext('2d',{willReadFrequently:true}),viewport}).promise;
  const result=await withDeadline(worker.recognize(canvas),25000,'OCR на PDF страница');return String(result?.data?.text||'').trim();
 }finally{canvas.width=0;canvas.height=0}
}
async function imageOcr(data,name){
 if(!window.Tesseract)await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
 const blob=new Blob([data],{type:/\.png$/i.test(name)?'image/png':/\.webp$/i.test(name)?'image/webp':/\.tiff?$/i.test(name)?'image/tiff':/\.bmp$/i.test(name)?'image/bmp':'image/jpeg'});
 const url=URL.createObjectURL(blob);let worker=null;
 try{worker=await withDeadline(window.Tesseract.createWorker('bul+eng',1),30000,'OCR зареждане');const result=await withDeadline(worker.recognize(url),25000,'OCR на изображение');extractText.lastOcrPages=1;return String(result?.data?.text||'')}
 finally{if(worker)await withDeadline(worker.terminate(),3000,'OCR приключване').catch(()=>{});URL.revokeObjectURL(url)}
}
async function extractText(data,name,options={}){
 if(/\.(jpe?g|png|webp|bmp|tiff?)$/i.test(name))return imageOcr(data,name);
 if(/\.(txt|csv|json|md)$/i.test(name))return new TextDecoder('utf-8').decode(data);
 if(/\.pdf$/i.test(name)){
  if(!window.pdfjsLib)await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const doc=await window.pdfjsLib.getDocument({data:new Uint8Array(data)}).promise;
  extractText.lastOcrPages=0;extractText.lastOcrError='';extractText.lastPageWarnings=[];
  const parts=[];let worker=null;
  try{for(let i=1;i<=doc.numPages;i++){intakeProgress('PDF: страница '+i+' от '+doc.numPages+' · '+name,{page:i,pages:doc.numPages});
   const page=await doc.getPage(i),content=await page.getTextContent();
   // Preserve PDF.js word boundaries for notification headings. A PDF text item
   // can be a fragment inside a word; inserting a space after every item
   // breaks Bulgarian words (e.g. "Склад ове"). Keep the legacy reader for
   // all other documents to avoid changing the approved ZIP -> GIS route.
   const isNoticePdf=/уведомлен|uvedomlen|notification/i.test(name);
   const pdfItems=content.items||[];
   let pageText=isNoticePdf?pdfItems.map((item,index)=>{
    const part=String(item.str||'');
    const next=pdfItems[index+1];
    if(!next)return part;
    if(item.hasEOL)return part+'\\n';
    if(item.hasSpace||/\\s$/.test(part)||/^\\s/.test(String(next.str||'')))return part;
    const a=item.transform,b=next.transform;
    if(a&&b&&item.width!=null){
     const right=a[4]+Number(item.width),gap=b[4]-right;
     const size=Math.max(1,Math.abs(a[0])||Math.abs(a[3])||10);
     if(Math.abs(a[5]-b[5])>size*0.55)return part+'\\n';
     return part+(gap>size*0.22?' ':'');
    }
    return part+' ';
   }).join('').trim():pdfItems.map(x=>x.str||'').join(' ').trim();
   if(options.allowOcr!==false&&pageText.replace(/[^\p{L}\p{N}]/gu,'').length<25){
    try{if(!window.Tesseract)await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
     if(!worker)worker=await withDeadline(window.Tesseract.createWorker('bul+eng',1),30000,'OCR зареждане');
     const scanned=await ocrPdfPage(page,worker);
     if(scanned.replace(/[^\p{L}\p{N}]/gu,'').length>pageText.replace(/[^\p{L}\p{N}]/gu,'').length){pageText=scanned;extractText.lastOcrPages++}
    }catch(err){extractText.lastOcrError=String(err.message||err)}
   }
   if(pageText.replace(/[^\p{L}\p{N}]/gu,'').length<25)extractText.lastPageWarnings.push('стр. '+i+' — недостатъчно разчетен текст');
   parts.push(pageText);
  }}finally{if(worker)await worker.terminate()}
  return parts.join('\n');
 }
 if(/\.docx$/i.test(name)){
  if(!window.mammoth)await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js');
  return (await window.mammoth.extractRawText({arrayBuffer:data})).value||'';
 }
 return '';
}
function semanticReview(subjects,documents){
 const main=subjects.find(x=>x.title)||subjects[0]||null;
 const notices=subjects.flatMap(x=>x.sections||[]);
 const full=documents.filter(x=>x.text).map(x=>({source:x.source,text:x.text}));
 const pick=(re)=>full.filter(x=>re.test(x.text)).map(x=>x.source);
 const flags=[];
 const water=pick(/сондаж|тръбен кладенец|собствен водоизточник|подземни води|водовземане/i);
 if(water.length)flags.push({kind:'water',label:'Т. 5: възможно собствено водовземане — проверка на приложимостта на процедурите по Закона за водите и участие на БД',sources:water});
 const power=pick(/кабелно трасе|електрозахранване|електроснабдяване|присъединяване към (?:електро)?мреж/i);
 if(power.length)flags.push({kind:'power',label:'Т. 5: електрозахранване / кабелно трасе — проверете обхват и имоти',sources:power});
 const discharge=pick(/заустван|водоприемник|в дере|в река/i);
 const sealed=pick(/изгребна яма|водоплътн|без заустване/i);
 if(discharge.length)flags.push({kind:'discharge',label:'Т. 9: данни за заустване — проверка на водоприемник и приложими процедури',sources:discharge});
 if(discharge.length&&sealed.length)flags.push({kind:'conflict',label:'ПРОТИВОРЕЧИЕ по т. 9: данни за заустване и за водоплътно събиране — необходимо е експертно уточнение',sources:[...new Set([...discharge,...sealed])]});
 const locationSources=full.filter(x=>/уведомлен/i.test(x.source));
 const searchTexts=locationSources.length?locationSources:full;
 const locPieces=[],locEvidence=[];
 const patterns=[/(?:ПИ|поземлен\s+имот|имот)\s+(?:с\s+)?(?:кадастрален\s+)?идентификатор\s*[:№]?\s*\d{5}\.\d+\.\d+/ig,/(?:ПИ|поземлен\s+имот)\s*№?\s*\d{5}\.\d+\.\d+/ig,/(?:^|[\s,;(])(?:с\.|гр\.|село|град)\s*[А-Яа-яЁё-]+/g,/община\s+[А-Яа-я-]+/ig,/област\s+[А-Яа-я-]+/ig,/местност\s*[„"]?[^,.;\n]{2,55}/ig,/УПИ\s+[IVXLCDM\d-]+(?:\.\d+)?/ig];
 for(const doc of searchTexts){for(const re of patterns){re.lastIndex=0;for(const m of doc.text.matchAll(re)){const piece=m[0].trim();if(!locPieces.includes(piece)){locPieces.push(piece);locEvidence.push(doc.source)}}}}
 if(!locPieces.some(x=>/\d{5}\.\d+\.\d+/.test(x))){for(const doc of searchTexts){for(const id of [...new Set(doc.text.match(/\d{5}\.\d+\.\d+/g)||[])].slice(0,10)){const piece='ПИ с идентификатор '+id;if(!locPieces.includes(piece)){locPieces.push(piece);locEvidence.push(doc.source)}}}}
 const hasParcel=locPieces.some(x=>/\\d{5}\\.\\d+\\.\\d+/.test(x));
 const hasSettlement=locPieces.some(x=>/^(?:с\\.|гр\\.|село|град)/i.test(x));
 const hasMunicipality=locPieces.some(x=>/^община/i.test(x));
 const hasRegion=locPieces.some(x=>/^област/i.test(x));
 const missing=[!hasParcel?'кадастрален идентификатор':null,!hasSettlement?'населено място':null,!hasMunicipality?'община':null,!hasRegion?'област':null].filter(Boolean);
 const ancillary=[];
 const test=[[/сондаж|кладенец/i,'сондажен кладенец'],[/кабелно трасе/i,'подземно кабелно трасе'],[/площадка за измиване/i,'площадка за измиване'],[/водопроводна връзка/i,'водопроводна връзка']];
 for(const [re,label] of test)if(full.some(x=>re.test(x.text)))ancillary.push(label);
 const title=main?.title||'';
 const heading=title?'„'+title+'“'+(locPieces.length?' — '+locPieces.join(', '):'')+(missing.length?' [ЗА ПОТВЪРЖДЕНИЕ: '+missing.join(', ')+']':''):'';
 return {flags,location:locPieces,location_sources:[...new Set(locEvidence)],missing,ancillary,heading,needs_review:flags.some(x=>x.kind==='conflict')||missing.length>0,source:main?.source||''};
}
async function process(file){
 if(!file||file.size>40*1024*1024)throw Error('Изберете ZIP до 40 MB.');
 const bytes=await file.arrayBuffer(),v=new DataView(bytes),list=[];let e=-1;
 for(let p=bytes.byteLength-22;p>=Math.max(0,bytes.byteLength-65557);p--)if(u32(v,p)===0x06054b50){e=p;break}
 if(e<0)throw Error('Невалиден ZIP.');
 const n=u16(v,e+10);if(n>500)throw Error('Твърде много файлове.');
 let p=u32(v,e+16),total=0;
 for(let i=0;i<n;i++){
  if(p+46>bytes.byteLength||u32(v,p)!==0x02014b50)throw Error('Невалиден ZIP каталог.');
  const method=u16(v,p+10),size=u32(v,p+24),packed=u32(v,p+20),flags=u16(v,p+8),len=u16(v,p+28),extra=u16(v,p+30),comment=u16(v,p+32),offset=u32(v,p+42);
  const name=new TextDecoder('utf-8').decode(new Uint8Array(bytes,p+46,len));
  p+=46+len+extra+comment;
  if(name.endsWith('/'))continue;
  if(name.includes('..')||name.startsWith('/')||name.includes('\\'))throw Error('Небезопасен път в ZIP.');
  if(flags&1||![0,8].includes(method))throw Error('Неподдържан ZIP запис.');
  total+=size;if(total>80*1024*1024)throw Error('Твърде голям разархивиран архив.');
  list.push({name,method,size,packed,offset});
 }
 // Prioritize notifications and machine-readable files before slower scanned attachments.
 list.sort((a,b)=>{
  const rank=x=>/уведомлен|uvedomlen|notification/i.test(x.name)?0:/\.(txt|csv|json|md|docx)$/i.test(x.name)?1:/\.pdf$/i.test(x.name)?2:3;
  return rank(a)-rank(b);
 });
 const docs=[],all=new Set(),leading=new Set(),other=new Set(),subjects=[],documentTexts=[];let earlyGisSent=false;const dossierParcelEvidence=[];const startedAt=performance.now();
 const dossierDocuments=[];
 for(const item of list){
  intakeProgress('Прочит на документ '+(docs.length+1)+' от '+list.length+' · '+item.name,{document:docs.length+1,documents:list.length,page:0,pages:0});
  let status='описан',text='';const entryStartedAt=performance.now();
  if(/\.(txt|csv|json|md|pdf|docx|jpe?g|png|webp|bmp|tiff?)$/i.test(item.name)&&item.size<=20*1024*1024){
   try{
    const unpacked=await readEntry(bytes,v,item);
    if(unpacked.byteLength!==item.size)throw Error('Несъответствие в ZIP размер.');
    extractText.lastOcrPages=0;extractText.lastOcrError='';extractText.lastPageWarnings=[];text=await withDeadline(extractText(unpacked,item.name,{allowOcr:/уведомлен|uvedomlen|notification/i.test(item.name)||(!leading.size&&!all.size&&/\.pdf$/i.test(item.name))}),90000,'Прочит на документ '+item.name);
    status=text.trim()?(extractText.lastOcrPages?'OCR: '+extractText.lastOcrPages+' сканирани страници; експертна проверка':'текстът е прочетен'):(extractText.lastOcrError?'OCR неуспешен: '+extractText.lastOcrError:'няма извлекаем текст (възможно сканиран документ)');if(extractText.lastPageWarnings?.length)status+='; ПРОВЕРКА: '+extractText.lastPageWarnings.join(', ');if(/\.pdf$/i.test(item.name)&&!/уведомлен|notification/i.test(item.name)&&extractText.lastPageWarnings?.length)status+='; OCR на приложението е отложен за документален анализ';if(text.trim())documentTexts.push({source:item.name,text:text.slice(0,150000)});
    // Distinguish cadastral context: neighbours and former IDs are evidence, not project parcels.
    const contextualIds=[];
    for(const line of text.split(/\r?\n/)){
     const ids=normalizedIds(line);
     if(!ids.length)continue;
     const role=/предишен идентификатор|стар идентификатор|предходен идентификатор/i.test(line)?'former':
      /съседи\s*:|съседн(?:и|ия|ият|ите)?\s+(?:поземни\s+)?имот|граничи\s+с|граници\s+на\s+имота/i.test(line)?'neighbour':'mentioned';
     for(const id of ids)contextualIds.push({id,role,source:item.name,excerpt:line.trim().slice(0,300)});
    }
    for(const id of normalizedIds(text)){const parcel=id;all.add(parcel);other.add(parcel)}
    dossierParcelEvidence.push(...contextualIds);
    // The filled notification's introductory statement is authoritative for the proposed site.
    // Latin filenames such as Uvedomlenie_OVOS must also be recognized as notifications.
    const noticeFile=/уведомлен|uvedomlen|notification/i.test(item.name);
    const cleanNoticeText=text.replace(/\s+/g,' ').trim();
    const noticeMatch=cleanNoticeText.match(/Уведомяваме\s+Ви,?\s+че\s+.{0,200}?\s+има\s+следното\s+инвестиционно\s+предложение\s*:\s*([\s\S]{20,650}?)(?=\s+(?:I\.|І\.|1\.|Характеристика\s+на\s+инвестиционното\s+предложение)|$)/i);
    const introductory=noticeMatch||cleanNoticeText.match(/(?:Уведомяваме\s+Ви,?\s+че|следното\s+инвестиционно\s+предложение\s*:)\s*(.{0,650}?)(?=Характеристика\s+на\s+инвестиционното\s+предложение|1\.\s*Резюме|$)/i);
    const directNoticeIds=introductory?[...introductory[1].matchAll(/(?:ПИ\s+с\s+(?:ИД|идентификатор)|поземлен\s+имот\s+с\s+идентификатор)\s*[:№]?\s*(\d{5}\.\d+\.\d+)/gi)].map(x=>x[1]):[];
    if(noticeFile&&directNoticeIds.length===1)leading.add(directNoticeIds[0]);
    const isNotice=/уведомлен|uvedomlen/i.test(item.name+' '+text.slice(0,800))||(/инвестиционно\s+предложение|предмет\s+на\s+ИП/i.test(text.slice(0,3000))&&/(?:^|[^\p{L}])(?:ПИ|поземлен\s+имот)(?!\p{L})/iu.test(text));
    if(isNotice&&text.trim()){
     const clean=text.replace(/\s+/g,' ').trim();
     const match=clean.match(/(?:относно|предмет(?:\s+на\s+(?:инвестиционното\s+)?предложение)?|наименование\s+на\s+(?:инвестиционното\s+)?предложение)\s*[:：–-]\s*(.{15,450}?)(?=\s+(?:възложител|местоположение|адрес|имот\s+с|приложения|описание\s+на)|$)/i);
     const directTitle=noticeFile&&introductory?introductory[1].replace(/^.*?следното\s+инвестиционно\s+предложение\s*:\s*/i,'').trim():'';
     const rawTitle=directTitle|| (match?match[1].trim():'');
     // Recover a descriptive project heading from the populated summary when the
     // document uses a nonstandard subject label. Never treat parcel IDs as a title.
     const summaryHeading=clean.match(/(?:резюме\s+на\s+(?:инвестиционното\s+)?предложение|описание\s+на\s+(?:инвестиционното\s+)?предложение)\s*[:：–-]?\s*(.{20,240}?)(?=\s+(?:[2-9]\.\s|местоположение|възложител|приложения)|$)/i);
     const activityHeading=clean.match(/(?:предвижда\s+се|предлага\s+се|инвестиционното\s+предложение\s+(?:предвижда|включва))\s+(.{20,190}?)(?=[.;]|$)/i);
     const fallbackHeading=summaryHeading?.[1]||activityHeading?.[1]||'';
     const candidateTitle=(rawTitle||fallbackHeading).replace(/^[\s„“\"'«»—–\-:;,]+|[\s„“\"'«»—–\-:;,]+$/g,'').trim();
     const title=/[\p{L}]{3,}/u.test(candidateTitle)&&candidateTitle.replace(/[^\p{L}\p{N}]/gu,'').length>=12&&!/^(?:ПИ|поземлен\s+имот)\s+(?:с\s+)?идентификатор(?:\s|$)/i.test(candidateTitle)?candidateTitle:'';
     const sections=[
      ['summary',/1\.\s*Резюме на предложението\s*:/i],
      ['processes',/2\.\s*Описание на основните процеси/i],
      ['related',/3\.\s*Връзка с други съществуващи/i],
      ['location',/4\.\s*Местоположение\s*:/i],
      ['resources',/5\.\s*Природни ресурси/i],
      ['substances',/6\.\s*Очаквани вещества/i],
      ['air',/7\.\s*Очаквани общи емисии/i],
      ['waste',/8\.\s*Отпадъци/i],
      ['wastewater',/9\.\s*Отпадъчни води/i],
      ['chemicals',/10\.\s*Опасни химични вещества/i]
     ];
     const foundSections=[];
     for(let k=0;k<sections.length;k++){
      const [key,re]=sections[k],m=re.exec(text);if(!m)continue;
      const following=sections.slice(k+1).map(x=>x[1].exec(text)).filter(Boolean).map(x=>x.index).filter(x=>x>m.index);
      const end=following.length?Math.min(...following):text.length;
      const excerpt=text.slice(m.index+m[0].length,Math.min(end,m.index+2400)).replace(/\s+/g,' ').trim();
      if(excerpt&&excerpt.length>12)foundSections.push({key,text:excerpt.slice(0,1000),source:item.name,review_required:true});
     }
     const activities=[];
     // Въвеждаме само откъси от попълнен текст; указанията на празния образец не са дейности.
     const candidates=foundSections.filter(x=>['summary','processes'].includes(x.key));
     for(const section of candidates){
      const chunks=section.text.split(/(?<=[.!?;])\s+/).map(x=>x.trim());
      for(const chunk of chunks){
       if(chunk.length<22||chunk.length>350||/[.…]{3,}|_{3,}/.test(chunk))continue;
       if(/^(посочва се|в т\.ч\.|описание на|характеристика на|съгласно приложение|предвидени изкопни работи)/i.test(chunk))continue;
       if(/(?:ще се (?:изгражда|извършва|ползва|реализира)|предвижда се|изграждане на|реконструкция на|експлоатация на|разширение на|промяна на|монтаж на)/i.test(chunk)&&!activities.includes(chunk))activities.push(chunk);
       if(activities.length>=12)break;
      }
     }

     subjects.push({title,source:item.name,evidence:title?'Автоматично извлечен откъс от текст':'Текст е прочетен; заглавието не е надеждно установено',activities,sections:foundSections});
    }
    if(isNotice){for(const entry of contextualIds){if(entry.role!=='mentioned')continue;const line=entry.excerpt;const idsOnLine=[...new Set(normalizedIds(line))];const siteContext=/(?:местоположение|площадка|предмет\s+на\s+(?:инвестиционното\s+)?предложение|предвижда\s+се\s+в\s+(?:поземлен\s+)?имот)/i.test(line);const negative=/(?:съсед|граничи|предишен|стар\s+идентификатор|прилежащи\s+имоти)/i.test(line);if(siteContext&&!negative&&idsOnLine.length===1)leading.add(entry.id)}}
   }catch(err){status='неуспешно извличане: '+err.message}
  }
  // Extract only text-supported, traceable claims; never infer facts from filenames.
  const referenceMatches=[...text.matchAll(/(?:вх\.?\s*(?:№|номер)?\s*|входящ\s*(?:№|номер)\s*)([А-ЯA-Z0-9][А-ЯA-Z0-9\-\/\. ]{0,45}?)\s*(?:от\s*|\/\s*)(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{4})/giu)].slice(0,30).map(m=>({number:m[1].trim(),date:m[2],source:item.name}));
  const factualSnippets=[];
  const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const factPatterns=[
   ['water_supply',/водоснабдяване|водоизточник|сондаж|кладенец|водопровод|питейна вода|поливн[а-я]* вод[а-я]*|хидромелиоративн/i],
   ['wastewater',/отпадъчни води|канализац|изгребна яма|водоплът|заустван|санитарно.битов|пречиствателн/i],
   ['electricity',/електрозахранване|електроснабдяване|електропровод|кабелно трасе|електрическа енергия|електрическата мрежа/i],
   ['access',/транспортен достъп|пътен достъп|подход към имота/i],
   ['construction',/застрояване|строителство|изграждане|реконструкция|монтаж|монтиране|оранжери|съоръжени|производствена дейност/i]
  ];
  // Keep headings and blank form guidance out of Word evidence.
  // Multiple themes may be present in the same source sentence.
  const instructionOnly=/^(?:посочете|опишете|представете|да се посочи|информация за|данни за|описание на|включително|например|при необходимост|съгласно изискванията|попълва се)\b/i;
  const seenFacts=new Set();
  // A notice's printed questions often contain topic keywords but no answer.
  // Keep only a candidate excerpt with a substantive proposal assertion.
  const assertion=/(?:предвижда\s+се|не\s+се\s+предвижда|ще\s+се|ще\s+бъде|ще\s+има|няма\s+да|не\s+са\s+предвидени|изгражда\s+се|ще\s+използва|осъществява\s+се|осигурява\s+се|отвежда\s+се|зауства\s+се|съществуващ[а-я]*|новопроектир[а-я]*|водоплътн[а-я]*\s+ям[а-я]*|мощност\s*(?:до\s*)?\d|\d+\s*(?:kw|квт|kva|ква))/i;

  for(const line of lines){
   if(line.length<20||line.length>900||instructionOnly.test(line)||!assertion.test(line))continue;
   const matches=factPatterns.filter(([,re])=>re.test(line)).map(([key])=>key);
   if(!matches.length)continue;
   for(const key of matches){
    const fingerprint=key+'|'+line.toLocaleLowerCase('bg');
    if(seenFacts.has(fingerprint))continue;
    seenFacts.add(fingerprint);
    factualSnippets.push({key,value:line.slice(0,700),source:item.name,kind:'source_excerpt',requires_semantic_review:true});
    if(factualSnippets.length>=80)break;
   }
   if(factualSnippets.length>=80)break;
  }
  const wastewaterClaims=[];
  for(const fact of factualSnippets){
   if(fact.key!=='wastewater')continue;
   const sentence=fact.value;
   const sewer=/канализац/i.test(sentence),tank=/изгребна яма|водоплът.{0,30}(яма|резервоар)/i.test(sentence);
   if(sewer===tank||/не се предвижда|няма да се|отпада/i.test(sentence))continue;
   if(!/предвижда|ще се|отвежда|зауства|изгражда|включва|свързва/i.test(sentence))continue;
   wastewaterClaims.push({key:'wastewater_solution',scope:'proposal',value:sewer?'sewer':'tank',reference:sentence,source:item.name});
  }
  // Same substantive claim in DOC and PDF is one claim, not two
  // independent corroborations. Keep both filenames in the inventory.
  const duplicateEvidence=new Set(dossierDocuments.flatMap(d=>(d.facts||[]).map(f=>f.key+'|'+String(f.value||'').replace(/\s+/g,' ').trim().toLocaleLowerCase('bg'))));
  for(let i=factualSnippets.length-1;i>=0;i--){
   const fact=factualSnippets[i],fingerprint=fact.key+'|'+String(fact.value||'').replace(/\s+/g,' ').trim().toLocaleLowerCase('bg');
   if(duplicateEvidence.has(fingerprint))factualSnippets.splice(i,1);
  }
  const dates=[...new Set(referenceMatches.map(x=>x.date))];
  const documentDate=dates.length===1?dates[0]:null;
  dossierDocuments.push({file:item.name,type:/уведомлен/i.test(item.name+' '+text.slice(0,800))?'notification':/допълнителна\s+информация|доп\.\s*информация/i.test(item.name+' '+text.slice(0,800))?'supplementary':'attachment',readable:!!text.trim(),date:documentDate,references:referenceMatches,facts:factualSnippets,claims:wastewaterClaims});
  docs.push({filename:item.name,status,elapsed_ms:Math.round(performance.now()-entryStartedAt)});
  // Start GIS as soon as a readable notification establishes proposal parcels.
  // Other attachments remain available for the later documentary pass.
  if(!earlyGisSent && /уведомлен/i.test(item.name+' '+text.slice(0,800)) && text.trim() &&
     !/OCR неуспешен|ПРОВЕРКА:|неуспешно извличане/i.test(status) && leading.size &&
     typeof window.V26EarlyGisReady==='function'){
    const candidates=[...leading].filter(id=>!dossierParcelEvidence.some(e=>e.id===id&&(e.role==='neighbour'||e.role==='former')));
    if(candidates.length){
      earlyGisSent=true;
      try{window.V26EarlyGisReady({ids:candidates,source:item.name,subject:subjects[subjects.length-1]||null})}
      catch(e){console.warn('V26 early GIS notification:',e)}
    }
  }
 }
 const dossierAnalysis=(window.V26DossierEvidence&&typeof window.V26DossierEvidence.analyze==='function')?
  window.V26DossierEvidence.analyze(dossierDocuments.map(d=>({file:d.file,type:d.type,date:d.date,registration:d.references[0]?.number||null,facts:d.claims||[]}))):null;
 const dossierCharacterization=(dossierAnalysis&&window.V26DossierEvidence&&typeof window.V26DossierEvidence.characterize==='function')?
  window.V26DossierEvidence.characterize(dossierAnalysis):null;
 const dossierDraft=(window.V26DossierEvidence&&typeof window.V26DossierEvidence.evidenceDraft==='function')?
  window.V26DossierEvidence.evidenceDraft(dossierDocuments,dossierAnalysis):null;
 // Equal-strength candidates in proposal description and location are all leading.
 // A neighbour or former cadastral number alone never becomes a leading parcel.
 const proposalCandidates=new Set();
 for(const subject of subjects){
  for(const section of subject.sections||[]){
   if(!['summary','location'].includes(section.key))continue;
   const lines=section.text.split(/(?<=[.!?;])\s+|\n+/);
   for(const line of lines){
    if(/(?:предишен|стар|предходен)\s+идентификатор|съседи\s*:/i.test(line))continue;
    for(const match of line.matchAll(rx))proposalCandidates.add(parcelId(match[0]));
   }
  }
 }
 // Exclude neighbours/former IDs only if no independent proposal evidence exists.
 const nonLeading=new Set(dossierParcelEvidence.filter(x=>x.role==='neighbour'||x.role==='former').map(x=>x.id));
 for(const id of proposalCandidates){const explicit=dossierParcelEvidence.some(e=>e.id===id&&e.role==='mentioned'&&/(?:предмет|инвестиционно предложение|предвижда се|ще се изгради|местоположение)/i.test(e.excerpt));if(!nonLeading.has(id)||explicit)leading.add(id);}
 for(const id of [...leading])if(nonLeading.has(id)){const explicit=dossierParcelEvidence.some(e=>e.id===id&&e.role==='mentioned'&&/(?:предмет|инвестиционно предложение|предвижда се|ще се изгради|местоположение)/i.test(e.excerpt));if(!explicit)leading.delete(id);}
 for(const id of leading)other.delete(id);
 return {archive_name:file.name,archive_entries:list.length,elapsed_ms:Math.round(performance.now()-startedAt),files:docs,dossier_documents:dossierDocuments,dossier_analysis:dossierAnalysis,dossier_characterization:dossierCharacterization,dossier_draft:dossierDraft,evidence:dossierParcelEvidence,subject_candidates:subjects,semantic_review:semanticReview(subjects,documentTexts),all_parcels:[...all],classification:{leading_candidates:[...leading],ancillary_candidates:[],mentioned_candidates:[...other],warnings:['Кандидатите за предмет на ИП са предварителни и изискват експертно потвърждение.','Другите срещнати идентификатори НЕ са автоматично съпътстващи имоти.','PDF и изображения се разчитат с OCR при необходимост; проверете качеството и пълнотата на извличането.']}};
}
window.V26LocalIntake={process};
})();