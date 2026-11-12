/* КТ80/81 V58.1 — архивен контекстен предфилтър по ЕКАТТЕ.
   КАТЕГОРИЧНО НЯМА ПРЕСИЧАНЕ може да се издаде само след отделна геометрична проверка.
   Отсъствието на архивен положителен запис е само ориентир. */
(function(root){'use strict';
const $=id=>document.getElementById(id),panel=$('kt80V580Fallback');
if(!panel)return;
let dataset=null,promise=null,epoch=0;
const create=(name,content,cls)=>{const e=document.createElement(name);if(cls)e.className=cls;if(content!==undefined)e.textContent=content;return e};
const section=create('section',undefined,'kt81-context-screen');
section.id='kt81ContextScreen';section.setAttribute('aria-live','polite');
const heading=create('strong','КОНТЕКСТНА ПРОСТРАНСТВЕНА ПРОВЕРКА');
const output=create('div');
section.append(heading,output);
const buttons=panel.querySelector('.kt80-v580-buttons');
if(buttons)buttons.before(section);else panel.append(section);
const path='context_gis/ekatte_212_archive_screen.json';
function load(){
 if(dataset)return Promise.resolve(dataset);
 if(!promise)promise=fetch(path,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(d=>{
  if(d.schema!=='kt81-ekatte-archive-screen-v1'||d.status!=='ARCHIVE_COMPLETE_GEOMETRIC_EXCLUSION_NOT_VERIFIED'||d.counts?.ekatte!==212||d.counts?.parcels!==917417||d.entries?.length!==212||d.entries.some(x=>x.geometry_exclusion_proven!==false))throw Error('непотвърден архивен индекс');
  dataset=d;return d;
 }).catch(e=>{promise=null;throw e});
 return promise;
}
const norm=s=>String(s||'').normalize('NFKC').toLocaleLowerCase('bg').replace(/[„“"'’]/g,'').replace(/\s+/g,' ').trim();
function candidates(d){
 const result=root.KT80Stage3?.getResult?.();
 const clues=(result?.clues||[]).map(x=>x.text||'');
 const subject=$('kt80SubjectText')?.value||'',scope=$('kt80ScopeText')?.value||'';
 const source=norm([subject,scope,...clues].join(' · '));
 const found=[];
 for(const e of d.entries){
  const label=norm(e.settlement);const name=label.replace(/^(?:с\.|гр\.)\s*/,'').trim();
  const exactCode=new RegExp('(^|[^0-9])'+e.ekatte+'([^0-9]|$)').test(source);
  const named=new RegExp('(^|[^а-я])(?:гр\\.|с\\.|град|село)\\s*'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?=$|[^а-я])','iu').test(source);
  if(exactCode||named)found.push({entry:e,matchedBy:exactCode?'ЕКАТТЕ':'населено място'});
 }
 return found;
}
function add(text,strong=false){
 const el=create('p',text);if(strong)el.style.fontWeight='700';output.append(el);return el;
}
function render(d){
 if(panel.hidden)return;
 output.replaceChildren();
 const found=candidates(d);
 if(found.length===1){
  const e=found[0].entry;
  add(e.settlement+' · ЕКАТТЕ '+e.ekatte+' · община '+e.municipality+'.',true);
  add('Проверен архив: '+e.parcels.toLocaleString('bg-BG')+' имота; ЗЗ: '+e.zz_pairs+' положителни записа; ЗТ: '+e.zt_pairs+' положителни записа.');
  if(e.overlap_class==='NO_RECORDED_PARCEL_OVERLAP_NOT_PROOF'){
   add('ПРЕДВАРИТЕЛЕН АРХИВЕН СИГНАЛ: няма положителни имотни пресичания в тази кадастрална група. Това НЕ доказва, че строителните граници или цялото землище са извън ЗЗ и ЗТ.');
   add('Предложение: проверка с официална геометрия на действителния териториален обхват. Едва след това може да се направи констатация за пространствено непресичане.');
  }else{
   add('ИМА архивни пресичания някъде в кадастралната група. Това не доказва пресичане с конкретния обект.');
   add('Предложение: уточняване на местоположението, контекстна геометрична проверка или резултат №2 при съществена липса.');
  }
  root.KT81ContextResult=Object.freeze({ekatte:e.ekatte,settlement:e.settlement,municipality:e.municipality,archiveStatus:e.overlap_class,geometryExclusionProven:false,parcelVerified:false});
 }else if(found.length>1){
  add('Разпознати са '+found.length+' възможни административни местоположения. Не е избрано автоматично нито едно.');
  for(const f of found.slice(0,6))add('· '+f.entry.settlement+' · '+f.entry.ekatte+' · '+f.entry.municipality);
  add('Предложение: експертът уточнява кое местоположение е относимо към инвестиционното предложение.');
  root.KT81ContextResult=Object.freeze({status:'AMBIGUOUS',geometryExclusionProven:false});
 }else{
  add('Не е установена еднозначна връзка с ЕКАТТЕ от прочетеното местоположение.');
  add('Предложение: уточнете населеното място/ЕКАТТЕ или използвайте резултат №2 за необходимите сведения.');
  root.KT81ContextResult=Object.freeze({status:'UNRESOLVED',geometryExclusionProven:false});
 }
 add('Източник: ПИ MASTER · 67 проверени части · 212 ЕКАТТЕ. Проверена геометрия на землище/строителни граници: НЯМА. Категорично „НЕ ПРЕСИЧА“: НЕ СЕ ИЗДАВА.');
}
async function update(){
 const token=++epoch;if(panel.hidden)return;
 output.replaceChildren(create('p','Проверяват се архивните административни и пространствени записи…'));
 try{const d=await load();if(token!==epoch||panel.hidden)return;render(d)}
 catch(e){if(token!==epoch)return;output.replaceChildren();add('Контекстният индекс временно не е достъпен: '+String(e.message||e)+'.');add('Предложение: въведете проверен имот или подгответе конкретно искане за уточняване на местоположението.')}
}
document.addEventListener('kt80:location-gap',update);
document.addEventListener('kt80:case-reset',()=>{epoch++;root.KT81ContextResult=null;output.replaceChildren()});
root.KT81ContextScreen=Object.freeze({refresh:update,getResult:()=>root.KT81ContextResult||null});
})(window);