/* KT80 V19 — 27 equal navigation tiles on home, separate work/candidate screens.
   Changes navigation only. It never confirms a procedure or modifies working data. */
(function(root){'use strict';
const $=id=>document.getElementById(id);
let view='home',lastTile=null;
function scrollTop(){try{root.scrollTo({top:0,behavior:root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'auto':'smooth'})}catch(e){}}
function viewMode(mode,label){
 view=mode;document.body.dataset.kt80View=mode;
 const back=$('kt80DashboardBack');if(back)back.hidden=mode==='home';
 const title=$('kt80ScreenTitle');if(title)title.textContent=label||'';
 scrollTop();
}
function home(){
 const o=$('overlay');if(o?.classList.contains('open')){o.classList.remove('open');o.setAttribute('aria-hidden','true')}
 viewMode('home','');
 if(lastTile?.isConnected)try{lastTile.focus({preventScroll:true})}catch(e){}
}
function stage(step){
 const b=document.querySelector('.kt80-step[data-step="'+step+'"]');
 viewMode('stage',b?.textContent?.trim()||('Етап '+step));
}
function route(c){
 if(typeof root.KT80OpenRoute!=='function')return;
 root.KT80OpenRoute(c);
 viewMode('candidate','№'+String(c.id).padStart(2,'0')+' · '+c.title);
}
function tile(label,kind,index,action){
 const b=document.createElement('button');b.type='button';b.className='kt80-dashboard-tile';b.dataset.kt80Kind=kind;b.dataset.kt80Index=String(index);
 const number=document.createElement('span');number.className='kt80-dashboard-tile-number';number.textContent=kind==='step'?'ЕТАП '+index:'№'+String(index).padStart(2,'0');
 const text=document.createElement('span');text.className='kt80-dashboard-tile-text';text.textContent=label;
 const arrow=document.createElement('span');arrow.className='kt80-dashboard-tile-arrow';arrow.textContent='➜';arrow.setAttribute('aria-hidden','true');
 b.append(number,text,arrow);
 b.addEventListener('click',()=>{
  lastTile=b;b.classList.add('kt80-dashboard-depart');
  const reduce=root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  // Animation is a navigational cue only, not a legal status.
  if(reduce){action();return}
  root.setTimeout(()=>{b.classList.remove('kt80-dashboard-depart');action()},260);
 });
 return b;
}
function init(){
 const landing=$('kt80Dashboard');if(!landing)return;
 const five=$('kt80DashboardFive'),twentyTwo=$('kt80DashboardRoutes');
 const steps=[...document.querySelectorAll('.kt80-step[data-step]')];
 const routes=root.KT80RouteCatalog||[];
 five.replaceChildren();twentyTwo.replaceChildren();
 for(const b of steps){
  const num=Number(b.dataset.step);
  five.append(tile(b.textContent.replace(/^\d+\.\s*/,'').trim(),'step',num,()=>b.click()));
 }
 for(const c of routes)twentyTwo.append(tile(c.title,'route',c.id,()=>route(c)));
 $('kt80DashboardBack')?.addEventListener('click',home);
 // Original candidate content is retained in its full sub-screen; close returns home.
 $('close')?.addEventListener('click',()=>{if(view==='candidate')home()});
 $('overlay')?.addEventListener('click',e=>{if(e.target===e.currentTarget&&view==='candidate')home()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&view==='candidate')root.setTimeout(home,0)});
 root.KT80DashboardOpenStage=stage;
 root.KT80DashboardHome=home;
 root.KT80DashboardOpenCandidate=route;
 viewMode('home','');
 if($('kt80DashboardCount'))$('kt80DashboardCount').textContent='5 основни етапа + '+routes.length+' специализирани кандидата';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);