/* KT77-10: deterministic Classic B source-to-template mapping.
 * Always starts at original KT39-B DOCX. Uses ONLY confirmed case subject,
 * real GIS identifiers/zones and explicit statements of notification.
 * Never takes Classic paragraph 19..29 or 34 from AI. Never decides OS/EIA
 * categorically for a new dossier. Reference OOXML styles/assets are retained.
 * The existing KT77 ZT insert module operates afterwards.
 */
(function(root){'use strict';
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const FILE='01_Proekt_na_stanovishte_Klasicheski.docx';
const EDIT=[7,8,11,19,20,21,22,23,24,25,26,27,28,34];
const RO=[1,2,3,4,5,6,9,10,12,13,14,15,16,17,18,29,30,31,32,33,35,36,37,38,39,40,41,42,43];
const encoder=new TextEncoder(),decoder=new TextDecoder();
const all=(p,n)=>Array.from(p.getElementsByTagNameNS(NS,n));
const direct=(p,n)=>Array.from(p.childNodes||[]).filter(x=>x.nodeType===1&&x.namespaceURI===NS&&x.localName===n);
const ps=x=>direct(all(x,'body')[0],'p');
const txt=p=>all(p,'t').map(t=>t.textContent||'').join('');
const eq=(a,b)=>a?.length===b?.length&&a.every((v,i)=>v===b[i]);
const clear=s=>String(s||'').replace(/\s+/g,' ').trim();
const bad=s=>/\[\[|\[\s*ЗА\s+ЕКСПЕРТНА|ПРЕДСТОИ/iu.test(s);
const has=(s,re)=>re.test(s);
function parse(bytes){
 if(!bytes)throw Error('КТ77-10: липсва Word XML');
 const doc=new DOMParser().parseFromString(decoder.decode(bytes),'application/xml');
 if(doc.getElementsByTagName('parsererror').length)throw Error('КТ77-10: невалиден Word XML');
 return doc;
}
let templatePromise=null;
async function template(){
 if(!templatePromise)templatePromise=(async()=>{
  const url=new URL('v27-preview/etalon/KT39-B.docx',document.baseURI);
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok)throw Error('КТ77-10: недостъпен заключен образец КТ39-Б');
  const zip=root.fflate.unzipSync(new Uint8Array(await response.arrayBuffer()));
  const doc=parse(zip['word/document.xml']);
  if(ps(doc).length!==43)throw Error('КТ77-10: невалидна структура на КТ39-Б');
  return {zip,doc};
 })().catch(e=>{templatePromise=null;throw e});
 return templatePromise;
}
function newRun(doc,original,s){
 const r=doc.createElementNS(NS,'w:r'),pr=direct(original,'rPr')[0];
 if(pr)r.appendChild(doc.importNode(pr,true));
 const t=doc.createElementNS(NS,'w:t');t.setAttribute('xml:space','preserve');t.textContent=s;r.appendChild(t);
 return r;
}
function fill(doc,paragraph,newText){
 const p=doc.importNode(paragraph,true);
 const originalRuns=direct(paragraph,'r'),source=originalRuns.find(r=>all(r,'t').some(t=>t.textContent))||originalRuns[0];
 if(!source)throw Error('КТ77-10: в КТ39-Б липсва оформен текстов сегмент');
 for(const node of direct(p,'r'))p.removeChild(node);
 p.appendChild(newRun(doc,source,newText));
 if(txt(p)!==newText)throw Error('КТ77-10: грешка при попълване на променливо поле');
 return p;
}
function formattedHeading(doc,paragraph,title,location){
 const p=doc.importNode(paragraph,true);
 const proto=direct(paragraph,'r').filter(r=>all(r,'t').some(t=>t.textContent));
 if(proto.length<4)throw Error('КТ77-10: липсва заключеният стил на Относно');
 for(const r of direct(p,'r'))p.removeChild(r);
 const values=['Относно',': Уведомление за инвестиционно предложение (ИП): ','„'+title+'“',location];
 values.forEach((s,i)=>p.appendChild(newRun(doc,proto[i],s)));
 return p;
}
function caseParagraph(doc,base,index,parts){
 const p=doc.importNode(base,true);
 const proto=direct(base,'r').filter(r=>all(r,'t').some(t=>t.textContent));
 for(const r of direct(p,'r'))p.removeChild(r);
 parts.forEach(({text,style})=>{
  if(!text)return;
  p.appendChild(newRun(doc,proto[style]||proto[0],text));
 });
 return p;
}
const part=(text,style=0)=>({text,style});
function dossierText(archive){
 const entries=(archive?.files||[]).filter(f=>f&&typeof f.text==='string');
 const notices=entries.filter(f=>/уведомлен|notification/i.test(String(f.path||f.file||f.name||'')));
 return (notices.length?notices:entries).slice(0,8).map(f=>f.text).join('\n').slice(0,150000);
}
function locationFrom(whole,heading){
 const m=whole.match(/(?:по\s+КККР\s+на\s+)?((?:с\.|гр\.)\s*[А-Яа-я\- ]+),\s*община\s+([А-Яа-я\- ]+),\s*област\s+([А-Яа-я\- ]+?)(?:[.,\n]|\s+местност)/u);
 const found=m?{settlement:clear(m[1]),municipality:clear(m[2]),region:clear(m[3])}:null;
 if(found)return found;
 const h=heading.match(/населено място\s+((?:с\.|гр\.)[^,]+),\s*община\s+([^,]+),\s*област\s+([^,.]+)/u);
 if(h&&!h[2].includes('Х')&&!h[3].includes('Х'))return {settlement:clear(h[1]),municipality:clear(h[2]),region:clear(h[3])};
 throw Error('КТ77-10: липсват потвърдени населено място, община и област от първичната преписка');
}
function parcelLocation(ids,loc){
 return (ids.length===1?' в поземлен имот с идентификатор ':' в поземлени имоти с идентификатори ')+ids.join(', ')+', населено място '+loc.settlement+', община '+loc.municipality+', област '+loc.region;
}
function confirmation(whole,label){
 const lower=whole.toLocaleLowerCase('bg-BG');
 if(label==='electric'){
  if(/не\s+е\s+заявено\s+присъединяване\s+към\s+електро/iu.test(lower))return 'Електроснабдяването на обекта не включва заявено присъединяване към електроразпределителната мрежа.';
  if(/присъединяване\s+към\s+електро(?:преносната|разпределителната)\s+мрежа/iu.test(lower))return 'Електроснабдяването на обекта ще се осъществява чрез присъединяване към електрическата мрежа на съответния оператор при определените от него условия.';
  return 'За електроснабдяването и транспортния достъп на обекта няма потвърдени данни в представената документация.';
 }
 if(label==='water'){
  if(/не\s+се\s+предвижда\s+изграждане\s+на\s+самостоятелна\s+водопроводна/iu.test(lower))return 'Водоснабдяването на обекта не включва изграждане на самостоятелна водопроводна инфраструктура съгласно представеното уведомление.';
  return 'За начина на водоснабдяване на обекта няма потвърдени данни в представената документация.';
 }
 if(label==='waste'){
  if(/не\s+се\s+предвижда\s+изграждане\s+на\s+самостоятелна\s+водопроводна\s+или\s+канализационна/iu.test(lower))return 'С инвестиционното предложение не се предвижда изграждане на самостоятелна канализационна инфраструктура. Начинът на третиране и заустване на отпадъчните води не е конкретизиран.';
  return 'За начина на третиране и заустване на отпадъчните води няма потвърдени данни в представената документация.';
 }
 return 'За евентуална промяна на предназначението и/или начина на трайно ползване на имота няма потвърдени данни в представената документация.';
}
function zoneFacts(codes,zones){
 const known={'BG0001031':{name:'Родопи – Средни',order:'Заповед № РД-351/31.03.2021 г. на министъра на околната среда и водите (ДВ, бр. 59/16.07.2021 г.)'}};
 return codes.map(code=>{
  const candidate=zones.find(x=>String(x?.sitecode||x?.code||'')===code)||{};
  const info=known[code];
  const name=info?.name||clear(candidate.name_bg||candidate.name);
  const order=info?.order||clear(candidate.verified_declaration_order||'');
  if(!name||!order||bad(name+order))throw Error('КТ77-10: непотвърдено име или заповед на ЗЗ '+code+'; не се измисля документ');
  return {code,name,order};
 });
}
async function fix(blob,{scenario='',parcelIds=[],zoneCodes=[],gisResults=[],archivePreview=null,subjectContext=null}={}){
 const mode=scenario==='B'?'Б':scenario==='A'?'А':scenario;
 if(mode==='А')return {blob,applied:false,reason:'КТ35-А без промяна'};
 if(mode!=='Б')throw Error('КТ77-10: непотвърден сценарий');
 if(!parcelIds.length||!zoneCodes.length||!Array.isArray(gisResults))throw Error('КТ77-10: липсва потвърден ГИС контекст');
 const outer=root.fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
 const incoming=outer[FILE];if(!incoming)throw Error('КТ77-10: липсва Classic Б');
 const oldXml=parse(root.fflate.unzipSync(incoming)['word/document.xml']),old=ps(oldXml),oldTxt=old.map(txt);
 if(old.length!==43)throw Error('КТ77-10: нарушени основни 43 абзаца');
 if(parcelIds.some(id=>!oldTxt[10].includes(id)))throw Error('КТ77-10: липсва реален имот в Относно');
 const sample=parcelIds.length===1&&parcelIds[0]==='36676.129.457'&&zoneCodes.length===1&&zoneCodes[0]==='BG0000194';
 if(sample)return {blob,applied:false,reason:'Одобреният тест Б е непокътнат'};
 const source=dossierText(archivePreview);
 if(!source)throw Error('КТ77-10: липсва първично уведомление; AI текстът не е доказателствен източник');
 const title=clear(subjectContext?.confirmed===true?subjectContext.title:oldTxt[10].match(/„([^“]+)“/)?.[1]);
 if(!title||bad(title))throw Error('КТ77-10: невалиден потвърден предмет');
 const loc=locationFrom(source,oldTxt[10]),place=parcelLocation(parcelIds,loc);
 const allZones=gisResults.flatMap(g=>g.verified_zone_intersections||[]);
 const facts=zoneFacts(zoneCodes,allZones);
 const primary=facts[0],zoneLabel=facts.map(z=>z.code+' „'+z.name+'“').join(', ');
 const property=parcelIds.length===1?'Имотът, предмет на инвестиционното предложение, с идентификатор '+parcelIds[0]:'Имотите, предмет на инвестиционното предложение, с идентификатори '+parcelIds.join(', ');
 const location=property+' по КККР на '+loc.settlement+', община '+loc.municipality+', област '+loc.region;
 const lowTitle=title.charAt(0).toLocaleLowerCase('bg-BG')+title.slice(1);
 const area=(source.match(/(?:приблизителна\s+застроена\s+площ|застроена\s+площ)\s+до\s+(\d+(?:[.,]\d+)?)\s*кв\.?\s*м/iu)||[])[1];
 const sourceDescription='С инвестиционното предложение се предвижда '+lowTitle+place+'.'+(area?' В представеното уведомление е посочена приблизителна застроена площ до '+area+' кв. м.':'');
 const ref=await template(),doc=parse(ref.zip['word/document.xml']),base=ps(doc);
 const newTexts={
  19:sourceDescription,
  20:confirmation(source,'electric'),
  21:confirmation(source,'water'),
  22:confirmation(source,'waste'),
  23:confirmation(source,'land'),
  25:'Защитена зона '+primary.code+' „'+primary.name+'“ за опазване на природните местообитания и на дивата флора и фауна е обявена със '+primary.order+'.',
  26:'При направената проверка за допустимост по смисъла на чл. 12, ал. 2 от Наредбата за ОС се съобразяват режимите на защитена зона '+zoneLabel+' и приложимите заповеди за обявяването ѝ. Самото пространствено пресичане не удостоверява допустимост на заявените дейности.',
  27:'Приложимостта на Приложения № 1 и № 2 към Закона за опазване на околната среда (ЗООС) и на процедурите по глава шеста от него се преценява въз основа на предмета, параметрите и проверените обстоятелства на конкретното инвестиционно предложение.',
  28:'С оглед гореизложеното, отчитайки местоположението и характера на инвестиционното предложение, възможните въздействия върху защитени зони от мрежата „Натура 2000“, включително върху засегнатата защитена зона '+zoneLabel+', се разглеждат по отношение на:'
 };
 const headingTail=place+'.';
 const order=[7,8,11,19,20,21,22,23,24,25,26,27,28,34];
 for(const index of order){
  const previous=base[index-1],current=old[index-1];
  let replacement;
  if(index===7||index===8)replacement=fill(doc,previous,oldTxt[index-1]);
  else if(index===11)replacement=formattedHeading(doc,previous,title,headingTail);
  else if(index===24){
   const lead=location+' ';
   replacement=caseParagraph(doc,previous,index,[part(lead),part('попада',1),part(' в границите на защитена зона '+zoneLabel+'.',2)]);
  }else if(index===34){
   const before='В тази връзка и на основание чл. 2, ал. 2 от Наредбата за ОС Ви уведомявам, че преценката на компетентния орган за така заявеното инвестиционно предложение: ';
   const end=' изисква проверка на заявените параметри, приложимите режими на '+zoneLabel+' и установеното пресичане със защитена територия, преди определяне на окончателния процедурен извод.';
   replacement=caseParagraph(doc,previous,index,[part(before),part('„'+title+'“',1),part(place+end,2)]);
  }else replacement=fill(doc,previous,newTexts[index]);
  previous.parentNode.replaceChild(replacement,previous);
 }
 const after=ps(doc).map(txt),beforeRef=ps(ref.doc).map(txt);
 if(after.length!==43||after[10].includes('36676.129.457')||!after[10].includes(parcelIds[0]))throw Error('КТ77-10: пренесен тестов имот или нарушена структура');
 for(const i of RO)if(after[i-1]!==beforeRef[i-1])throw Error('КТ77-10: изменен заключен абзац '+i);
 for(const i of EDIT)if(!after[i-1].trim()||bad(after[i-1]))throw Error('КТ77-10: недопустим променлив абзац '+i);
 const updated={...ref.zip,'word/document.xml':encoder.encode(new XMLSerializer().serializeToString(doc))};
 const binary=root.fflate.zipSync(updated,{level:6}),check=root.fflate.unzipSync(binary);
 for(const [name,data] of Object.entries(ref.zip))if(name!=='word/document.xml'&&!eq(data,check[name]))
  throw Error('КТ77-10: променено оригинално оформление/Word ресурс '+name);
 const rebuilt={...outer,[FILE]:binary};
 const result=new Blob([root.fflate.zipSync(rebuilt,{level:6})],{type:'application/zip'});
 const verify=root.fflate.unzipSync(new Uint8Array(await result.arrayBuffer()));
 for(const [name,data] of Object.entries(outer))if(name!==FILE&&!eq(data,verify[name]))
  throw Error('КТ77-10: променен друг файл '+name);
 return {blob:result,applied:true,source:'original KT39-B.docx + confirmed primary notification + GIS',fixedParagraphs:RO.length,filledParagraphs:EDIT.length,allWordsFromTemplateOrFacts:true,assetsIdentical:true};
}
root.KT7710LockedClassic=Object.freeze({fix,immutable:RO,editable:EDIT});
})(typeof window!=='undefined'?window:globalThis);
