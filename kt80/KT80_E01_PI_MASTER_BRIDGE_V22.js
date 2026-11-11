/* KT80 V20 — independent validated PI MASTER alongside full GIS map.
 * Read-only profiles from KT77 verified 67-part PI MASTER index.
 * No inferred intersection or legal conclusions if source is unavailable. */
(function(root){'use strict';
const $=id=>document.getElementById(id);
let epoch=0,master=null,ready=null;
let latest=null;
const base='../v26-test/gis-data/pi-master/browser-index/';
const clean=v=>v===null||v===undefined||v===''?'НЯМА ДАННИ':String(v);
function status(t){const el=$('kt80PIMasterStatus');if(el)el.textContent=t}
function line(parent,title,value){const p=document.createElement('p');const label=document.createElement('strong');label.textContent=title+': ';const v=document.createElement('span');v.textContent=clean(value);p.append(label,v);parent.append(p)}
function field(obj,names){for(const k of names)if(obj?.[k]!==undefined&&obj?.[k]!==null&&obj?.[k]!=='')return obj[k];return null}
function render(ids,items){
 const host=$('kt80PIMasterResults');if(!host)return;host.replaceChildren();
 for(let i=0;i<ids.length;i++){
  const id=ids[i],info=items[i],card=document.createElement('section');card.className='kt80-pi-card';
  const title=document.createElement('h4');title.textContent='ПИ '+id;card.append(title);
  card.dataset.parcelId=id;
  if(ids.length>1){card.classList.toggle('kt80-pi-secondary',i>0);card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label','Покажи пространствените данни за ПИ '+id);card.addEventListener('click',()=>root.KT80FreeGIS?.selectParcel?.(id));card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();root.KT80FreeGIS?.selectParcel?.(id)}})}
  if(!info||info.status!=='FOUND'||!info.profile){
   line(card,'ПИ MASTER',info?.status==='NOT_IN_VALIDATED_CADASTRE'?'Няма запис в проверения индекс':'НЯМА ДАННИ');
   line(card,'Пространствен статус','Не е определен от ПИ MASTER');host.append(card);continue;
  }
  const r=info.profile;
  line(card,'ЕКАТТЕ',root.KT80Display.ekatte(id,r));
  line(card,'Населено място',field(r,['settlement','settlement_name','naseleno_myasto']));
  line(card,'Община',field(r,['municipality','obshtina']));
  line(card,'Област',field(r,['province','region','oblast']));
  line(card,'Местност',root.KT80Display.locality(field(r,['locality','mestnost'])));
  line(card,'Площ на имота (кв. м)',root.KT80Display.area(field(r,['area_m2','area_m2_source','parcel_area_m2','area'])));
  const zz=Array.isArray(r.zz)?r.zz:[],zt=Array.isArray(r.zt)?r.zt:[];
  const hz=document.createElement('div');hz.className='kt80-pi-zones';
  const a=document.createElement('strong');a.textContent='ЗЗ (ЗБР) · '+zz.length+' архивни записа';hz.append(a);
  if(!zz.length)line(hz,'ЗЗ','Няма запис в проверения индекс; необходим е отделен ГИС контрол');
  for(const x of zz){
   const p=document.createElement('p');
   p.textContent=clean(field(x,['sitecode','code']))+' · '+clean(field(x,['name_bg','name']))+' · пресечена площ: '+root.KT80Display.area(field(x,['intersect_m2','area_m2']))+' кв. м';
   hz.append(p);
  }
  const t=document.createElement('strong');t.textContent='ЗТ (ЗЗТ) · '+zt.length+' архивни записа';hz.append(t);
  if(!zt.length)line(hz,'ЗТ','Няма запис в проверения индекс; необходим е отделен ГИС контрол');
  for(const x of zt){
   const p=document.createElement('p');p.textContent=clean(field(x,['name_bg','name']))+' · '+clean(field(x,['category','category_bg']))+' · пресечена площ: '+clean(field(x,['intersect_m2','area_m2']))+' кв. м';hz.append(p);
  }
  card.append(hz);
  line(card,'Проверка','ПИ MASTER · валидиран архив; текуща геометрия и правен режим се удостоверяват отделно');
  host.append(card);
 }
}
async function index(){
 if(!master){if(!root.KT77PiMasterIndex?.create)throw Error('Модулът ПИ MASTER не е зареден.');master=root.KT77PiMasterIndex.create(base)}
 return ready||(ready=master.init().catch(e=>{ready=null;throw e}));
}
async function find(ids,run){
 status('Зареждаме ПИ MASTER за '+ids.length+' имота…');
 try{
  await index();
  if(run!==epoch)return;
  const items=[];
  for(const id of ids){
   const result=await master.lookup(id);
   if(run!==epoch)return;
   items.push(result);
  }
  latest={ids:[...ids],items};render(ids,items);
  status('ПИ MASTER: проверени '+ids.length+' имотни идентификатора. Архивните ЗЗ/ЗТ се сверяват с ГИС анализа.');
 }catch(e){
  if(run!==epoch)return;
  $('kt80PIMasterResults')?.replaceChildren();
  status('ПИ MASTER не можа да зареди проверените данни: '+String(e?.message||e)+'. Това НЕ означава, че имотът или защитената зона липсва.');
 }
}
function selectParcel(id){
 const host=$('kt80PIMasterResults');if(!host)return;
 const cards=[...host.querySelectorAll('.kt80-pi-card')];
 for(const c of cards){
  const active=c.dataset.parcelId===id;
  c.classList.toggle('kt80-pi-active',active);
  if(cards.length>1)c.classList.toggle('kt80-pi-secondary',!active);
 }
}
document.addEventListener('kt80:parcel-selected',e=>selectParcel(String(e.detail?.id||'')));
function reset(){epoch++;latest=null;$('kt80PIMasterResults')?.replaceChildren();status('ПИ MASTER: въведете имоти и натиснете „Намери имотите“.')}
function init(){
 if(!$('kt80PIMasterResults'))return;
 $('kt80FindParcels')?.addEventListener('click',()=>{
  const data=root.V26ParcelEditor?.normalize($('kt80ParcelInput')?.value||'');
  if(!data||data.invalid?.length||data.uncertain?.length||!data.ids?.length||data.ids.length>100){reset();return}
  const generation=++epoch;void find([...data.ids],generation);
 });
 $('kt80ParcelInput')?.addEventListener('input',reset);
 document.addEventListener('kt80:case-reset',reset);
 root.KT80PIMaster=Object.freeze({reset,getResult:()=>latest,findIds:ids=>{const gen=++epoch;return find(ids,gen)}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);