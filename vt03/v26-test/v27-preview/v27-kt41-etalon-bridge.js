/* KT41: render directly inside the three user-approved DOCX packages.
 * KT35-A / KT39-B / V27-R02. Do not rebuild Word body or styles.
 * Only case-dependent text is populated; never copy example-case decisions.
 */
(function(root){'use strict';
const classicBase=root.V26TemplateWord,expertBase=root.V26ExpertWord;
if(!classicBase?.make||!expertBase?.make)throw Error('KT41: липсва базов Word модул.');
async function ensureZip(){
 if(root.fflate?.unzipSync&&root.fflate?.zipSync)return;
 await new Promise((resolve,reject)=>{const el=document.createElement('script');el.src='https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js';el.onload=resolve;el.onerror=()=>reject(Error('КТ41: ZIP библиотеката не може да се зареди.'));document.head.appendChild(el)});
 if(!root.fflate?.unzipSync||!root.fflate?.zipSync)throw Error('КТ41: ZIP библиотеката не е достъпна.');
}
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const T={A:'v27-preview/etalon/KT35-A.docx',B:'v27-preview/etalon/KT39-B.docx',E:'v27-preview/etalon/V27-R02.docx'};
const clean=x=>String(x??'').replace(/\[\[(?:CHARACTERIZATION|LEGAL|PROCEDURE|IMPACTS|CONCLUSION)\]\]/g,'').trim();
const safe=(x,where)=>{let s=clean(x);return s&&!/\[\[|\]\]/.test(s)?s:'[ЗА ЕКСПЕРТНА ПРОВЕРКА — '+where+']';};
const subject=x=>{
 let s=clean(x).replace(/^Относно:\s*/i,'').replace(/^(?:уведомление\s+за\s+)?инвестиционно\s+предложение\s*(?:\(ИП\))?\s*[:–-]?\s*/i,'').replace(/\s+/g,' ').trim();
 const quoted=s.match(/^[„"«]([^“"»]{8,})[“"»]/);
 if(quoted)s=quoted[1];
 else s=s.replace(/\s+в\s+(?:ПИ|поземлен(?:и|\s+имот(?:и)?)?)\s+(?:с\s+)?(?:идентификатор(?:и)?|ИД)\s*[:№]?\s*\d{5}\.\d+\.\d+.*$/i,'');
 return s.replace(/^[„“"«»\s]+|[„“"«»\s]+$/g,'').trim();
};
const reviewMarker=label=>'[ЗА ЕКСПЕРТНА ПРОВЕРКА — '+label+']';
function party(x,type){
 // KT46 presentation: preserve the administrative labels of KT35-A and KT39-B.
 // Missing fields use the approved visible X-placeholder, never fabricated identities or long diagnostics.
 const s=clean(x);
 if(type==='recipient'){
  const generic=!s||/^(?:ДО\s+)?ВЪЗЛОЖИТЕЛЯ\s+НА\s+ИНВЕСТИЦИОННОТО\s+ПРЕДЛОЖЕНИЕ/i.test(s)||/\[ЗА (?:ПОПЪЛВАНЕ|ЕКСПЕРТНА ПРОВЕРКА)/i.test(s);
  const value=generic?'ХХХХХХХХХХХХ':s.replace(/^(?:Възложител(?:я)?\s*:|ДО\s+)/i,'').trim();
  return 'Възложителя: '+value;
 }
 const generic=!s||/\[ЗА (?:ПОПЪЛВАНЕ|ЕКСПЕРТНА ПРОВЕРКА)/i.test(s)||/НЕ\s+Е\s+ПОСОЧЕН/i.test(s);
 const value=generic?'ХХХХХХХХХХХХ':s.replace(/^(?:Адрес(?:\s+за\s+кореспонденция)?|За\s+кореспонденция)\s*:/i,'').trim();
 return 'Адрес: '+value;
}
const zoneNames={'BG0000194':'Река Чая','BG0000578':'Река Марица'};
function zoneList(d){
 const raw=[...(Array.isArray(d?.zones)?d.zones:[]),...(Array.isArray(d?.zoneCodes)?d.zoneCodes:[])];
 const set=new Map();
 for(const item of raw){const code=String(typeof item==='string'?item:item?.sitecode||item?.code||'').match(/BG\d{7}/)?.[0];if(!code)continue;
  const name=typeof item==='object'?String(item?.name||item?.sitename||'').trim():'';
  set.set(code,code+(name||zoneNames[code]?' „'+(name||zoneNames[code])+'“':''));
 }
 return [...set.values()];
}
const refText='Наредба за условията и реда за извършване на оценка за съвместимостта на планове, програми, проекти и инвестиционни предложения с предмета и целите на опазване на защитените зони (Наредбата за ОС)';
function characterizationDraft(i,int,d){
 const loc=int.loc?', '+int.loc:'';
 const base=[
  'Предметът на проекта е „'+int.title+'“ за имотите с идентификатори '+int.ids+loc+'. Дейностите, капацитетът, строителните граници, временните площадки и необходимите инфраструктурни връзки се уточняват по уведомлението и проектната документация.',
  'За електроснабдяването се изисква конкретно описание на присъединяването, трасетата, строително-монтажните работи и съгласуванията с оператора; потенциалното им попадане в зоната следва да се провери.',
  'За водоснабдяването се уточняват източникът, необходимите количества, трасето на евентуално присъединяване и необходимостта от нови съоръжения в или близо до защитената зона.',
  'За отпадъчните води се уточняват видът, количествата, събирането, пречистването и отвеждането; липсата на заявено заустване не замества доказано техническо решение.'
 ];
 // The DOCX is a project of an administrative document, not an internal QA log.
 // Retain a clear evidentiary reservation in ordinary Bulgarian instead of a
 // bracketed technical marker that looks like an unfinished software template.
 const caveat=[
  'Посочените технически параметри и източниците за тях не са потвърдени в работния проект и подлежат на уточняване по преписката.',
  'Данните за електроснабдяването подлежат на потвърждение по преписката.',
  'Данните за водоснабдяването подлежат на потвърждение по преписката.',
  'Данните за отпадъчните води подлежат на потвърждение по преписката.'
 ];
 return base[i]+' '+caveat[i];
}

// KT48: restore the approved KT35/KT39 document composition from the
// original DOCX, without importing factual/legal conclusions from the example.
// The five impact directions are headings / evaluation dimensions, not findings.
function preserveApprovedImpactDirections(p,start){
 for(let i=0;i<5;i++){
  const original=text(p[start+i]).trim();
  if(!original||/ЗА ЕКСПЕРТНА ПРОВЕРКА/.test(original))
   throw Error('KT48: missing original approved impact direction '+(i+1));
 }
}
function legalOutcomeForReview(kind,int,d){
 const base='С оглед характера и местоположението на инвестиционното предложение ';
 if(kind==='environment'){
  return 'Така заявеното ИП и предвидените в него дейности се съпоставят с позициите на приложения № 1 и № 2 към Закона за опазване на околната среда (ЗООС). Преценката за приложимост на процедурите по глава шеста се мотивира въз основа на действителния предмет и потвърдените данни по преписката.';
 }
 if(kind==='effects'){
  const relation=d.scenario==='А'?'извън границите на защитени зони':'с установено пространствено пресичане със '+(zones(d)||'защитена зона');
  return base+'и установеното положение на имотите '+relation+', при преценката на вероятните преки, косвени и съвкупни въздействия се разглеждат следните направления:';
 }
 if(kind==='admissibility'){
  return 'Допустимостта на заявеното инвестиционно предложение спрямо приложимите режими на '+(zones(d)||'засегнатата защитена зона')+' се установява след съпоставка с действащата заповед за обявяване, последващите изменения и относимите цели на опазване.';
 }
 if(kind==='zoneOrder'){
  return 'Защитена зона '+(zones(d)||'НЯМА ДАННИ')+' е пространствено идентифицирана от ГИС анализа. Конкретната заповед за обявяване, нейните изменения и относимите режими се посочват след проверка в нормативния архив.';
 }
 if(kind==='landUse'){
  return 'Заявените данни относно промяна предназначението и/или начина на трайно ползване на имота се съобразяват при преценката за приложимост на Наредбата за ОС.';
 }
 if(kind==='procedure'){
  return 'В тази връзка преценката на компетентния орган по отношение на инвестиционното предложение „'+int.title+'“ за имотите с идентификатори '+int.ids+' се обосновава с потвърдените данни от преписката, пространствения анализ и приложимите нормативни основания. Окончателен процедурен извод не е установен в настоящия работен проект.';
 }
 throw Error('KT48: unknown legal segment '+kind);
}
function legalDraft(i,int,d){
 const z=zones(d)||reviewMarker('идентификация на защитена зона');
 const a=[
  'ГИС анализът удостоверява пространствено пресичане между имотите '+int.ids+' и '+z+'. В този случай следва да се извърши преценка на приложимите разпоредби от Закона за биологичното разнообразие и Наредбата за ОС, като се разграничат установеното местоположение, допустимостта спрямо режимите и вероятността от въздействие.',
  'За '+z+' приложимият режим и конкретните ограничения се установяват чрез заповедта за обявяване, последващите изменения и специфичните цели на опазване. Самото пресичане не доказва нито допустимост, нито недопустимост на заявените дейности.',
  'За процедурната преценка се съпоставят чл. 31 от Закона за биологичното разнообразие и релевантните хипотези на Наредбата за ОС с конкретните дейности, инженерни връзки, земеползване и евентуалните други проекти. Приложимият член, алинея и точка се посочват след проверка на нормативния архив.',
  'Данните за пресичане не заместват проучването на засегнатите местообитания и видове, целите на опазване и възможните преки, косвени и съвкупни въздействия. Необходимите доказателства следва да бъдат свързани с конкретни източници.',
 ];
 return a[i]+' '+reviewMarker('правен и доказателствен извод '+(i+1));
}
function impactDraft(i,int,d){
 const z=zones(d)||'засегнатата зона';
 const a=[
  'Пряко засягане на природни местообитания: следва да се наложи реалният строителен отпечатък, включително временните площадки и трасетата, върху пространствените данни за природните местообитания, предмет на опазване в '+z+'. Имотното пресичане само по себе си не доказва наличие или унищожаване на местообитание.',
  'Видове и местообитания на видове: преценява се дали дейностите могат да доведат до загуба, фрагментация, бариерен ефект или нарушаване на екологични връзки, с оглед конкретните цели на опазване за '+z+'.',
  'Безпокойство: изследват се шум, светлина, транспорт и сезонност на строителните и експлоатационните дейности спрямо чувствителните видове в защитената зона.',
  'Води, почви и емисии: оценяват се земни работи, повърхностен отток, отпадъчни води, замърсяване и вероятните пътища за разпространение към природните местообитания и видовете.',
  'Кумулативни въздействия и цялост на зоната: разглеждат се други планове и инвестиционни предложения, трасетата на инженерните връзки и функционалната свързаност; липсата на данни не е доказателство за липса на въздействие.'
 ];
 return a[i]+' '+reviewMarker('конкретизиране и доказателства за направление '+(i+1));
}
function cleanAIPart(t){
 const s=clean(t).replace(/\s*\[(?:ЗА ЕКСПЕРТНА ПРОВЕРКА|ОТКЪС ОТ ПРЕПИСКАТА)[^\]]*\]/gi,'').replace(/\s+/g,' ').trim();
 return s&&!/^(?:НЯМА ДАННИ|не са предоставени данни)$/i.test(s)?s:'';
}
function evidenceText(para,fallback){
 const t=cleanAIPart(para);
 return t? t+' '+reviewMarker('сверяване на фактите и правните основания'):fallback;
}

const all=(el,name)=>Array.from(el.getElementsByTagNameNS(NS,name));
const text=p=>all(p,'t').map(t=>t.textContent).join('');
function put(p,value){
 const t=all(p,'t');if(!t.length)throw Error('КТ41: еталонен абзац без текст.');
 t[0].textContent=String(value);t[0].setAttribute('xml:space','preserve');
 for(let i=1;i<t.length;i++)t[i].textContent='';
}
async function source(which){
 await ensureZip();
 const resp=await fetch(T[which],{cache:'no-store'});if(!resp.ok)throw Error('КТ41: липсва одобреният еталон '+which);
 const zip=root.fflate.unzipSync(new Uint8Array(await resp.arrayBuffer()));
 if(!zip['word/document.xml']||!zip['word/_rels/document.xml.rels']||!Object.keys(zip).some(x=>x.startsWith('word/media/')))throw Error('КТ41: невалиден институционален DOCX '+which);
 const xml=new DOMParser().parseFromString(new TextDecoder().decode(zip['word/document.xml']),'application/xml');
 if(xml.getElementsByTagName('parsererror').length)throw Error('КТ41: невалиден XML '+which);
 const body=all(xml,'body')[0],p=Array.from(body.children).filter(el=>el.localName==='p');
 const expected={A:41,B:43,E:49}[which];
 if(p.length!==expected||!text(p[10]).startsWith('Относно:'))throw Error('КТ41: еталонът '+which+' не съвпада с одобрената контролна точка.');
 return {zip,xml,p};
}
function alignClassicAConfidentialityWithB(doc,approvedB){
 // KT46: exact positioning from the approved B, including paragraph indents,
 // spacing, alignment and keepNext; preserve all A document text and footer.
 for(const [i,expected] of [[0,'Ниво на конфиденциалност 0'],[1,'[TLP-WHITE]']]){
  const para=doc.p[i],bpara=approvedB.p[i];
  if(text(para).trim()!==expected||text(bpara).trim()!==expected)
   throw Error('KT46: unexpected confidentiality content '+i);
  const target=Array.from(para.children).find(n=>n.localName==='pPr');
  const reference=Array.from(bpara.children).find(n=>n.localName==='pPr');
  if(!target||!reference)throw Error('KT46: missing approved paragraph properties '+i);
  para.replaceChild(doc.xml.importNode(reference,true),target);
 }
}
function isApprovedCase(m,scenario){
 const ids=(clean(m.parcelIds).match(/\b\d{5}\.\d+\.\d+\b/g)||[]).sort().join(',');
 const title=subject(m.subject).toLocaleLowerCase('bg');
 return m.approvedSpecimen===true&&['А','Б'].includes(scenario)&&ids==='56784.13.102,56784.13.105,56784.13.106'&&/складове за промишлени стоки и офиси/.test(title);
}
function reviewText(x){
 const t=clean(x);
 return !!t&&!/\[ЗА ЕКСПЕРТНА ПРОВЕРКА|\[ЗА ПОПЪЛВАНЕ|\[ОТКЪС ОТ ПРЕПИСКАТА|НЯМА ДАННИ/i.test(t);
}
function validated(xs,i){
 const t=Array.isArray(xs)?xs[i]:'';
 return reviewText(t)?clean(t):null;
}
function finish(doc,label){
 const {zip,xml,p}=doc;
 const markers=p.map(text).filter(t=>/\[\[(?:CONCLUSION|PROCEDURE|CHARACTERIZATION|LEGAL|IMPACTS)\]\]/i.test(t));
 if(markers.length)throw Error('КТ41: останали технически маркери в '+label);
 zip['word/document.xml']=new TextEncoder().encode(new XMLSerializer().serializeToString(xml));
 return new Blob([root.fflate.zipSync(zip,{level:6})],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
function intro(m){
 const ids=clean(m.parcelIds);if(!/^\d{5}\.\d+\.\d+/.test(ids))throw Error('КТ41: липсват потвърдени имоти.');
 return {ids,title:subject(m.subject),loc:clean(m.location),locality:clean(m.locality),settlement:clean(m.settlement),municipality:clean(m.municipality),region:clean(m.region),ref:safe(m.incomingReference,'входящ номер и дата')};
}
function char1(t){t=clean(t);return /^С реализацията на инвестиционното предложение/i.test(t)?t:'С реализацията на инвестиционното предложение '+t.replace(/^(?:Предвижда се\s*)/i,'се предвижда ');}
const get= (xs,i,where)=>safe(Array.isArray(xs)?xs[i]:'',where);
const zones=d=>zoneList(d).join(', ');
const spatial=(d,int)=>d.scenario==='А'
 ?'Поземлените имоти с идентификатори '+int.ids+(int.loc?', '+int.loc:'')+' не попадат в границите на защитени зони от екологичната мрежа „Натура 2000“ по смисъла на Закона за биологичното разнообразие.'
 :'За имотите с идентификатори '+int.ids+' е установено пространствено пресичане със защитена зона '+zones(d)+'. Конкретното пресичане е документирано в самостоятелния ГИС анализ.';
function neutralProcedure(scenario){
 return 'Постъпилата документация се разглежда с оглед характера на дейностите, териториалния обхват, инженерните връзки и относимите защитени зони. Приложимият процедурен ред по Закона за биологичното разнообразие и Наредбата за оценка за съвместимост се установява въз основа на потвърдените факти и проверените нормативни основания. '+(scenario==='Б'?'Пресичането със защитена зона само по себе си не определя окончателния процедурен извод.':'Липсата на имотно пресичане не изключва преценка за преки, косвени и съвкупни въздействия.');
}
function locationSentence(m,d){
 if(d.scenario==='Б')return 'Пресичащи се защитени зони: '+(zones(d)||reviewMarker('код и наименование на защитената зона'))+'. Правният режим се сверява с приложимата заповед и целите на опазване по нормативния архив.';
 return reviewText(m.nearestZone)?clean(m.nearestZone):'НЯМА ДАННИ';
}
function heading(int){
 const ids=[...new Set((int.ids.match(/\b\d{5}\.\d+\.\d+\b/g)||[]))];
 const idList=ids.length<2?ids[0]:ids.slice(0,-1).join(', ')+' и '+ids[ids.length-1];
 const parcel=ids.length===1?'в поземлен имот с идентификатор '+idList:'в поземлени имоти с идентификатори '+idList;
 const normal=x=>clean(x).replace(/\s+/g,' ').trim();
 const loc=normal(int.loc).replace(/^населено място\s*/i,'').replace(/\b\d{5}\.\d+\.\d+\b/g,'').replace(/^(?:ПИ|имот|поземлен имот)\s+с\s+идентификатор\s*/i,'').replace(/^[,\s]+|[,\s]+$/g,'');
 const settlement=normal(int.settlement);
 const locality=normal(int.locality).replace(/^местност\s+/i,'').replace(/[„“]/g,'');
 const municipality=normal(int.municipality).replace(/^община\s+/i,'');
 const region=normal(int.region).replace(/^(?:област|обл\.)\s+/i,'');
 const parts=[];
 // "по КККР на" follows both approved classical Word specimens.
 const place=settlement||((loc.match(/(?:гр\.|град|с\.|село)\s*[^,;]+/i)||[])[0])||'НЯМА ДАННИ';
 parts.push('по КККР на '+place);
 // A source may provide the locality as a stand-alone GIS field or within a confirmed location.
 const localMatch=(loc.match(/местност\s*[„“]?([^,;.„“]+)[„“]?/i)||[])[1];
 const locName=locality||normal(localMatch);
 if(locName)parts.push('местност „'+locName.replace(/[„“]/g,'').trim()+'“');
 // Keep missing administrative fields concise, and never invent a municipality or region.
 parts.push('община '+(municipality||'НЯМА ДАННИ'));
 parts.push('област '+(region||'НЯМА ДАННИ'));
 return 'Относно: Уведомление за инвестиционно предложение (ИП): „'+int.title+'“ '+parcel+' '+parts.join(', ')+'.';
}
function putHeading(p,int){
 const headline=heading(int);
 const match=headline.match(/^(Относно)(: Уведомление за инвестиционно предложение \(ИП\): )(„[^“]*“)([\s\S]*)$/);
 if(!match)throw Error('КТ44: невалидно потвърдено заглавие за Word.');
 // The exact three approved DOCX specimens split the heading into four
 // styled text runs. Keep all original runs, paragraph and formatting XML.
 // In particular, never overwrite the first (often empty) text run.
 const original=all(p,'t').filter(t=>t.textContent.length>0);
 if(original.length!==4||original[0].textContent!=='Относно'||
    !original[1].textContent.includes('Уведомление за инвестиционно предложение')||
    !/^„/.test(original[2].textContent)||
    !original[3].textContent.includes('поземлен'))
   throw Error('КТ44: структурата на абзаца „Относно“ се различава от одобрения еталон.');
 for(let i=0;i<4;i++){
   original[i].textContent=match[i+1];
   original[i].setAttribute('xml:space','preserve');
 }
}
function introParagraph(p,index,int,expert){
 const old=text(p[index]);
 let updated=old.replace(/Вх\. № ОВОС-ХХХХ\s*\/\s*ХХ\.ХХ\.ХХХХ г\./,int.ref);
 if(updated===old||!updated.includes('Наредба за условията и реда'))updated='Във връзка с внесеното уведомление в РИОСВ-Пловдив с '+int.ref+' за горецитираното инвестиционно предложение, на основание чл. 6а, т. 2 от '+refText+(expert?' е изготвен настоящият експертен проект.':' Ви уведомявам следното:');
 put(p[index],updated);
}
function metadata(doc,m){
 const p=doc.p,int=intro(m);
 put(p[6],party(m.recipient,'recipient'));
 put(p[7],party(m.address,'address'));
 putHeading(p[10],int);
 introParagraph(p,16,int,false);
 return int;
}
async function classic(scenario,paragraphs,m,context={}){
 const k=scenario==='А'||scenario==='A'?'A':'B';
 if(!['А','A','Б','B'].includes(scenario))throw Error('КТ41: неопределен сценарий.');
 const d=context.determination;if(!d||(''+d.scenario)!==scenario)throw Error('КТ41: ГИС сценарият не съвпада.');
 if(k==='B'&&!d.zones?.length)throw Error('КТ41: пресичане без защитена зона.');
 if(!Array.isArray(paragraphs)||paragraphs.length!==4)throw Error('КТ41: липсва класическата характеристика.');
 const doc=await source(k);if(k==='A')alignClassicAConfidentialityWithB(doc,await source('B'));
 const p=doc.p,int=metadata(doc,m);
 const same=isApprovedCase(m,k==='A'?'А':'Б');
 if(same){
  // Preserve the exact approved text, formatting and legal/impact argumentation.
  // Only verified administrative variable fields were populated above.
  if(k==='B'&&!d.zones.some(z=>String(typeof z==='string'?z:z?.code||'').includes('BG0000578')))throw Error('КТ42: тестов образец Б не съответства на установената зона.');
  put(p[17],neutralProcedure(k==='A'?'А':'Б'));
  if(k==='A')put(p[23],'Най-близко разположена защитена зона: '+locationSentence(m,{scenario:'А'})+'.');
  return finish(doc,'КТ35-А');
 }
 put(p[17],neutralProcedure(k==='A'?'А':'Б'));
 // For a new case do not inherit the specimen's factual characterization.
 // A missing or unverified paragraph remains visibly pending expert review.
 for(let i=0;i<4;i++){
  const confirmed=reviewText(paragraphs[i]);
  const value=confirmed?clean(paragraphs[i]):characterizationDraft(i,int,d);
  put(p[18+i],i===0&&confirmed?char1(value):value);
 }
 // KT48: preserve the five approved classical bullet directions in the DOCX.
 // Only the evidentiary narrative and conditional conclusions may change.
 const legal=m.legalParagraphs||[];
 const textLegal=i=>validated(legal,i);
 const procedureText=reviewText(m.procedureFinding)?clean(m.procedureFinding):legalOutcomeForReview('procedure',int,d);
 if(k==='A'){
  put(p[22],spatial({...d,scenario:'А'},int));
  put(p[23],'Най-близко разположена защитена зона: '+locationSentence(m,{scenario:'А'})+'.');
  put(p[24],textLegal(0)||legalOutcomeForReview('environment',int,d));
  put(p[25],textLegal(1)||legalOutcomeForReview('effects',int,{...d,scenario:'А'}));
  preserveApprovedImpactDirections(p,26);
  put(p[31],procedureText);
 }else{
  put(p[22],textLegal(0)||legalOutcomeForReview('landUse',int,d));
  put(p[23],spatial({...d,scenario:'Б',zones:d.zones},int));
  put(p[24],legalOutcomeForReview('zoneOrder',int,d));
  put(p[25],textLegal(1)||legalOutcomeForReview('admissibility',int,d));
  put(p[26],textLegal(2)||legalOutcomeForReview('environment',int,d));
  put(p[27],textLegal(3)||legalOutcomeForReview('effects',int,{...d,scenario:'Б'}));
  preserveApprovedImpactDirections(p,28);
  put(p[33],procedureText);
 }
 return finish(doc,'КТ'+(k==='A'?'35-А':'39-Б'));
}
function aiParts(raw){
 const out={},matches=[...String(raw||'').matchAll(/^\s*\[\[(CHARACTERIZATION|LEGAL|PROCEDURE|IMPACTS)\]\]\s*$/gm)];
 for(let i=0;i<matches.length;i++){const name=matches[i][1],start=matches[i].index+matches[i][0].length,end=i+1<matches.length?matches[i+1].index:raw.length;out[name]=raw.slice(start,end).trim().split(/\n\s*\n/).map(clean).filter(Boolean);}
 return out;
}
// KT47: prevent unsourced AI assertions or provisions from becoming official findings.
function supportedAILegal(raw,draft){
 const t=cleanAIPart(raw);
 if(!t||/(?:не подлежи|не е необходима оценка|не се изисква|липса на значими въздействия|няма вероятност за въздействие)/i.test(t))return '';
 const cited=[...t.matchAll(/чл\.\s*(\d+[а-я]?)/gi)].map(x=>x[1]);
 const sources=Array.isArray(draft.legalSources)?draft.legalSources:[];
 if(cited.length&&!cited.every(n=>sources.some(x=>String(x.article||'').includes(n))))return '';
 return t;
}
// KT48: the source of the legal paragraph structure is the approved V27-R02.
// Do not replace that R02 structure with the generic KT43/KT44 legalDraft().
function approvedR02LegalFallback(i,int,draft,p){
 const outside=draft.scenario==='А'||draft.scenario==='A';
 if(i===0)return outside
  ?'При извършената преценка са отчетени установеното пространствено положение на имотите извън границите на защитени зони от мрежата „Натура 2000“, характерът и предназначението на инвестиционното предложение, техническите му решения и възможните преки, косвени и съвкупни въздействия. Окончателният извод зависи от доказаните параметри на дейностите.'
  :'При извършената преценка са отчетени установеното ГИС пресичане на имотите със '+(zones(draft)||'защитена зона')+', характерът на заявените дейности, приложимите режими, инженерните връзки и възможните преки, косвени и съвкупни въздействия. Самото пресичане не предрешава административния извод.';
 if(i===1)return outside
  ?'Разгледана е хипотезата на чл. 2, ал. 1, т. 2 от Наредбата за ОС, която предвижда териториална предпоставка за попадане изцяло или отчасти в защитена зона. За разглежданите имоти ГИС анализът не установява такава предпоставка.'
  :'Разгледана е хипотезата на чл. 2, ал. 1, т. 2 от Наредбата за ОС. За разглежданите имоти е установено пространствено пресичане, но приложимостта на хипотезата зависи и от заявената дейност и останалите нормативни условия.';
 if(i===2)return text(p[27]); // original R02 general legal method, not an example-specific decision
 if(i===3)return 'При правната квалификация на инвестиционното предложение се съобразява чл. 2, ал. 1, т. 1 от Наредбата за ОС във връзка с обхвата на глава шеста от Закона за опазване на околната среда (ЗООС). Приложимостта на приложения № 1 и № 2 към ЗООС се преценява според установените дейности и техния капацитет.';
 throw Error('KT48: unknown R02 legal section');
}
function contradictoryGIS(textValue,scenario){
 return (scenario==='А'||scenario==='A')&&/(?:ГИС анализът удостоверява пространствено пресичане|установено пространствено пресичане|попада(?:т)? частично в границите на защитена зона|за засегнатата защитена зона)/i.test(String(textValue||''));
}
// KT48: preserve R02's five independent impact dimensions instead of the
// generic KT43 impact writer. A GIS intersection alone is not a habitat finding.
function approvedR02ImpactFallback(i,int,draft,p){
 const outside=draft.scenario==='А'||draft.scenario==='A';
 const zone=zones(draft);
 if(i===-1)return 'При съвкупната преценка на местоположението, характера на инвестиционното предложение и неговите инженерни връзки се разглеждат възможните преки, косвени и съвкупни въздействия по следните пет направления:';
 const paragraphs=outside?[
  'Установеното отсъствие на имотно пресичане изключва пряко отнемане на площ от защитена зона в границите на разглежданите имоти. Възможните извънимотни дейности и инженерни трасета се разглеждат отделно.',
  'Отчитат се естеството и действителното разположение на строителните дейности, транспортът, шумът и осветлението, включително възможните пътища на косвено въздействие.',
  'Разграничават се липсата на имотно пресичане и възможните функционални връзки с предмета и целите на опазване на защитените зони.',
  'Проверява се дали предвидените инженерни връзки и съпътстващи дейности могат да повлияят на свързаността между защитени зони.',
  'Разглеждат се самостоятелните и съвкупните въздействия във взаимодействие с други установени планове, програми, проекти и инвестиционни предложения.'
 ]:[
  'Установеното ГИС пресичане със '+(zone||'защитена зона')+' се съпоставя с действителния строителен отпечатък и пространствените данни за местообитанията; пресичането не доказва само по себе си загуба на местообитание.',
  'Отчитат се характерът и сезонността на дейностите, шумът, транспортът и светлината спрямо видовете, предмет на опазване в '+(zone||'защитената зона')+'.',
  'При преценката се съпоставят реалните дейности, границите на '+(zone||'зоната')+' и конкретните цели на опазване, без предварителен извод за допустимост или въздействие.',
  'Разглеждат се възможните бариерни ефекти и връзки с други защитени зони, включително инженерните трасета извън разглежданите имоти.',
  'Разглеждат се самостоятелните и съвкупните въздействия на предложението във взаимодействие с други установени планове, програми и проекти.'
 ];
 const heading=text(p[32+i]).split(/\.\s/)[0].trim();
 if(!heading||!paragraphs[i])throw Error('KT48: missing approved R02 impact section '+i);
 return heading+'. '+paragraphs[i];
}
function groundedLegalParagraph(raw,draft,fallback){
 const t=supportedAILegal(raw,draft);
 if(!t||contradictoryGIS(t,draft.scenario))return fallback;
 const references=(draft.legalSources||[]).filter(x=>x.article&&x.title&&x.source);
 return t+(references.length?' Проверени нормативни референции: '+references.slice(0,2).map(x=>x.title+', '+x.article+' ('+x.source+')').join('; ')+'.':' Правните основания се сверяват по нормативния архив.');
}
async function expert(draft,options={}){
 if(draft?.schema!=='KT13_EXPERT_DRAFT_V1'||options.requireAiAuthor!==true)throw Error('КТ41: липсва проверен AI проект.');
 const doc=await source('E'),p=doc.p,m=draft.metadata,int=intro(m),ai=aiParts(draft.aiDraft);
 const same=isApprovedCase(m,draft.scenario);
 if(same){
  // Exact approved V27 R02, including legal analysis, GIS overview, styles and signatures.
  put(p[6],party(m.recipient,'recipient'));
  put(p[7],party(m.address,'address'));
  putHeading(p[10],int);
  introParagraph(p,17,int,true);
  put(p[18],neutralProcedure(draft.scenario));
  put(p[24],locationSentence(m,draft));
  return finish(doc,'V27 R02');
 }
 if(['CHARACTERIZATION','LEGAL','PROCEDURE','IMPACTS'].some(k=>!ai[k]?.length))throw Error('КТ42: непълен AI авторски проект.');
 put(p[6],party(m.recipient,'recipient'));put(p[7],party(m.address,'address'));
 putHeading(p[10],int);
 introParagraph(p,17,int,true);
 put(p[18],neutralProcedure(draft.scenario));
 put(p[20],evidenceText(ai.CHARACTERIZATION[0],characterizationDraft(0,int,draft)));
 const engineering=ai.CHARACTERIZATION.slice(1).map(cleanAIPart).filter(Boolean);
 const engineeringText=engineering.length?evidenceText([...new Set(engineering)].join(' '),characterizationDraft(1,int,draft))
  :[1,2,3].map(i=>characterizationDraft(i,int,draft).replace(/\s*\[ЗА ЕКСПЕРТНА ПРОВЕРКА[^\]]*\]/g,'')).join(' ')+' '+reviewMarker('технически решения за електроснабдяване, водоснабдяване и отпадъчни води');
 put(p[21],engineeringText);
 put(p[23],spatial(draft,int));
 put(p[24],locationSentence(m,draft));
 put(p[25],groundedLegalParagraph(ai.LEGAL[0],draft,approvedR02LegalFallback(0,int,draft,p)));
 for(let i=0;i<3;i++){
   const supplied=validated(m.legalParagraphs,i);
   put(p[26+i],(supplied&&!contradictoryGIS(supplied,draft.scenario)?supplied:null)||groundedLegalParagraph(ai.LEGAL[i+1],draft,approvedR02LegalFallback(i+1,int,draft,p)));
 }
 const imp0=cleanAIPart(ai.IMPACTS[0]);
 put(p[31],imp0&&!contradictoryGIS(imp0,draft.scenario)?imp0:approvedR02ImpactFallback(-1,int,draft,p));
 for(let i=0;i<5;i++){
  const candidate=cleanAIPart(ai.IMPACTS[i+1]);
  put(p[32+i],candidate&&!contradictoryGIS(candidate,draft.scenario)
   ?candidate:approvedR02ImpactFallback(i,int,draft,p));
 }
 const blockedProcedure=/(?:не е приложима процедура|не подлежи на процедура|не се изисква оценка|не се налага|не се изисква|не подлежи|няма вероятност|малко вероятно|незначителн(?:о|и|а) въздейств|не се очаква въздейств|липса на значими въздействия|не поражда въздействия|не оказва въздействие|ниск[аио] риск)/i;
 const reviewedProcedure=(ai.PROCEDURE||[]).filter(t=>!blockedProcedure.test(t));
 put(p[38],reviewedProcedure.length?safe(reviewedProcedure[0],'процедурна преценка'):'Приложимата процедура се определя след експертна проверка на пълната преписка, пространствените резултати и относимите нормативни основания. Само липсата на териториално пресичане не е достатъчно основание за окончателен процедурен извод.');
 const conclusion=safe(m.procedureFinding,'проект на заключение');
 const safeConclusion=reviewText(conclusion)&&!blockedProcedure.test(conclusion)&&!contradictoryGIS(conclusion,draft.scenario)
  ?conclusion
  :'Окончателната преценка на компетентния орган се формира според потвърденото пространствено положение, действителния характер на дейностите и приложимите нормативни основания. При настоящите данни окончателен процедурен извод не е установен в работния проект.';
 put(p[39],safeConclusion);
 return finish(doc,'V27 R02');
}
root.V26TemplateWord=Object.freeze({make:classic,templatePaths:classicBase.templatePaths,layout:'KT41_EXACT_KT35_KT39'});
root.V26ExpertWord=Object.freeze({make:expert,layout:'KT41_EXACT_V27_R02'});
})(typeof window!=='undefined'?window:globalThis);
