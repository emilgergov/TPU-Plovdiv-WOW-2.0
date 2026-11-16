/* KT123-B — shared, non-invasive presentation layer for all 22 catalog panels.
   No changes to jurisdiction, routing, evidence, GIS geometry, expert approval or Word generation. */
(function(){
'use strict';
const profile=id=>id===15?'independent':([13,14,16].includes(id)?'potential-independent':'procedural');
const visibleType=id=>profile(id)==='independent'?'НЕЗАВИСИМ':profile(id)==='potential-independent'?'ИНСТРУМЕНТ · ПРОВЕРКА ЗА САМОСТОЯТЕЛНОСТ':'СПЕЦИАЛИЗИРАН ПАНЕЛ';
const style=document.createElement('style');
style.textContent=`
.kt123-panel-mark{display:inline-flex;align-items:center;max-width:100%;padding:4px 9px;border:1px solid #ba9d5c;border-radius:6px;color:#ffdda2;background:#214633;font:700 11px Verdana,Arial;letter-spacing:.02em;margin:5px 0}
.kt123-panel-mark[data-kind="independent"]{border-color:#87c3a1;color:#e5ffe9;background:#22583d}
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
  const b=document.createElement('span');b.className='kt123-panel-mark';b.dataset.kind=profile(id);b.textContent=visibleType(id);kind.after(b);
 });
 const title=document.getElementById('dialogTitle'),meta=document.getElementById('dialogMeta');
 const m=(title?.textContent||'').match(/№\s*0?(\d{1,2})/u);
 if(m&&meta){
  const id=Number(m[1]);meta.dataset.kt123Profile=profile(id);
  const suffix=' · '+visibleType(id);
  if(!meta.textContent.includes(suffix))meta.textContent+=suffix;
 }
}
const root=document.getElementById('groups'),title=document.getElementById('dialogTitle');
if(root)new MutationObserver(mark).observe(root,{childList:true,subtree:true});
if(title)new MutationObserver(mark).observe(title,{childList:true,characterData:true,subtree:true});
mark();
window.KT123PanelArchitecture=Object.freeze({version:'KT123-B1',profile,isIndependent:id=>profile(Number(id))==='independent'});
})();