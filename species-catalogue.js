/* WOW 2.0 species catalogue adapter. Reads local, versioned stories only.
   Never assigns a species to a Natura zone without an authoritative zone-species link. */
(()=>{'use strict';
let root=null;
// Hide the legacy unfiltered 792-item view while the authoritative zone catalogue is active.
const css=document.createElement('style');css.id='wow-zone-species-visibility';css.textContent='#wowUnifiedContent.wow-species-adapter-active > :not(#wowSpeciesCatalogue){display:none!important}';document.head.appendChild(css);
// Injected by the outer shell: it may execute before the unified app is ready.
// Never permanently exit on a transient startup race.
let stories=null,loading=null,active='';
let zoneMap=null,zoneLoading=null;let renderedContext='';
function notifyDetail(open){try{window.parent.postMessage({type:'WOW_SPECIES_DETAIL',open:!!open},window.location.origin)}catch(_){}}

function loadZones(){if(zoneMap)return Promise.resolve(zoneMap);if(!zoneLoading)zoneLoading=fetch('data/zone-species-map.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('zone map unavailable');return r.json()}).then(m=>{if(Object.keys(m).length!==32)throw Error('invalid zone map');return zoneMap=m}).catch(e=>{zoneLoading=null;throw e});return zoneLoading;}
async function load(){
 if(stories)return stories;
 if(!loading)loading=fetch('data/species-stories-792.json',{cache:'no-store'}).then(async r=>{
  if(!r.ok)throw Error('HTTP '+r.status);
  const data=await r.json();
  if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).length!==792)throw Error('Очакват се точно 792 вида');
  for(const [name,text] of Object.entries(data))if(!name.trim()||typeof text!=='string'||!text.trim())throw Error('Празен видов разказ');
  stories=data;return data;
 }).catch(e=>{loading=null;throw e});
 return loading;
}
function node(tag,txt){const e=document.createElement(tag);if(txt!==undefined)e.textContent=txt;return e}
function draw(){
 const ctx=window.WOWUnified.context();
 root=document.getElementById('wowUnifiedContent');if(!root)return;
 root.classList.toggle('wow-species-adapter-active',!!ctx&&ctx.view==='species');
 if(!ctx||ctx.view!=='species'){
  root.querySelector('#wowSpeciesCatalogue')?.remove();renderedContext='';return;
 }
 const target=root.querySelector('#wowSpeciesCatalogue');
 const contextKey=ctx.view+'|'+(ctx.zoneCode||'');
 if(target&&renderedContext===contextKey)return;
 if(target)target.remove();renderedContext=contextKey;
 const pane=node('section');pane.id='wowSpeciesCatalogue';pane.style.cssText='margin:18px 0;padding:16px;border:1px solid #b4cbb7;border-radius:14px;background:#f6fbf5;color:#173821';
 const zoneCode=ctx.zoneCode;
 const nav=node('div');nav.style.cssText='display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px';
 const goBack=node('button','← Назад');goBack.type='button';goBack.addEventListener('click',()=>{notifyDetail(false);window.parent.document.getElementById('wowLinearTree')?.click()});
 const goTree=node('button','🌳 Дървото');goTree.type='button';goTree.addEventListener('click',()=>{
  const host=window.parent;
  const button=host?.document?.getElementById('backTree');
  notifyDetail(false);if(button)button.click();else window.WOWUnified.navigate('zones');
 });
 nav.append(goBack,goTree);pane.append(nav);
 pane.append(node('h3',zoneCode?'Видове в зона '+zoneCode:'Каталог на видовите разкази'));
 pane.append(node('p',zoneCode?'Показват се само видовете, свързани със зоната в работния регистър.':'Общ каталог на 792 уникални вида — без избрана зона.'));
 const status=node('p','Зареждане на видовите разкази…');pane.append(status);root.prepend(pane);
 Promise.all([load(),zoneCode?loadZones():Promise.resolve(null)]).then(([data,zones])=>{
  if(!pane.isConnected||window.WOWUnified.context()?.zoneCode!==zoneCode)return;
  status.remove();const input=node('input');input.type='search';input.placeholder='Търси вид по научно име';input.setAttribute('aria-label','Търсене на вид по научно име');input.style.cssText='box-sizing:border-box;width:100%;padding:12px;border:1px solid #7b9e82;border-radius:8px;font-size:16px';pane.append(input);
  const result=node('div');result.setAttribute('aria-live','polite');pane.append(result);
  function render(){
   active='';result.replaceChildren();const q=input.value.trim().toLocaleLowerCase('bg');
   const names=zoneCode?(zones[zoneCode]||[]):Object.keys(data);
   const matches=names.filter(n=>n in data&&n.toLocaleLowerCase('bg').includes(q));
   result.append(node('p','Намерени видове: '+matches.length+' (показани до 40)'));
   for(const name of matches.slice(0,40)){
    const b=node('button',name);b.type='button';b.style.cssText='display:block;width:100%;margin:5px 0;padding:9px;text-align:left;border-radius:8px;cursor:pointer';b.addEventListener('click',()=>{
      active=name;notifyDetail(true);result.replaceChildren();const back=node('button','← Към видовете');back.type='button';back.addEventListener('click',()=>{active='';notifyDetail(false);render()});result.append(back,node('h3',name),node('p',data[name]));
    });result.append(b);
   }
  }input.addEventListener('input',render);render();
 }).catch(()=>{
  if(status.isConnected&&window.WOWUnified.context()?.zoneCode===zoneCode)status.textContent='Липсва видовият регистър или връзката вид–зона — ПРЕДСТОИ. Не показваме общите 792 вида като видове на зоната.';
 });
}
let scheduled=false,observer=null;
function boot(){
 // The legacy intro overlay may remain above the unified catalogue even when hidden.
 // Make it non-interactive only after the unified app exists; keep the shell intro intact.
 const splash=document.getElementById('tpuApprovedSplash');
 if(splash&&window.WOWUnified?.context){
  splash.inert=true;
  splash.setAttribute('aria-hidden','true');
  splash.style.setProperty('pointer-events','none','important');
  splash.style.setProperty('display','none','important');
 }
 const next=document.getElementById('wowUnifiedContent');
 if(!next||!window.WOWUnified?.context)return false;
 if(root!==next){
  observer?.disconnect();root=next;
  observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;draw()})});
  observer.observe(root,{childList:true,subtree:true});
 }
 draw();return true;
}
boot();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
// The host app can initialize its unified root after DOMContentLoaded.
let tries=0;const timer=setInterval(()=>{if(boot()||++tries>=100)clearInterval(timer)},100);
})();