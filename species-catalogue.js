/* WOW 2.0 species catalogue adapter. Reads local, versioned stories only.
   Never assigns a species to a Natura zone without an authoritative zone-species link. */
(()=>{'use strict';
let root=null;
// Injected by the outer shell: it may execute before the unified app is ready.
// Never permanently exit on a transient startup race.
let stories=null,loading=null,active='';
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
 const ctx=window.WOWUnified.context();if(!ctx||ctx.view!=='species')return;
 root=document.getElementById('wowUnifiedContent');if(!root)return;
 const target=root.querySelector('#wowSpeciesCatalogue');
 if(target)return;
 const pane=node('section');pane.id='wowSpeciesCatalogue';pane.style.cssText='margin:18px 0;padding:16px;border:1px solid #b4cbb7;border-radius:14px;background:#f6fbf5;color:#173821';
 pane.append(node('h3','Каталог на видовите разкази'));
 pane.append(node('p','Търсенето обхваща всички 792 уникални вида. Принадлежността към конкретна зона не се предполага.'));
 const status=node('p','Зареждане на видовите разкази…');pane.append(status);root.prepend(pane);
 load().then(data=>{
  if(!pane.isConnected)return;
  status.remove();const input=node('input');input.type='search';input.placeholder='Търси вид по научно име';input.setAttribute('aria-label','Търсене на вид по научно име');input.style.cssText='box-sizing:border-box;width:100%;padding:12px;border:1px solid #7b9e82;border-radius:8px;font-size:16px';pane.append(input);
  const result=node('div');result.setAttribute('aria-live','polite');pane.append(result);
  function render(){
   result.replaceChildren();const q=input.value.trim().toLocaleLowerCase('bg');
   const matches=Object.keys(data).filter(n=>n.toLocaleLowerCase('bg').includes(q));
   result.append(node('p','Намерени видове: '+matches.length+' (показани до 40)'));
   for(const name of matches.slice(0,40)){
    const b=node('button',name);b.type='button';b.style.cssText='display:block;width:100%;margin:5px 0;padding:9px;text-align:left;border-radius:8px;cursor:pointer';b.addEventListener('click',()=>{
      active=name;result.replaceChildren();const back=node('button','← Към видовете');back.type='button';back.addEventListener('click',render);result.append(back,node('h3',name),node('p',data[name]));
    });result.append(b);
   }
  }input.addEventListener('input',render);render();
 }).catch(()=>{
  if(status.isConnected)status.textContent='Видовият регистър още не е публикуван в този кандидат — ПРЕДСТОИ. Не използвай този екран за представяне.';
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