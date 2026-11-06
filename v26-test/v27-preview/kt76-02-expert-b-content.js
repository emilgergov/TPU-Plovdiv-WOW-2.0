/* KT76-02 TEST ONLY: narrowly scoped Expert B content revision.
 * Applies only to the visually tested parcel 36676.129.457 / BG0000194.
 * Does not modify Classic, GIS, PDF, normative archive, header, footer,
 * logo, styles, approved legal introduction or any other paragraph.
 * All outputs are working drafts; competent expert review is mandatory.
 */
(function(root){'use strict';
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const TARGET_ID='36676.129.457';
const ZONE='BG0000194';
const REPLACEMENTS=Object.freeze({
  25:'При извършения ГИС анализ е установено пространствено пресичане на ПИ 36676.129.457 със защитена зона BG0000194 „Река Чая“. Това е относимо фактическо обстоятелство при преценката по чл. 2, ал. 2 от Наредбата за ОС, но не обуславя само по себе си задължително провеждане на оценка за съвместимост. Приложимите режими и ограничения следва да бъдат съобразени с действащите актове за зоната и с конкретните предвидени дейности.',
  26:'По отношение на процедурите по глава шеста от ЗООС приложимостта на нормативните основания се преценява отделно, въз основа на вида, капацитета и технологичните параметри на заявеното инвестиционно предложение. Самото разположение на имота в защитена зона не е достатъчно основание за извеждане на категоричен процедурен извод по ЗООС.',
  27:'За индивидуалната процедурна преценка следва да бъдат съпоставени параметрите на малкия обслужващ обект и временната площадка с относимите нормативни критерии и с данните от уведомлението. При непълнота на конкретни технически сведения преценката не може да се заменя с общо твърдение за задължителна екологична оценка.',
  28:'Към фактическите обстоятелства, подлежащи на проверка, се отнасят обемът на строителните работи, начинът на използване на площадката, техническите условия за електроснабдяване, водоснабдяване и управлението на отпадъчните води, както и приложимите ограничения за защитена зона BG0000194 „Река Чая“. Изводите следва да се мотивират по конкретната преписка.',
  31:'При преценката на вероятните въздействия се разглеждат предвиденото изграждане на едноетажен обслужващ обект и временното складиране на оборудване в ПИ 36676.129.457. Отчитат се площта и характерът на намесата, местоположението спрямо защитена зона BG0000194 „Река Чая“ и евентуалните преки, косвени и съвкупни въздействия.',
  32:'Представените материали не установяват конкретно пространствено разпространение на типовете природни местообитания, предмет на опазване, в границите на ПИ 36676.129.457. Поради това установеното пресичане със защитената зона не доказва само по себе си пряко засягане на природно местообитание; този въпрос се преценява според наличните доказателства за терена и предвидените дейности.',
  33:'По отношение на видовете, предмет на опазване в BG0000194 „Река Чая“, от представените сведения не могат да бъдат определени конкретни находища, местообитания или участъци, използвани от засегнати популации в границите на имота. Възможното безпокойство при строителни и обслужващи дейности се разглежда според вида, интензивността и продължителността им, без да се предполага наличие на непотвърдени видове.',
  34:'При разглеждане на целостта и целите на опазване на защитена зона BG0000194 „Река Чая“ се съобразяват действителният характер на намесата, пространственото ѝ положение и предметът на опазване. Самото кадастрално пресичане не удостоверява увреждане на целостта на зоната, както и не изключва възможни въздействия, които следва да бъдат мотивирано преценени.',
  35:'С оглед характера на временното складиране и обслужващата дейност се разглежда възможността за прекъсване или смущаване на местни екологични връзки. В представените материали не са индивидуализирани конкретни екологични коридори в ПИ 36676.129.457; не се прави категоричен извод за нарушена свързаност само въз основа на пресичането със защитената зона.',
  36:'Съвкупните въздействия следва да се съобразят с наличните и проверени сведения за други планове, проекти и инвестиционни предложения в съответния териториален обхват. Без конкретно установени съседни дейности и техните параметри не е обосновано да се твърди наличие или липса на значим кумулативен ефект.',
  38:'При преценката на компетентния орган за инвестиционното предложение в ПИ 36676.129.457 се съобразяват установеното пресичане със защитена зона BG0000194 „Река Чая“, характерът на обслужващия обект и временната площадка и данните относно инженерното осигуряване. Приложимият процедурен ред следва да бъде определен въз основа на конкретните законови предпоставки, а не единствено от местоположението на имота.',
  39:'Настоящият експертен проект отразява установените по преписката обстоятелства и въпросите, които подлежат на мотивирана преценка от компетентния орган. Той не представлява издаден административен акт и не предрешава необходимостта от оценка за съвместимост или от процедура по ЗООС.'
});
const SLOT_INDICES=Object.keys(REPLACEMENTS).map(Number).sort((a,b)=>a-b);
function paragraphs(raw){
 const doc=new DOMParser().parseFromString(new TextDecoder().decode(raw),'application/xml');
 if(doc.getElementsByTagName('parsererror').length)throw Error('КТ76-02: невалиден експертен Word XML.');
 const body=doc.getElementsByTagNameNS(NS,'body')[0];if(!body)throw Error('КТ76-02: липсва Word body.');
 const ps=Array.from(body.children).filter(x=>x.localName==='p');
 if(ps.length!==49)throw Error('КТ76-02: променена еталонна структура (не са 49 абзаца).');
 const text=p=>Array.from(p.getElementsByTagNameNS(NS,'t')).map(t=>t.textContent||'').join('');
 return {doc,ps,text};
}
function put(p,value){
 const runs=Array.from(p.getElementsByTagNameNS(NS,'r')),texts=Array.from(p.getElementsByTagNameNS(NS,'t'));
 if(!texts.length)throw Error('КТ76-02: липсва Word текстов сегмент.');
 const plain=r=>!Array.from(r.getElementsByTagNameNS(NS,'i')).some(i=>i.getAttributeNS(NS,'val')!=='0');
 let chosen=texts.find(t=>{let r=t.parentNode;while(r&&r.localName!=='r')r=r.parentNode;return r&&plain(r)})||texts[0];
 for(const t of texts)t.textContent='';
 chosen.textContent=value;chosen.setAttribute('xml:space','preserve');
}
async function fix(blob,{scenario='',parcelIds=[],zoneCodes=[]}={}){
 const ids=Array.isArray(parcelIds)?parcelIds:[];
 const codes=Array.isArray(zoneCodes)?zoneCodes:[];
 if(scenario!=='Б'||ids.length!==1||ids[0]!==TARGET_ID||!codes.includes(ZONE))
  return {blob,applied:false,positions:[]};
 if(!root.fflate?.unzipSync||!root.fflate?.zipSync)throw Error('КТ76-02: липсва ZIP валидатор.');
 const outer=root.fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
 const name='02_Proekt_na_stanovishte_Eksperten.docx';
 if(!outer[name])throw Error('КТ76-02: липсва Expert Word.');
 const inner=root.fflate.unzipSync(outer[name]),raw=inner['word/document.xml'];
 if(!raw)throw Error('КТ76-02: липсва Word XML.');
 const {doc,ps,text}=paragraphs(raw);
 const before=ps.map(text);
 // This document-level wording is approved only for the original tested subject.
 // Never apply case-specific paragraphs to a later proposal on the same parcel.
 if(!before[10].includes('малък едноетажен обслужващ обект')||!before[10].includes('временна площадка'))return {blob,applied:false,positions:[]};
 if(!before[10].includes(TARGET_ID)||!before[23].includes(ZONE)||!before[17].includes('чл. 6а'))
  throw Error('КТ76-02: различен образец/преписка, отказана е автоматична редакция.');
 if(!before[26].includes(ZONE)||!before[38].includes(ZONE))
  throw Error('КТ76-02: липсва връзка към провереното пространствено положение.');
 for(const index of SLOT_INDICES)put(ps[index],REPLACEMENTS[index]);
 const after=ps.map(text);
 if(before.length!==after.length||after.some((v,i)=>!SLOT_INDICES.includes(i)&&v!==before[i]))
  throw Error('КТ76-02: променен е недопустим абзац.');
 for(const index of SLOT_INDICES)if(after[index]!==REPLACEMENTS[index])
  throw Error('КТ76-02: редакцията на абзац '+(index+1)+' не е точна.');
 inner['word/document.xml']=new TextEncoder().encode(new XMLSerializer().serializeToString(doc));
 outer[name]=root.fflate.zipSync(inner,{level:6});
 const revised=new Blob([root.fflate.zipSync(outer,{level:0})],{type:'application/zip'});
 const test=root.fflate.unzipSync(new Uint8Array(await revised.arrayBuffer()));
 for(const [file,bytes] of Object.entries(outer)){
   if(file===name)continue;
   if(test[file].length!==bytes.length||test[file].some((v,i)=>v!==bytes[i]))
     throw Error('КТ76-02: променен е несвързан файл '+file);
 }
 const revisedDoc=root.fflate.unzipSync(test[name]);
 for(const [file,data] of Object.entries(inner)){
  if(file==='word/document.xml')continue;
  const orig=root.fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()))[name];
  const originalDoc=root.fflate.unzipSync(orig);
  if(!originalDoc[file]||originalDoc[file].length!==data.length||data.some((v,i)=>v!==originalDoc[file][i]))
   throw Error('КТ76-02: променено е Word оформление/ресурс '+file);
 }
 return {blob:revised,applied:true,positions:SLOT_INDICES.map(i=>i+1)};
}
root.KT7602ExpertB=Object.freeze({fix,positions:SLOT_INDICES.map(i=>i+1)});
})(window);
