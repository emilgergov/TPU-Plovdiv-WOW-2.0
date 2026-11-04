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
// KT47 content integrity: every draft paragraph reflects the GIS scenario.
function scenarioA(d){return d?.scenario==='А'||d?.scenario==='A';}
function evidenceReservation(){return 'Конкретните параметри и приложимите основания подлежат на съпоставка с проверените материали по преписката и нормативния архив.';}
function legalDraft(i,int,d){
 const outside=scenarioA(d);
 const z=zones(d);
 const a=outside?[
  'ГИС анализът установява, че разгледаните поземлени имоти с идентификатори '+int.ids+' са извън границите на защитени зони от мрежата „Натура 2000“. Този пространствен факт е различен от преценката за възможни косвени въздействия от инвестиционното предложение.',
  'При липса на имотно пресичане се изследват функционалното предназначение, предвидените инженерни връзки, възможните трасета, емисии и пътища за въздействие към защитени зони, ако такива са установени по проверени данни.',
  'Приложимият процедурен ред по Закона за биологичното разнообразие и Наредбата за ОС се определя въз основа на конкретните дейности и потвърдените факти, а не само от липсата на териториално пресичане.',
  'Доказателствената преценка следва да разграничи установените ГИС факти от данните за местообитания, видове и възможни преки, косвени и съвкупни въздействия; неподкрепените с източник твърдения не се приемат за установени.'
 ]:[
  'ГИС анализът установява пространствено пресичане между имотите с идентификатори '+int.ids+' и защитена зона '+(z||'с непотвърдено наименование')+'. Пресичането не предрешава допустимостта или вероятността от значително въздействие.',
  'За '+(z||'посочената защитена зона')+' приложимите режими се проверяват по заповедта за обявяване, последващите изменения и целите на опазване; не се извежда правен извод само от картографското пресичане.',
  'За процедурната преценка се съпоставят приложимите разпоредби на Закона за биологичното разнообразие и Наредбата за ОС с реалните дейности, инженерните връзки и възможните преки, косвени и съвкупни въздействия.',
  'ГИС пресичането не замества доказателства за присъствието и състоянието на природни местообитания и видове; относимите факти се проверяват спрямо целите на опазване.'
 ];
 return a[i]+' '+evidenceReservation();
}
function impactDraft(i,int,d){
 const outside=scenarioA(d),z=zones(d);
 const a=outside?[
  'Природни местообитания: не е установено имотно пресичане със защитена зона. Възможното косвено засягане от строителни дейности, временни площадки и инфраструктурни трасета се оценява само при конкретно установен път на въздействие.',
  'Видове и местообитания на видове: проверява се дали извънимотни дейности, транспорт или инженерни връзки могат да окажат влияние върху предмета и целите на опазване на установени в близост защитени зони.',
  'Безпокойство: разглеждат се шум, светлина, движение и сезонност на дейностите, като се проверява дали съществува реална връзка с чувствителни видове в защитени зони.',
  'Води, почви и емисии: оценяват се възможни пътища на пренос, включително повърхностен отток, отпадъчни води и въздушни емисии, без да се предполага пряко засягане на защитена зона.',
  'Съвкупни въздействия: анализират се други действащи или планирани дейности и функционални връзки; липсата на териториално пресичане сама по себе си не изключва въздействие.'
 ]:[
  'Природни местообитания: за установеното пресичане с '+(z||'защитената зона')+' се проверява дали действителният строителен отпечатък, временните площадки и трасетата засягат местообитания, предмет на опазване.',
  'Видове и местообитания на видове: проверяват се загуба, фрагментация, бариерен ефект и нарушаване на екологичните връзки с оглед целите на опазване за '+(z||'зоната')+'.',
  'Безпокойство: проверяват се шум, светлина, транспорт и сезонност спрямо чувствителните видове на пресичаната защитена зона.',
  'Води, почви и емисии: проверяват се земни работи, повърхностен отток, отпадъчни води и възможните пътища за разпространение към местообитанията и видовете.',
  'Съвкупни въздействия и цялост на зоната: проверяват се други планове, инвестиционни предложения, трасета и функционални връзки без предварително предположение за резултата.'
 ];
 return a[i]+' '+evidenceReservation();
}
function cleanAIPart(t){
 const s=clean(t).replace(/\s*\[(?:ЗА ЕКСПЕРТНА ПРОВЕРКА|ОТКЪС ОТ ПРЕПИСКАТА)[^\]]*\]/gi,'').replace(/\s+/g,' ').trim();
 return s&&!/^(?:НЯМА ДАННИ|не са предоставени данни)$/i.test(s)?s:'';
}
function mismatchedScenario(t,d){
 const value=clean(t);
 return scenarioA(d)&&/(?:ГИС анализът удостоверява пространствено пресичане|установено (?:е |пространствено )?пресичане|установеното пресичане|имотното пресичане|в границите на засегнатата зона|на пресичаната защитена зона|попада(?:т)? в границите на защитена зона)/i.test(value);
}
function evidenceText(para,fallback,d){
 const t=cleanAIPart(para);
 // Do not copy AI assumptions that contradict the verified GIS determination.
 return t&&!mismatchedScenario(t,d)?t+' Следва проверка на фактическата и документалната основа.':fallback;
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
 const legal=m.legalParagraphs||[],impact=m.impactFindings||[];
 // Unknown legal and impact findings do not prevent creating an unsigned draft.
 // Missing evidence must not silently inherit findings from the approved example.
 const textLegal=i=>{const v=validated(legal,i);return v&&!mismatchedScenario(v,d)?v:legalDraft(i,int,d)};
 const textImpact=i=>{const v=validated(impact,i);return v&&!mismatchedScenario(v,d)?v:impactDraft(i,int,d)};
 // A draft must remain possible when no final procedure decision has been verified.
 // Do not copy the example case's conclusion into a different dossier.
 const procedureText=reviewText(m.procedureFinding)&&!mismatchedScenario(m.procedureFinding,d)?clean(m.procedureFinding)
  :'[ЗА ЕКСПЕРТНА ПРОВЕРКА — приложимата процедура и окончателният извод се определят от компетентния орган по пълната преписка и относимите нормативни основания.]';
 if(k==='A'){
  put(p[22],spatial({...d,scenario:'А'},int));
  put(p[23],'Най-близко разположена защитена зона: '+locationSentence(m,{scenario:'А'})+'.');
  put(p[24],textLegal(0));put(p[25],textLegal(1));
  for(let i=0;i<5;i++)put(p[26+i],textImpact(i));
  put(p[31],procedureText);
 }else{
  put(p[22],textLegal(0));put(p[23],spatial({...d,scenario:'Б',zones:d.zones},int));
  put(p[24],locationSentence(m,d));
  put(p[25],textLegal(1));put(p[26],textLegal(2));put(p[27],textLegal(3));
  for(let i=0;i<5;i++)put(p[28+i],textImpact(i));
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
 if(mismatchedScenario(t,draft))return '';
 if(!t||/(?:не подлежи|не е необходима оценка|не се изисква|липса на значими въздействия|няма вероятност за въздействие)/i.test(t))return '';
 const cited=[...t.matchAll(/чл\.\s*(\d+[а-я]?)/gi)].map(x=>x[1]);
 const sources=Array.isArray(draft.legalSources)?draft.legalSources:[];
 if(cited.length&&!cited.every(n=>sources.some(x=>String(x.article||'').includes(n))))return '';
 return t;
}
function groundedLegalParagraph(raw,draft,fallback){
 const t=supportedAILegal(raw,draft);
 if(!t)return fallback;
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
 put(p[20],evidenceText(ai.CHARACTERIZATION[0],characterizationDraft(0,int,draft),draft));
 const engineering=ai.CHARACTERIZATION.slice(1).map(cleanAIPart).filter(Boolean);
 const engineeringText=engineering.length?evidenceText([...new Set(engineering)].join(' '),characterizationDraft(1,int,draft),draft)
  :[1,2,3].map(i=>characterizationDraft(i,int,draft).replace(/\s*\[ЗА ЕКСПЕРТНА ПРОВЕРКА[^\]]*\]/g,'')).join(' ')+' '+reviewMarker('технически решения за електроснабдяване, водоснабдяване и отпадъчни води');
 put(p[21],engineeringText);
 put(p[23],spatial(draft,int));
 put(p[24],locationSentence(m,draft));
 put(p[25],groundedLegalParagraph(ai.LEGAL[0],draft,legalDraft(0,int,draft)));
 for(let i=0;i<3;i++){
   const supplied=validated(m.legalParagraphs,i);
   put(p[26+i],supplied||groundedLegalParagraph(ai.LEGAL[i+1],draft,legalDraft(i+1,int,draft)));
 }
 put(p[31],evidenceText(ai.IMPACTS[0], 'Възможните въздействия се анализират спрямо доказания ГИС статус и действителните пътища на въздействие. '+evidenceReservation(),draft));
 for(let i=0;i<5;i++)put(p[32+i],evidenceText(ai.IMPACTS[i+1],impactDraft(i,int,draft),draft));
 const blockedProcedure=/(?:не е приложима процедура|не подлежи на процедура|не се изисква оценка|не се налага|не се изисква|не подлежи|няма вероятност|малко вероятно|незначителн(?:о|и|а) въздейств|не се очаква въздейств|липса на значими въздействия|не поражда въздействия|не оказва въздействие|ниск[аио] риск)/i;
 const reviewedProcedure=(ai.PROCEDURE||[]).filter(t=>!blockedProcedure.test(t)&&!mismatchedScenario(t,draft));
 put(p[38],reviewedProcedure.length?safe(reviewedProcedure[0],'процедурна преценка'):'Приложимата процедура се определя след експертна проверка на пълната преписка, пространствените резултати и относимите нормативни основания. Само липсата на териториално пресичане не е достатъчно основание за окончателен процедурен извод.');
 const conclusion=safe(m.procedureFinding,'проект на заключение');
 const safeConclusion=reviewText(conclusion)&&!blockedProcedure.test(conclusion)&&!mismatchedScenario(conclusion,draft)
  ?conclusion
  :'[ЗА ЕКСПЕРТНА ПРОВЕРКА — окончателният процедурен извод не е потвърден по пълната преписка. Наличието на пресичане само по себе си не определя вида на необходимата процедура.]';
 put(p[39],safeConclusion);
 return finish(doc,'V27 R02');
}
root.V26TemplateWord=Object.freeze({make:classic,templatePaths:classicBase.templatePaths,layout:'KT41_EXACT_KT35_KT39'});
root.V26ExpertWord=Object.freeze({make:expert,layout:'KT41_EXACT_V27_R02'});
})(typeof window!=='undefined'?window:globalThis);
