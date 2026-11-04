/* KT41: render directly inside the three user-approved DOCX packages.
 * KT35-A / KT39-B / V27-R02. Do not rebuild Word body or styles.
 * Only case-dependent text is populated; never copy example-case decisions.
 */
(function(root){'use strict';
const classicBase=root.V26TemplateWord,expertBase=root.V26ExpertWord;
if(!classicBase?.make||!expertBase?.make||!root.fflate?.unzipSync)throw Error('KT41: липсва базов Word модул.');
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const T={A:'v27-preview/etalon/KT35-A.docx',B:'v27-preview/etalon/KT39-B.docx',E:'v27-preview/etalon/V27-R02.docx'};
const clean=x=>String(x??'').replace(/\[\[(?:CHARACTERIZATION|LEGAL|PROCEDURE|IMPACTS|CONCLUSION)\]\]/g,'').trim();
const safe=(x,where)=>{let s=clean(x);return s&&!/\[\[|\]\]|56784\.13\.10[256]|Рогошко шосе/i.test(s)?s:'[ЗА ЕКСПЕРТНА ПРОВЕРКА — '+where+']';};
const subject=x=>clean(x).replace(/^Относно:\s*/i,'').replace(/^(инвестиционно предложение\s*)+/i,'').replace(/^[„“"\s]+|[„“"\s]+$/g,'').replace(/\s+/g,' ');
const all=(el,name)=>Array.from(el.getElementsByTagNameNS(NS,name));
const text=p=>all(p,'t').map(t=>t.textContent).join('');
function put(p,value){
 const t=all(p,'t');if(!t.length)throw Error('КТ41: еталонен абзац без текст.');
 t[0].textContent=String(value);t[0].setAttribute('xml:space','preserve');
 for(let i=1;i<t.length;i++)t[i].textContent='';
}
async function source(which){
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
function finish(doc,label){
 const {zip,xml,p}=doc;
 const remaining=p.map(text).filter(t=>/56784\.13\.10[256]|Рогошко шосе|Складове за промишлени стоки/i.test(t));
 if(remaining.length)throw Error('КТ41: останали примерни факти от еталона '+label+': '+remaining.length);
 zip['word/document.xml']=new TextEncoder().encode(new XMLSerializer().serializeToString(xml));
 return new Blob([root.fflate.zipSync(zip,{level:6})],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
function intro(m){
 const ids=clean(m.parcelIds);if(!/^\d{5}\.\d+\.\d+/.test(ids))throw Error('КТ41: липсват потвърдени имоти.');
 return {ids,title:subject(m.subject),loc:clean(m.location),ref:safe(m.incomingReference,'входящ номер и дата')};
}
function char1(t){t=clean(t);return /^С реализацията на инвестиционното предложение/i.test(t)?t:'С реализацията на инвестиционното предложение '+t.replace(/^(?:Предвижда се\s*)/i,'се предвижда ');}
const get= (xs,i,where)=>safe(Array.isArray(xs)?xs[i]:'',where);
const zones=d=>d.zones?.join(', ')||'';
const spatial=(d,int)=>d.scenario==='А'
 ?'Поземлените имоти с идентификатори '+int.ids+(int.loc?', '+int.loc:'')+' не попадат в границите на защитени зони от екологичната мрежа „Натура 2000“ по смисъла на Закона за биологичното разнообразие.'
 :'За имотите с идентификатори '+int.ids+' е установено пространствено пресичане със защитена зона '+zones(d)+'. Конкретното пресичане е документирано в самостоятелния ГИС анализ.';
function locationSentence(m,d){
 if(d.scenario==='Б')return 'Пресичащи се защитени зони: '+zones(d)+'. Конкретните режими и приложимите заповеди подлежат на експертна проверка по нормативния архив.';
 return safe(m.nearestZone,'най-близка защитена зона');
}
function metadata(doc,m){
 const p=doc.p,int=intro(m);
 put(p[6],safe(m.recipient,'възложител'));
 put(p[7],safe(m.address,'адрес за кореспонденция'));
 put(p[10],'Относно: Уведомление за инвестиционно предложение (ИП): „'+int.title+'“ в поземлени имоти с идентификатори '+int.ids+(int.loc?', '+int.loc:'')+'.');
 const old=text(p[doc===null?0:16]); // All classic templates use position 16.
 put(p[16],'Във връзка с внесеното уведомление в РИОСВ-Пловдив с '+int.ref+' за горецитираното инвестиционно предложение, на основание чл. 6а, т. 2 от Наредбата за ОС Ви уведомявам следното:');
 return int;
}
async function classic(scenario,paragraphs,m,context={}){
 const k=scenario==='А'||scenario==='A'?'A':'B';
 if(!['А','A','Б','B'].includes(scenario))throw Error('КТ41: неопределен сценарий.');
 const d=context.determination;if(!d||(''+d.scenario)!==scenario)throw Error('КТ41: ГИС сценарият не съвпада.');
 if(k==='B'&&!d.zones?.length)throw Error('КТ41: пресичане без защитена зона.');
 if(!Array.isArray(paragraphs)||paragraphs.length!==4)throw Error('КТ41: липсва класическата характеристика.');
 const doc=await source(k),p=doc.p,int=metadata(doc,m);
 for(let i=0;i<4;i++)put(p[18+i],i===0?char1(safe(paragraphs[i],'предмет и дейности')):safe(paragraphs[i],'инженерна характеристика '+i));
 const legal=m.legalParagraphs||[],impact=m.impactFindings||[];
 const textLegal=i=>get(legal,i,'нормативна преценка '+(i+1));
 const textImpact=i=>get(impact,i,'въздействие '+(i+1));
 if(k==='A'){
  put(p[22],spatial({...d,scenario:'А'},int));
  put(p[23],'Най-близко разположена защитена зона: '+locationSentence(m,{scenario:'А'})+'.');
  put(p[24],textLegal(0));put(p[25],textLegal(1));
  for(let i=0;i<5;i++)put(p[26+i],textImpact(i));
  put(p[31],safe(m.procedureFinding,'окончателна преценка на компетентния орган'));
 }else{
  put(p[22],textLegal(0));put(p[23],spatial({...d,scenario:'Б',zones:d.zones},int));
  put(p[24],locationSentence(m,{scenario:'Б'}));
  put(p[25],textLegal(1));put(p[26],textLegal(2));put(p[27],textLegal(3));
  for(let i=0;i<5;i++)put(p[28+i],textImpact(i));
  put(p[33],safe(m.procedureFinding,'окончателна преценка на компетентния орган'));
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
 if(['CHARACTERIZATION','LEGAL','PROCEDURE','IMPACTS'].some(k=>!ai[k]?.length))throw Error('КТ41: непълен AI авторски проект.');
 put(p[6],safe(m.recipient,'възложител'));put(p[7],safe(m.address,'адрес'));
 put(p[10],'Относно: Уведомление за инвестиционно предложение (ИП): „'+int.title+'“ в поземлени имоти с идентификатори '+int.ids+(int.loc?', '+int.loc:'')+'.');
 put(p[17],'Във връзка с внесеното уведомление в РИОСВ-Пловдив с '+int.ref+' за горецитираното инвестиционно предложение, на основание чл. 6а, т. 2 от Наредбата за ОС е изготвен настоящият експертен проект.');
 put(p[20],safe(ai.CHARACTERIZATION[0],'предмет на инвестиционното предложение'));
 put(p[21],safe(ai.CHARACTERIZATION.slice(1).join('\n\n')||draft.characterization.slice(1).join(' '),'инженерни характеристики'));
 put(p[23],spatial(draft,int));
 put(p[24],locationSentence(m,draft));
 put(p[25],safe(ai.LEGAL[0],'нормативен режим'));
 for(let i=0;i<3;i++)put(p[26+i],safe(ai.LEGAL[i+1]||m.legalParagraphs?.[i],'правно основание '+(i+1)));
 put(p[31],safe(ai.IMPACTS[0],'обобщена преценка на въздействията'));
 for(let i=0;i<5;i++)put(p[32+i],safe(ai.IMPACTS[i+1]||m.impactFindings?.[i],'въздействие '+(i+1)));
 put(p[38],safe(ai.PROCEDURE[0],'процедурна преценка'));
 put(p[39],safe(m.procedureFinding,'проект на заключение'));
 return finish(doc,'V27 R02');
}
root.V26TemplateWord=Object.freeze({make:classic,templatePaths:classicBase.templatePaths,layout:'KT41_EXACT_KT35_KT39'});
root.V26ExpertWord=Object.freeze({make:expert,layout:'KT41_EXACT_V27_R02'});
})(typeof window!=='undefined'?window:globalThis);
