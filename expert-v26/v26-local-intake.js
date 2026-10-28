(()=>{'use strict';
const rx=/\b\d{5}\.\d+\.\d+(?:\.\d+){0,2}\b/g;
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
async function ocrPdfPage(page,worker){
 const viewport=page.getViewport({scale:1.65});const canvas=document.createElement('canvas');
 canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
 try{await page.render({canvasContext:canvas.getContext('2d',{willReadFrequently:true}),viewport}).promise;
  const result=await worker.recognize(canvas);return String(result?.data?.text||'').trim();
 }finally{canvas.width=0;canvas.height=0}
}
async function extractText(data,name){
 if(/\.(txt|csv|json|md)$/i.test(name))return new TextDecoder('utf-8').decode(data);
 if(/\.pdf$/i.test(name)){
  if(!window.pdfjsLib)await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const doc=await window.pdfjsLib.getDocument({data:new Uint8Array(data)}).promise;
  extractText.lastOcrPages=0;extractText.lastOcrError='';
  const parts=[];let worker=null;
  try{for(let i=1;i<=Math.min(doc.numPages,100);i++){
   const page=await doc.getPage(i),content=await page.getTextContent();
   let pageText=content.items.map(x=>x.str||'').join(' ').trim();
   if(pageText.replace(/[^\p{L}\p{N}]/gu,'').length<25){
    try{if(!window.Tesseract)await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
     if(!worker)worker=await window.Tesseract.createWorker('bul+eng',1);
     const scanned=await ocrPdfPage(page,worker);
     if(scanned.replace(/[^\p{L}\p{N}]/gu,'').length>pageText.replace(/[^\p{L}\p{N}]/gu,'').length){pageText=scanned;extractText.lastOcrPages++}
    }catch(err){extractText.lastOcrError=String(err.message||err)}
   }
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
 const docs=[],all=new Set(),leading=new Set(),other=new Set(),subjects=[],documentTexts=[];
 const dossierDocuments=[];
 for(const item of list){
  let status='описан',text='';
  if(/\.(txt|csv|json|md|pdf|docx)$/i.test(item.name)&&item.size<=20*1024*1024){
   try{
    const unpacked=await readEntry(bytes,v,item);
    if(unpacked.byteLength!==item.size)throw Error('Несъответствие в ZIP размер.');
    text=await extractText(unpacked,item.name);
    status=text.trim()?'текстът е прочетен':'няма извлекаем текст (възможно сканиран документ)';if(text.trim())documentTexts.push({source:item.name,text:text.slice(0,150000)});
    for(const id of text.match(rx)||[]){const parcel=parcelId(id);all.add(parcel);other.add(parcel)}
    const isNotice=/уведомлен/i.test(item.name+' '+text.slice(0,800));
    if(isNotice&&text.trim()){
     const clean=text.replace(/\s+/g,' ').trim();
     const match=clean.match(/(?:относно|предмет(?:\s+на\s+(?:инвестиционното\s+)?предложение)?|наименование\s+на\s+(?:инвестиционното\s+)?предложение)\s*[:：–-]\s*(.{15,450}?)(?=\s+(?:възложител|местоположение|адрес|имот\s+с|приложения|описание\s+на)|$)/i);
     const rawTitle=match?match[1].trim():'';
     const title=/[\p{L}]{3,}/u.test(rawTitle)&&rawTitle.replace(/[^\p{L}\p{N}]/gu,'').length>=12?rawTitle:'';
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
    if(/уведомлен/i.test(item.name+' '+text.slice(0,800))){for(const id of text.match(/(?:позем[еe]н\s+имот|ПИ)\s+(?:с\s+)?(?:идентификатор\s+)?(\d{5}\.\d+\.\d+)/gi)||[]){const m=id.match(/\d{5}\.\d+\.\d+/);if(m)leading.add(parcelId(m[0]));}}
   }catch(err){status='неуспешно извличане: '+err.message}
  }
  // Extract only text-supported, traceable claims; never infer facts from filenames.
  const referenceMatches=[...text.matchAll(/(?:вх\.?\s*(?:№|номер)?\s*|входящ\s*(?:№|номер)\s*)([А-ЯA-Z0-9][А-ЯA-Z0-9\-\/\. ]{0,45}?)\s*(?:от\s*|\/\s*)(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{4})/giu)].slice(0,30).map(m=>({number:m[1].trim(),date:m[2],source:item.name}));
  const factualSnippets=[];
  const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const factPatterns=[
   ['water_supply',/водоснабдяване|водоизточник|сондаж|кладенец/i],
   ['wastewater',/отпадъчни води|канализац|изгребна яма|водоплът/i],
   ['electricity',/електрозахранване|електропровод|кабелно трасе/i],
   ['access',/транспортен достъп|пътен достъп|подход към имота/i],
   ['construction',/застрояване|строителство|изграждане|реконструкция/i]
  ];
  for(const line of lines){
   if(line.length<20||line.length>900)continue;
   for(const [key,re] of factPatterns)if(re.test(line)){
    factualSnippets.push({key,value:line.slice(0,700),source:item.name,kind:'source_excerpt',requires_semantic_review:true});
    break;
   }
   if(factualSnippets.length>=60)break;
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
  const dates=[...new Set(referenceMatches.map(x=>x.date))];
  const documentDate=dates.length===1?dates[0]:null;
  dossierDocuments.push({file:item.name,type:/уведомлен/i.test(item.name+' '+text.slice(0,800))?'notification':/допълнителна\s+информация|доп\.\s*информация/i.test(item.name+' '+text.slice(0,800))?'supplementary':'attachment',readable:!!text.trim(),date:documentDate,references:referenceMatches,facts:factualSnippets,claims:wastewaterClaims});
  docs.push({filename:item.name,status});
 }
 const dossierAnalysis=(window.V26DossierEvidence&&typeof window.V26DossierEvidence.analyze==='function')?
  window.V26DossierEvidence.analyze(dossierDocuments.map(d=>({file:d.file,type:d.type,date:d.date,registration:d.references[0]?.number||null,facts:d.claims||[]}))):null;
 const dossierCharacterization=(dossierAnalysis&&window.V26DossierEvidence&&typeof window.V26DossierEvidence.characterize==='function')?
  window.V26DossierEvidence.characterize(dossierAnalysis):null;
 const dossierDraft=(window.V26DossierEvidence&&typeof window.V26DossierEvidence.evidenceDraft==='function')?
  window.V26DossierEvidence.evidenceDraft(dossierDocuments,dossierAnalysis):null;
 for(const id of leading)other.delete(id);
 return {archive_name:file.name,archive_entries:list.length,files:docs,dossier_documents:dossierDocuments,dossier_analysis:dossierAnalysis,dossier_characterization:dossierCharacterization,dossier_draft:dossierDraft,evidence:[],subject_candidates:subjects,semantic_review:semanticReview(subjects,documentTexts),all_parcels:[...all],classification:{leading_candidates:[...leading],ancillary_candidates:[...other],warnings:['Локален предварителен текстов анализ. Проверете ролите ръчно.','PDF/DOCX се извличат локално, когато съдържат текст. Сканирани документи без текстов слой изискват отделно разчитане.']}};
}
window.V26LocalIntake={process};
})();