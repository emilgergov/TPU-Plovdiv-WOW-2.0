/* КТ81 V58.2 — административна редакция, без промяна на еталонните двигатели. */
(function(root){'use strict';
const boot=()=>{
const $=id=>document.getElementById(id),s=x=>String(x??'').replace(/\s+/gu,' ').trim(),low=x=>s(x).toLocaleLowerCase('bg');
const panel=document.querySelector('.kt80-stage-panel[data-panel="3"]'),fallback=$('kt80V580Fallback'),law=panel?.querySelector('.kt80-v580-legal'),old=$('kt81ContextScreen'),entry=panel?.querySelector('.kt80-parcel-intake'),confirm=$('kt80ParcelsConfirmation'),label=confirm?.closest('label');
if(!panel||!fallback||!law||!old||!entry||!confirm||!label)return;
const create=(tag,t,cls)=>{const e=document.createElement(tag);if(t!==undefined)e.textContent=t;if(cls)e.className=cls;return e};
panel.querySelector(':scope > h2')?.setAttribute('hidden','');
panel.querySelector(':scope > p')?.setAttribute('hidden','');
const title=create('h3','Местоположение на инвестиционното предложение');
const body=create('div',undefined,'kt82-location-results'),hint=create('p','', 'kt82-location-help');
const card=create('section',undefined,'kt82-location-card');card.append(title,body,hint);
const line=create('label','Допълнителни сведения за местоположението');line.htmlFor='kt82ExpertLocation';
const input=create('textarea',undefined,'kt82-location-input');input.id='kt82ExpertLocation';input.rows=2;input.maxLength=280;
input.placeholder='Напр. гр. Калофер, кв. 89, съществуващ ТП „Света“';
card.append(line,input,create('p','Незадължително уточнение от експерта. Не замества кадастрален идентификатор.','kt82-help'));
const archive=create('p','','kt82-archive-result');
const docs=create('details');docs.append(create('summary','Доказателствени откъси от преписката'));
const source=fallback.querySelector('.kt80-v580-evidence');if(source)docs.append(source);
card.append(docs);
fallback.before(card);
const identifiers=create('details',undefined,'kt82-identifiers');identifiers.append(create('summary','Въведи проверен кадастрален идентификатор'));
fallback.before(identifiers);identifiers.append(entry);
const cmds=fallback.querySelector('.kt80-v580-buttons');
if(cmds){
 const children=[...cmds.querySelectorAll('button')];
 if(children[0])children[0].hidden=true;
 if(children[1])children[1].hidden=true;
 if(children[2])children[2].textContent='Искане за предоставяне на допълнителна информация';
}
const oldConfirmation=s(label.textContent);
const contextConfirmation='Прегледах предложеното местоположение и доказателствените ограничения. Потвърждавам прегледа за правна квалификация, без да удостоверявам имотна геометрия.';
let index=null,indexPromise=null,epoch=0,reviewed=false;
function load(){
 if(index)return Promise.resolve(index);
 if(!indexPromise)indexPromise=fetch('context_gis/ekatte_212_archive_screen.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(v=>{if(v.schema!=='kt81-ekatte-archive-screen-v1'||v.entries?.length!==212||v.status!=='ARCHIVE_COMPLETE_GEOMETRIC_EXCLUSION_NOT_VERIFIED'||v.entries.some(x=>x.geometry_exclusion_proven!==false))throw Error('невалиден архив');index=v;return v}).catch(e=>{indexPromise=null;throw e});
 return indexPromise;
}
function legal(){
 const subject=s($('kt80SubjectText')?.value),scope=s($('kt80ScopeText')?.value),t=low(subject+' '+scope);
 const repair=/ремонт|подмяна|реконструкц/.test(t),power=/трафопост|трансформатор|електрическ|електрозахран|подстанци|електроразпредел/.test(t);
 const construction=/изграждане\s+на\s+нов|ново\s+строителство/.test(t);
 const typ=repair&&power?'ремонт и/или подмяна на съоръжения в съществуващ електроенергиен обект':construction?'ново строителство или нови съоръжения':repair?'ремонтни или реконструкционни дейности':'конкретната заявена дейност';
 const head='Работна процедурна хипотеза: '+(repair&&power?'проверка на необходимостта от процедура за ремонт на електроенергиен обект':construction?'преценка на приложимата процедура за новото строителство':'проверка на правния режим на заявената дейност');
 const basis='По предмета: '+(subject||'няма потвърден предмет').slice(0,210)+'. Разглежда се '+typ+'. '+(repair?'Не се приравнява автоматично на ново строителство. ':'')+'Проверяват се относимите хипотези на ЗООС, включително приложения №1 и №2 само ако дейността им съответства, и условията за оценка за съвместимост по ЗБР. Това не е окончателен процедурен извод.';
 const task='ГИС задача: действително местоположение на обекта, външни връзки/трасета и отношение към ЗЗ и ЗТ. При липсващи имоти — контекстна проверка с доказателствен статус.';
 const heading=law.querySelector('h3'),b=law.querySelector('.kt80-v580-basis'),q=law.querySelector('.kt80-v580-task');
 if(heading)heading.textContent=head;if(b)b.textContent=basis;if(q)q.textContent=task;
 const dlg=document.querySelector('.kt80-v580-dialog .kt80-v580-dialog-panel p');
 if(dlg)dlg.textContent=head+'. '+basis+' '+task;
 return {head,basis,task};
}
function nameRegex(name){
 return new RegExp('(?:^|[^а-я])(?:гр\\.|с\\.|град|село)\\s*'+name.replace(/[.*+?^$()|[\]{}\\]/g,'\\$&')+'(?=$|[^а-я])','giu');
}
function docsForScoring(){
 const a=[];
 for(const [id,weight,sourceName] of [['kt80SubjectText',16,'Потвърден предмет'],['kt80ScopeText',12,'Потвърден обхват']]){
  const text=s($(id)?.value);if(text)a.push({text,weight,sourceName});
 }
 if(s(input.value))a.push({text:s(input.value),weight:22,sourceName:'Експертно уточнение'});
 for(const x of root.KT80Stage3?.getResult?.()?.clues||[]){
  if(x.text)a.push({text:s(x.text),weight:4,sourceName:s(x.file)+(x.page?' · стр. '+x.page:'')});
 }
 return a;
}
function score(d){
 const docs=docsForScoring(),arr=[];
 for(const e of d.entries){
  const name=low(e.settlement).replace(/^(?:гр\.|с\.)\s*/,'').trim();if(name.length<3)continue;
  let points=0,site=false,proof=[];
  for(const doc of docs){
   const re=nameRegex(name),text=low(doc.text);let match,k=0;
   while((match=re.exec(text))&&k++<5){
    const near=text.slice(Math.max(0,match.index-95),Math.min(text.length,match.index+145));
    const good=/трафопост|\bтп\b|обект|съоръжен|площадк|\bупи\b|\bкв\.\s*\d+|ремонт|местополож/.test(near);
    const bad=/адрес|риосв|подател|възложител|контакт|кореспонденц|област\s+пловдив/.test(near);
    const val=doc.weight+(good?4:0)-(bad?10:0);
    if(good)site=true;
    if(val>0){points+=val;proof.push({source:doc.sourceName,snippet:doc.text.slice(Math.max(0,match.index-45),match.index+135),val})}
   }
  }
  if(points>0)arr.push({e,points,site,proof});
 }
 return arr.sort((a,b)=>b.points-a.points||a.e.ekatte.localeCompare(b.e.ekatte));
}
function add(text,bold=false){
 const e=create('p',text);if(bold)e.classList.add('kt82-lead');body.append(e);return e;
}
function render(d){
 if(fallback.hidden)return;
 const ranks=score(d),top=ranks[0],second=ranks[1],secure=top&&(top.site||s(input.value))&&(!second||top.points>=second.points+7);
 body.replaceChildren();
 if(secure){
  add('Водещо предложение: '+top.e.settlement+' · община '+top.e.municipality+' · ЕКАТТЕ '+top.e.ekatte,true);
  const strongest=[...top.proof].sort((a,b)=>b.val-a.val)[0];
  if(strongest)add('Източник: '+strongest.source+' · „'+strongest.snippet.slice(0,170)+'“');
  if(second)add('Допълнително споменато: '+second.e.settlement+' — да се разграничат адресите за кореспонденция от местоположението на обекта.');
  hint.textContent='Предложението подлежи на експертно потвърждение. Няма удостоверена индивидуална имотна геометрия.';
  root.KT82Location=Object.freeze({ekatte:top.e.ekatte,settlement:top.e.settlement,source:strongest?.source||'',expertReviewed:reviewed,geometryVerified:false});
 }else{
  add(top?'Местоположението не е еднозначно. Ориентири: '+ranks.slice(0,3).map(x=>x.e.settlement).join('; '):'Местоположението не е установено.',true);
  hint.textContent='Предложение: кратко експертно уточнение на обекта или искане за допълнителна информация, когато липсата е съществена.';
  root.KT82Location=Object.freeze({status:'CONTEXT_UNRESOLVED',expertReviewed:reviewed,geometryVerified:false});
 }
 if(top){
  const e=top.e;
  archive.textContent='ПИ MASTER · '+e.settlement+': '+e.parcels.toLocaleString('bg-BG')+' имота · ЗЗ: '+e.zz_pairs+' архивни положителни двойки · ЗТ: '+e.zt_pairs+'. '+(e.zz_pairs||e.zt_pairs?'Наличието на пресичания за други имоти не доказва пресичане с обекта.':'Липсата на архивни пресичания не доказва пространствено непресичане.')+' Необходим е контрол с официални геометрии.';
 }else archive.textContent='Контекстният пространствен статус остава неопределен. Няма данни за категоричен извод.';
}
async function refresh(){
 if(fallback.hidden)return;
 const token=++epoch;body.replaceChildren(create('p','Проверяват се данните по ЕКАТТЕ…'));
 try{const d=await load();if(token===epoch&&!fallback.hidden)render(d)}
 catch(e){if(token===epoch){body.replaceChildren(create('p','Няма достъп до проверения контекстен архив.'));hint.textContent='Предложение: проверен имот или искане за допълнителна информация.'}}
}
function setMode(){
 if(panel.hidden)return;
 legal();
 const isContext=!fallback.hidden;
 card.hidden=!isContext;identifiers.hidden=!isContext;old.hidden=isContext;archive.hidden=!isContext;
 label.classList.toggle('kt82-context-confirm',isContext);
 label.classList.toggle('kt80-alert-confirm',!isContext);
 const desired=isContext?contextConfirmation:oldConfirmation;
 if(s(label.textContent)!==desired){const node=label.querySelector('input')||confirm;label.replaceChildren(node,document.createTextNode(' '+desired));}
 if(isContext){
  const h=fallback.querySelector(':scope > h3');if(h)h.hidden=true;
  const n=fallback.querySelector('.kt80-v580-fallback-note');if(n)n.hidden=true;
  const list=fallback.querySelector('.kt80-v580-evidence');if(list)list.hidden=false;
  refresh();
 }
}
input.addEventListener('input',()=>{reviewed=false;confirm.checked=false;refresh()});
confirm.addEventListener('change',()=>{reviewed=confirm.checked;if(root.KT82Location)root.KT82Location=Object.freeze({...root.KT82Location,expertReviewed:reviewed})});
document.addEventListener('kt80:stage-open',e=>{if(e.detail?.step===3)setTimeout(setMode,0)});
document.addEventListener('kt80:location-gap',()=>setTimeout(setMode,0));
document.addEventListener('kt80:case-reset',()=>{epoch++;input.value='';reviewed=false;root.KT82Location=null});
$('kt80ParcelInput')?.addEventListener('input',()=>setTimeout(setMode,0));
const btn=fallback.querySelector('.kt80-v580-buttons button:nth-child(2)');
if(btn)btn.addEventListener('click',()=>{identifiers.open=true},true);
root.KT82UI=Object.freeze({refresh,setMode,legal,getLocation:()=>root.KT82Location||null});
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})(window);