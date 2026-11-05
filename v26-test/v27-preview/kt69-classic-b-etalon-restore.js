/* KT69 — Classic B paragraph-fidelity adapter.
 * Runs after the immutable KT50/KT42 Word source. Scenario A and Expert Word
 * are never modified. Uses the real, user-approved KT39-B DOCX for the five
 * impact-direction paragraphs and keeps the case-specific GIS/subject fields.
 * This is a DRAFT, not an administrative finding.
 */
(function(root){'use strict';
const original=root.V26TemplateWord;
if(!original?.make)throw Error('KT69: липсва оригиналният Word генератор.');
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const get=(el,name)=>Array.from(el.getElementsByTagNameNS(NS,name));
const paragraphs=doc=>Array.from(get(doc,'body')[0]?.children||[]).filter(el=>el.localName==='p');
const read=p=>get(p,'t').map(t=>t.textContent||'').join('');
function put(p,value){
 const ts=get(p,'t');if(!ts.length)throw Error('KT69: липсва текстов елемент в еталонен абзац.');
 ts[0].textContent=String(value);ts[0].setAttribute('xml:space','preserve');
 for(let i=1;i<ts.length;i++)ts[i].textContent='';
}
const clean=v=>String(v??'').trim();
const asZones=d=>(d?.zones||[]).map(z=>typeof z==='string'?z:String(z?.sitecode||z?.code||'')).filter(Boolean).join(', ');
async function docxBytes(blob){
 if(!root.fflate?.unzipSync||!root.fflate?.zipSync)throw Error('KT69: липсва заредена ZIP библиотека.');
 return root.fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
}
function parse(zip){
 const bytes=zip['word/document.xml'];if(!bytes)throw Error('KT69: DOCX няма word/document.xml.');
 const xml=new DOMParser().parseFromString(new TextDecoder().decode(bytes),'application/xml');
 if(xml.getElementsByTagName('parsererror').length)throw Error('KT69: невалиден Word XML.');
 return xml;
}
let etalonPromise=null;
async function getEtalon(){
 if(!etalonPromise)etalonPromise=(async()=>{
  const resp=await fetch('v27-preview/etalon/KT39-B.docx',{cache:'no-store'});
  if(!resp.ok)throw Error('KT69: липсва заключеният еталон KT39-B.');
  const zip=await docxBytes(await resp.blob());
  const ps=paragraphs(parse(zip));
  if(ps.length!==43)throw Error('KT69: еталонът KT39-B няма 43 абзаца.');
  return ps.slice(28,33).map(read);
 })().catch(error=>{etalonPromise=null;throw error});
 return etalonPromise;
}
async function classic(scenario,characterization,metadata,context){
 const generated=await original.make(scenario,characterization,metadata,context);
 if(scenario!=='Б'&&scenario!=='B')return generated;
 // Keep the explicitly approved historical specimen untouched.
 if(metadata?.approvedSpecimen===true)return generated;
 const zones=asZones(context?.determination);
 if(!zones)throw Error('KT69: Word Б изисква потвърдена пресичаща защитена зона.');
 const originalBullets=await getEtalon();
 const zip=await docxBytes(generated),xml=parse(zip),ps=paragraphs(xml);
 if(ps.length!==43)throw Error('KT69: Word Б трябва да съдържа 43 еталонни абзаца.');
 const ids=clean(metadata?.parcelIds);
 if(!ids)throw Error('KT69: липсват кадастралните идентификатори.');
 // In the model specimen p17 asserts a particular procedure; never transport
 // that unverified conclusion into a new dossier.
 put(ps[17],'Инвестиционното предложение се разглежда във връзка с чл. 2, ал. 2 от Наредбата за ОС. Приложимият ред и необходимите последващи действия се определят въз основа на представените документи и проверените обстоятелства по конкретната преписка.');
 // Preserve the substantive, dossier-specific legal findings at p22,25,26,
 // but restore the institutional subjects and normative anchors of KT39-B.
 const admissibility=read(ps[25]),environment=read(ps[26]);
 if(!/чл\.\s*12,\s*ал\.\s*2/.test(admissibility))
  put(ps[25],'При проверката за допустимост по чл. 12, ал. 2 от Наредбата за ОС се съобразява следното: '+admissibility);
 if(!/ЗООС/.test(environment))
  put(ps[26],'По отношение на Приложения № 1 и № 2 към Закона за опазване на околната среда (ЗООС) и процедурите по глава шеста: '+environment);
 // The exemplar's impact list is a set of assessment directions, not a claim
 // of absence of impacts. It can therefore be preserved literally.
 put(ps[27],'С оглед местоположението, характера на инвестиционното предложение и установеното пресичане със защитена зона '+zones+' възможните въздействия се разглеждат по отношение на:');
 originalBullets.forEach((text,i)=>put(ps[28+i],text));
 const procedure=read(ps[33]);
 const subject=clean(metadata?.subject).replace(/^Относно:\s*/i,'');
 const loc=clean(metadata?.location);
 put(ps[33],'В тази връзка и на основание чл. 2, ал. 2 от Наредбата за ОС преценката на компетентния орган за инвестиционно предложение „'+(subject||'неуточнен предмет')+'“ в ПИ '+ids+(loc?', '+loc:'')+' е следната: '+procedure);
 if(originalBullets.some((t,i)=>read(ps[28+i])!==t))throw Error('KT69: променена еталонна структура на въздействията.');
 if(!read(ps[23]).includes(ids.split(/[;,\s]+/)[0]))throw Error('KT69: липсва провереният имот в пространствения абзац.');
 zip['word/document.xml']=new TextEncoder().encode(new XMLSerializer().serializeToString(xml));
 return new Blob([root.fflate.zipSync(zip,{level:6})],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
root.V26TemplateWord=Object.freeze({...original,make:classic,layout:'KT69_CLASSIC_B_ETALON_PARAGRAPHS'});
})(typeof window!=='undefined'?window:globalThis);
