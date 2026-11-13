/* КТ82-11 V59.3 — административна редакция, без промяна на еталонните двигатели. */
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
card.append(archive,docs);
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
 const documents=docsForScoring();
 // Без измислени факти: допълнително прочетените страници се използват
 // с ниска доказателствена тежест, само с изричен източник.
 for(const page of (root.KT80WorkflowState?.intake?.page_text_index||[]).slice(0,45)){
  const v=s(page?.text);
  if(v)documents.push({text:v.slice(0,4500),weight:3,sourceName:'Преписка · '+s(page.file||'документ')+(page.page?' · стр. '+page.page:'')});
 }
 const result=root.KT82LocationRoles?.rank?.(d.entries,documents);
 return result||{ranked:[],leading:null,ambiguous:true,reason:'Няма достъп до оценката на ролите.'};
}
function add(text,bold=false){
 const e=create('p',text);if(bold)e.classList.add('kt82-lead');body.append(e);return e;
}
const choice=create('select');choice.id='kt82LocationChoice593';choice.setAttribute('aria-label','Водещо местоположение на обекта');
const choiceLabel=create('label','Водещо местоположение · експертна корекция');
choiceLabel.htmlFor='kt82LocationChoice593';
card.insertBefore(choiceLabel,archive);card.insertBefore(choice,archive);
let manualChoice='',lastRoleResults=null;
function render(d){
 if(fallback.hidden)return;
 const result=score(d),ranks=result.ranked,top=result.leading;
 lastRoleResults=result;
 const previous=choice.value;
 choice.replaceChildren();
 const blank=create('option','Няма потвърдено водещо местоположение');blank.value='';choice.append(blank);
 for(const a of ranks.slice(0,9)){
  const option=create('option',a.entry.settlement+' · община '+a.entry.municipality+' · ЕКАТТЕ '+a.entry.ekatte);
  option.value=a.entry.ekatte;choice.append(option);
 }
 const picked=manualChoice?ranks.find(x=>x.entry.ekatte===manualChoice):top;
 const safe=!!picked&&(manualChoice||!!top);
 choice.value=safe?picked.entry.ekatte:'';
 if(!manualChoice&&picked&&choice.value!==picked.entry.ekatte)choice.value='';
 body.replaceChildren();
 if(picked&&safe){
  add((manualChoice?'Експертно избран кандидат: ':'Водещо предложение: ')+picked.entry.settlement+' · община '+picked.entry.municipality+' · ЕКАТТЕ '+picked.entry.ekatte,true);
  const proof=[...picked.hits].sort((a,b)=>b.points-a.points)[0];
  if(proof)add('Връзка с обекта: '+proof.role+' · '+proof.source+' · „'+proof.excerpt.slice(0,175)+'“');
  hint.textContent='Предложението подлежи на експертно потвърждение. Индивидуална имотна геометрия не е удостоверена.';
  root.KT82Location=Object.freeze({ekatte:picked.entry.ekatte,settlement:picked.entry.settlement,
   municipality:picked.entry.municipality,source:proof?.source||'',expertReviewed:reviewed,
   geometryVerified:false,selection:manualChoice?'EXPERT_CHOICE':'EVIDENCE_PROPOSAL',
   evidenceRoles:picked.hits.map(x=>({role:x.role,source:x.source,excerpt:x.excerpt}))});
 }else{
  add(result.reason,true);
  hint.textContent='Предложение: уточнете местоположението или посочете водещия кандидат след преглед на документните откъси.';
  root.KT82Location=Object.freeze({status:'CONTEXT_UNRESOLVED',expertReviewed:false,geometryVerified:false});
 }
 for(const a of ranks.slice(0,4)){
  const excerpt=[...a.hits].sort((x,y)=>y.points-x.points)[0];
  if(excerpt)add('Кандидат: '+a.entry.settlement+' · роля: '+(excerpt?.role||'КОНТЕКСТ')+
   ' · източник: '+(excerpt?.source||'неустановен')+' · „'+(excerpt?.excerpt||'').slice(0,150)+'“');
 }
 archive.textContent=picked&&safe?
  'Архивна статистика САМО за кандидат-местоположението '+picked.entry.settlement+': '+picked.entry.parcels.toLocaleString('bg-BG')+
  ' имота · ЗЗ: '+picked.entry.zz_pairs+' положителни двойки · ЗТ: '+picked.entry.zt_pairs+
  '. НЕ е пространствен резултат за конкретния обект и не доказва попадане или непопадане.':
  'Няма потвърдено водещо местоположение. Архивните статистики на отделните населени места не удостоверяват положението на обекта.';
 root.KT82SpatialEvidence?.refresh?.();
}
choice.addEventListener('change',()=>{
 manualChoice=choice.value;
 reviewed=false;confirm.checked=false;
 if(index&&!fallback.hidden)render(index);
});
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
 card.hidden=!isContext;identifiers.hidden=false;old.hidden=isContext;archive.hidden=!isContext;
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
input.addEventListener('input',()=>{reviewed=false;confirm.checked=false;manualChoice='';refresh()});
confirm.addEventListener('change',()=>{reviewed=confirm.checked;if(root.KT82Location)root.KT82Location=Object.freeze({...root.KT82Location,expertReviewed:reviewed})});
document.addEventListener('kt80:stage-open',e=>{if(e.detail?.step===3)setTimeout(setMode,0)});
document.addEventListener('kt80:location-gap',()=>setTimeout(setMode,0));
document.addEventListener('kt80:case-reset',()=>{epoch++;input.value='';manualChoice='';lastRoleResults=null;choice.value='';reviewed=false;root.KT82Location=null});
$('kt80ParcelInput')?.addEventListener('input',()=>setTimeout(setMode,0));
const btn=fallback.querySelector('.kt80-v580-buttons button:nth-child(2)');
if(btn)btn.addEventListener('click',()=>{identifiers.open=true},true);
root.KT82UI=Object.freeze({refresh,setMode,legal,getLocation:()=>root.KT82Location||null});
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})(window);