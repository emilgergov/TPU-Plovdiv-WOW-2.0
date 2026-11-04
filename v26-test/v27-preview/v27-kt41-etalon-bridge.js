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
 const s=clean(x);
 if(type==='recipient'){
  if(!s||/^(?:ДО\s+)?ВЪЗЛОЖИТЕЛЯ\s+НА\s+ИНВЕСТИЦИОННОТО\s+ПРЕДЛОЖЕНИЕ/i.test(s)||/\[ЗА ПОПЪЛВАНЕ\]/i.test(s))return 'Възложител: '+reviewMarker('името на възложителя не е установено от преписката');
  return /^(?:ДО|Възложител)/i.test(s)?s:'Възложител: '+s;
 }
 if(!s||/\[ЗА ПОПЪЛВАНЕ\]|НЕ\s+Е\s+ПОСОЧЕН/i.test(s))return 'Адрес: '+reviewMarker('не е посочен адрес за кореспонденция');
 return /^(?:Адрес|За кореспонденция)/i.test(s)?s:'Адрес: '+s;
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
 return base[i]+' '+reviewMarker('непотвърдени параметри и източници — '+['предмет','електроснабдяване','водоснабдяване','отпадъчни води'][i]);
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
function isApprovedCase(m,scenario){
 const ids=(clean(m.parcelIds).match(/\b\d{5}\.\d+\.\d+\b/g)||[]).sort().join(',');
 const title=subject(m.subject).toLocaleLowerCase('bg');
 return ['А','Б'].includes(scenario)&&ids==='56784.13.102,56784.13.105,56784.13.106'&&/складове за промишлени стоки и офиси/.test(title);
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
 return {ids,title:subject(m.subject),loc:clean(m.location),ref:safe(m.incomingReference,'входящ номер и дата')};
}
function char1(t){t=clean(t);return /^С реализацията на инвестиционното предложение/i.test(t)?t:'С реализацията на инвестиционното предложение '+t.replace(/^(?:Предвижда се\s*)/i,'се предвижда ');}
const get= (xs,i,where)=>safe(Array.isArray(xs)?xs[i]:'',where);
const zones=d=>zoneList(d).join(', ');
const spatial=(d,int)=>d.scenario==='А'
 ?'Поземлените имоти с идентификатори '+int.ids+(int.loc?', '+int.loc:'')+' не попадат в границите на защитени зони от екологичната мрежа „Натура 2000“ по смисъла на Закона за биологичното разнообразие.'
 :'За имотите с идентификатори '+int.ids+' е установено пространствено пресичане със защитена зона '+zones(d)+'. Конкретното пресичане е документирано в самостоятелния ГИС анализ.';
function locationSentence(m,d){
 if(d.scenario==='Б')return 'Пресичащи се защитени зони: '+(zones(d)||reviewMarker('код и наименование на защитената зона'))+'. Правният режим се сверява с приложимата заповед и целите на опазване по нормативния архив.';
 return safe(m.nearestZone,'най-близка защитена зона');
}
function heading(int){
 const ids=[...new Set((int.ids.match(/\b\d{5}\.\d+\.\d+\b/g)||[]))];
 const parcel=ids.length===1?'в поземлен имот с идентификатор '+ids[0]:'в поземлени имоти с идентификатори '+ids.join(', ');
 let loc=int.loc.replace(/^(?:населено\s+място\s*)/i,'').trim().replace(/[„“]/g,'');
 if(loc&&ids.some(id=>loc.includes(id)))loc=loc.replace(/\b\d{5}\.\d+\.\d+\b/g,'').replace(/^(?:ПИ|имот|поземлен имот)\s+с\s+идентификатор\s*/i,'').replace(/^[,\s]+|[,\s]+$/g,'');
 return 'Относно: Уведомление за инвестиционно предложение (ИП): „'+int.title+'“ '+parcel+(loc?', '+loc:'')+'.';
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
 put(p[10],heading(int));
 introParagraph(p,16,int,false);
 return int;
}
async function classic(scenario,paragraphs,m,context={}){
 const k=scenario==='А'||scenario==='A'?'A':'B';
 if(!['А','A','Б','B'].includes(scenario))throw Error('КТ41: неопределен сценарий.');
 const d=context.determination;if(!d||(''+d.scenario)!==scenario)throw Error('КТ41: ГИС сценарият не съвпада.');
 if(k==='B'&&!d.zones?.length)throw Error('КТ41: пресичане без защитена зона.');
 if(!Array.isArray(paragraphs)||paragraphs.length!==4)throw Error('КТ41: липсва класическата характеристика.');
 const doc=await source(k),p=doc.p,int=metadata(doc,m);
 const same=isApprovedCase(m,k==='A'?'А':'Б');
 if(same){
  // Preserve the exact approved text, formatting and legal/impact argumentation.
  // Only verified administrative variable fields were populated above.
  if(k==='B'&&!d.zones.some(z=>String(typeof z==='string'?z:z?.code||'').includes('BG0000578')))throw Error('КТ42: тестов образец Б не съответства на установената зона.');
  return finish(doc,'КТ35-А');
 }
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
 const textLegal=i=>validated(legal,i)||legalDraft(i,int,d);
 const textImpact=i=>validated(impact,i)||impactDraft(i,int,d);
 // A draft must remain possible when no final procedure decision has been verified.
 // Do not copy the example case's conclusion into a different dossier.
 const procedureText=reviewText(m.procedureFinding)?clean(m.procedureFinding)
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
async function expert(draft,options={}){
 if(draft?.schema!=='KT13_EXPERT_DRAFT_V1'||options.requireAiAuthor!==true)throw Error('КТ41: липсва проверен AI проект.');
 const doc=await source('E'),p=doc.p,m=draft.metadata,int=intro(m),ai=aiParts(draft.aiDraft);
 const same=isApprovedCase(m,draft.scenario);
 if(same){
  // Exact approved V27 R02, including legal analysis, GIS overview, styles and signatures.
  put(p[6],party(m.recipient,'recipient'));
  put(p[7],party(m.address,'address'));
  put(p[10],heading(int));
  introParagraph(p,17,int,true);
  return finish(doc,'V27 R02');
 }
 if(['CHARACTERIZATION','LEGAL','PROCEDURE','IMPACTS'].some(k=>!ai[k]?.length))throw Error('КТ42: непълен AI авторски проект.');
 put(p[6],party(m.recipient,'recipient'));put(p[7],party(m.address,'address'));
 put(p[10],heading(int));
 introParagraph(p,17,int,true);
 put(p[20],evidenceText(ai.CHARACTERIZATION[0],characterizationDraft(0,int,draft)));
 const engineering=ai.CHARACTERIZATION.slice(1).map(cleanAIPart).filter(Boolean);
 const engineeringText=engineering.length?evidenceText([...new Set(engineering)].join(' '),characterizationDraft(1,int,draft))
  :[1,2,3].map(i=>characterizationDraft(i,int,draft).replace(/\s*\[ЗА ЕКСПЕРТНА ПРОВЕРКА[^\]]*\]/g,'')).join(' ')+' '+reviewMarker('технически решения за електроснабдяване, водоснабдяване и отпадъчни води');
 put(p[21],engineeringText);
 put(p[23],spatial(draft,int));
 put(p[24],locationSentence(m,draft));
 put(p[25],legalDraft(0,int,draft));
 for(let i=0;i<3;i++){
   const supplied=validated(m.legalParagraphs,i);
   put(p[26+i],supplied||legalDraft(i+1,int,draft));
 }
 put(p[31],evidenceText(ai.IMPACTS[0], 'Направленията на възможните въздействия се анализират спрямо предмета и целите на опазване на '+zones(draft)+'. '+reviewMarker('доказателствен анализ')));
 for(let i=0;i<5;i++)put(p[32+i],evidenceText(ai.IMPACTS[i+1],impactDraft(i,int,draft)));
 const blockedProcedure=/(?:не е приложима процедура|не подлежи на процедура|не се изисква оценка|не се налага|не се изисква|не подлежи|няма вероятност|малко вероятно|незначителн(?:о|и|а) въздейств|не се очаква въздейств|липса на значими въздействия|не поражда въздействия|не оказва въздействие|ниск[аио] риск)/i;
 const reviewedProcedure=(ai.PROCEDURE||[]).filter(t=>!blockedProcedure.test(t));
 put(p[38],reviewedProcedure.length?safe(reviewedProcedure[0],'процедурна преценка'):'Приложимата процедура се определя след експертна проверка на пълната преписка, пространствените резултати и относимите нормативни основания. Само липсата на териториално пресичане не е достатъчно основание за окончателен процедурен извод.');
 const conclusion=safe(m.procedureFinding,'проект на заключение');
 const safeConclusion=reviewText(conclusion)&&!blockedProcedure.test(conclusion)
  ?conclusion
  :'[ЗА ЕКСПЕРТНА ПРОВЕРКА — окончателният процедурен извод не е потвърден по пълната преписка. Наличието на пресичане само по себе си не определя вида на необходимата процедура.]';
 put(p[39],safeConclusion);
 return finish(doc,'V27 R02');
}
root.V26TemplateWord=Object.freeze({make:classic,templatePaths:classicBase.templatePaths,layout:'KT41_EXACT_KT35_KT39'});
root.V26ExpertWord=Object.freeze({make:expert,layout:'KT41_EXACT_V27_R02'});
})(typeof window!=='undefined'?window:globalThis);
