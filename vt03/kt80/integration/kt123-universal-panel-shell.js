/* KT123-B — shared, non-invasive presentation layer for all 22 catalog panels.
   No changes to jurisdiction, routing, evidence, GIS geometry, expert approval or Word generation. */
(function(){
'use strict';
const profile=id=>id===15?'independent':([13,14,16].includes(id)?'potential-independent':'procedural');
const visibleType=id=>profile(id)==='independent'?'НЕЗАВИСИМ':profile(id)==='potential-independent'?'ЗА ПРОВЕРКА':'';
const style=document.createElement('style');
style.textContent=`
.kt123-panel-mark{display:inline-flex;align-items:center;max-width:100%;padding:4px 9px;border:1px solid #ba9d5c;border-radius:6px;color:#ffdda2;background:#214633;font:700 11px Verdana,Arial;letter-spacing:.02em;margin:5px 0}
.kt123-panel-mark[data-kind="independent"]{border-color:#87c3a1;color:#e5ffe9;background:#22583d}
#kt80DashboardRoutes .kt80-dashboard-tile[data-kt123-selected="true"]{border-color:#e9c177!important;box-shadow:inset 0 0 0 1px #e9c17755}
.kt123-selected-direction{display:inline-block;align-self:flex-start;border:1px solid #e9be71;background:#334f37;color:#ffe3a4;border-radius:5px;padding:4px 8px;font:700 11px Verdana,Arial;margin:0 0 3px}
#kt80DashboardFive .kt80-dashboard-tile[data-kt122-state="review"]{background:#4a4d2f!important;border-color:#dbba6a!important;color:#fbedc8!important;opacity:1!important}
#kt80DashboardFive .kt80-dashboard-tile[data-kt122-state="done"]{background:#32745a!important;border-color:#9fc9a8!important;opacity:1!important;color:#fff6de!important}

.kt123-panel-card{min-width:0}
.kt123-panel-card .kind{color:#e8d59f!important;opacity:1!important}
#overlay .dialog{font-family:Verdana,Arial,sans-serif}
#overlay .dialog .tabs{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px!important}
#overlay .dialog .tabs button{min-height:47px;font:700 13px Verdana,Arial!important;white-space:normal;overflow-wrap:anywhere}
#overlay .dialog .dialogtop{background:#0f3325}
#overlay .dialog .rows{gap:10px}
#overlay .dialog .rr{min-height:88px}
@media(max-width:760px){#overlay .dialog .tabs{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
@media(max-width:480px){#overlay .dialog .tabs{grid-template-columns:1fr!important}}
`;
document.head.append(style);
function mark(){
 const cards=document.querySelectorAll('#groups article.card');
 cards.forEach(card=>{
  const h=card.querySelector('h4'),kind=card.querySelector('.kind');
  if(!h||!kind||card.querySelector('.kt123-panel-mark'))return;
  const m=(kind.textContent||'').match(/№\s*0?(\d{1,2})/u);if(!m)return;
  const id=Number(m[1]);if(id<1||id>22)return;
  card.classList.add('kt123-panel-card');
  if(!visibleType(id))return;
  const b=document.createElement('span');b.className='kt123-panel-mark';b.dataset.kind=profile(id);b.textContent=visibleType(id);kind.after(b);
 });
 // Ensure a legible state without changing whether an individual stage is complete.
 document.querySelectorAll('#kt80DashboardFive .kt80-dashboard-tile').forEach(tile=>{
  const state=tile.dataset.kt122State;
  if(state==='current'){
   tile.style.removeProperty('opacity');tile.style.removeProperty('color');
   [tile.querySelector('.kt80-dashboard-tile-number'),tile.querySelector('.kt80-dashboard-tile-text'),tile.querySelector('.kt80-dashboard-tile-arrow')].filter(Boolean).forEach(node=>{
    node.style.removeProperty('opacity');node.style.removeProperty('color');node.style.removeProperty('-webkit-text-fill-color');
   });
   return;
  }
  if(state!=='pending'&&state!=='done'&&state!=='review')return;
  const ink=state==='review'?'#fff0bf':'#f4eddb';
  tile.style.setProperty('opacity','1','important');
  tile.style.setProperty('color',ink,'important');
  [tile.querySelector('.kt80-dashboard-tile-number'),tile.querySelector('.kt80-dashboard-tile-text'),tile.querySelector('.kt80-dashboard-tile-arrow')].filter(Boolean).forEach(node=>{
   node.style.setProperty('opacity','1','important');
   node.style.setProperty('color',ink,'important');
   node.style.setProperty('-webkit-text-fill-color',ink,'important');
  });
 });
 // The primary dashboard uses BUTTON tiles, not the legacy #groups article.card catalog.
 document.querySelectorAll('#kt80DashboardRoutes .kt80-dashboard-tile').forEach(tile=>{
  const number=(tile.querySelector('.kt80-dashboard-tile-number')?.textContent||tile.textContent||'').match(/№\s*0?(\d{1,2})/u);
  const id=Number(tile.dataset.kt80Index||number?.[1]||0);
  if(id<1||id>22)return;
  if(!visibleType(id))return;
  if(tile.querySelector('.kt123-panel-mark'))return;
  const markNode=document.createElement('span');markNode.className='kt123-panel-mark';
  markNode.dataset.kind=profile(id);
  markNode.textContent=visibleType(id);
  const label=tile.querySelector('.kt80-dashboard-tile-number');
  if(label)label.after(markNode);else tile.prepend(markNode);
 });
 const title=document.getElementById('dialogTitle'),meta=document.getElementById('dialogMeta');
 const m=(title?.textContent||'').match(/№\s*0?(\d{1,2})/u);
 if(m&&meta){
  const id=Number(m[1]);meta.dataset.kt123Profile=profile(id);
  const suffix=' · '+visibleType(id);
  if(visibleType(id)&&!meta.textContent.includes(suffix))meta.textContent+=suffix;
 }
}
const root=document.getElementById('groups'),title=document.getElementById('dialogTitle'),dash=document.getElementById('kt80DashboardRoutes'),five=document.getElementById('kt80DashboardFive');
if(five)new MutationObserver(mark).observe(five,{childList:true,subtree:true,attributes:true,attributeFilter:['data-kt122-state']});
if(dash)new MutationObserver(mark).observe(dash,{childList:true,subtree:true});
if(root)new MutationObserver(mark).observe(root,{childList:true,subtree:true});
if(title)new MutationObserver(mark).observe(title,{childList:true,characterData:true,subtree:true});
mark();
window.KT123PanelArchitecture=Object.freeze({version:'KT123-E3',profile,isIndependent:id=>profile(Number(id))==='independent'});
})();