/* KT77-04.4A — Context of every found parcel, visual-only. */
(function(){
"use strict";
const map=document.getElementById('map'),shapes=document.getElementById('shapes'),context=document.getElementById('zoneContext'),showAll=document.getElementById('showAll');
if(!map||!shapes||!context||!showAll)return;
const parent=map.parentElement;if(getComputedStyle(parent).position==='static')parent.style.position='relative';
const css=document.createElement('style');css.id='kt77-044-multipoint-style';
css.textContent='.kt77-044-point{position:absolute;z-index:13;display:none;pointer-events:none;width:24px;height:24px;box-sizing:border-box;border-radius:50%;background:#dc2626;border:3px solid white;box-shadow:0 0 0 2px #a51425,0 2px 8px #0007;transform:translate(-50%,-50%)}.kt77-044-point::after{content:"";position:absolute;inset:-7px;border:2px solid #d51e2e;border-radius:50%;opacity:.65}.kt77-044-active .kt77-r08-context-marker{display:none!important}';
document.head.appendChild(css);
const markers=new Map();let active=false,queued=false;
function validIds(){try{return [...new Set(found.filter(r=>r?.status==='Намерен').map(r=>String(r.cadnum||r.input||'').trim()).filter(x=>/^\d{5}\.\d+\.\d+$/.test(x)))];}catch(_){return []}}
function clear(){active=false;for(const m of markers.values())m.remove();markers.clear();parent.classList.remove('kt77-044-active');}
function refresh(){
 queued=false;if(!active)return;
 const ids=validIds();if(ids.length<2){clear();return}
 const paths=new Map();
 for(const p of shapes.querySelectorAll('path[aria-label^="Избери имот "]')){const id=(p.getAttribute('aria-label')||'').slice(12);if(ids.includes(id)&&!paths.has(id))paths.set(id,p)}
 if(ids.some(id=>!paths.has(id))){for(const m of markers.values())m.style.display='none';parent.classList.remove('kt77-044-active');return;}
 const view=map.getBoundingClientRect(),origin=parent.getBoundingClientRect();
 if(!view.width||!view.height)return;
 parent.classList.add('kt77-044-active');
 for(const [id,m] of markers)if(!ids.includes(id)){m.remove();markers.delete(id)}
 for(const id of ids){let m=markers.get(id);if(!m){m=document.createElement('span');m.className='kt77-044-point';m.dataset.cadnum=id;m.setAttribute('aria-hidden','true');parent.appendChild(m);markers.set(id,m)}
  try{const b=paths.get(id).getBBox(),t=paths.get(id).getScreenCTM();if(!t)throw Error('Missing transform');
   const x=t.a*(b.x+b.width/2)+t.c*(b.y+b.height/2)+t.e,y=t.b*(b.x+b.width/2)+t.d*(b.y+b.height/2)+t.f;
   if(!Number.isFinite(x)||!Number.isFinite(y)||x<view.left||x>view.right||y<view.top||y>view.bottom){m.style.display='none';continue}
   m.style.left=x-origin.left+'px';m.style.top=y-origin.top+'px';m.style.display='block';
  }catch(_){m.style.display='none'}
 }
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(refresh)}
// The approved Context handler computes its viewport from the combined parcel and zone features.
// Capture first selects "Всички" so its calculation includes every requested parcel.
context.addEventListener('click',()=>{if(validIds().length>1)showAll.click()},true);
context.addEventListener('click',()=>{active=validIds().length>1;if(active)schedule();else clear()});
for(const id of ['fit','showSelected','run'])document.getElementById(id)?.addEventListener('click',clear);
shapes.addEventListener('click',e=>{if(e.target.closest?.('path[aria-label^="Избери имот "]'))clear()});
new MutationObserver(schedule).observe(map,{attributes:true,attributeFilter:['viewBox']});
new MutationObserver(schedule).observe(shapes,{childList:true});
if(typeof ResizeObserver!=='undefined')new ResizeObserver(schedule).observe(map);
window.addEventListener('resize',schedule,{passive:true});
window.KT77044Context=Object.freeze({status:()=>({active,found:validIds().length,visible:[...markers.values()].filter(m=>m.style.display==='block').length})});
})();
