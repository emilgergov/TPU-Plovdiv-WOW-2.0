/* KT68 map-only viewer controls.
 * Deliberately uses the existing browser GIS lookup results and the existing
 * SVG drawing functions. Does not edit GIS calculations or PDF/Word generators.
 */
(()=>{'use strict';
const get=id=>document.getElementById(id);
const controls=document.querySelector('.map .controls');
if(!controls||!get('showAll')||!get('showSelected'))return;
const style=document.createElement('style');
style.textContent=`
/* KT68: a single compact horizontal map toolbar. Presentation only. */
.map .controls{
 position:absolute!important;top:12px!important;right:12px!important;left:auto!important;
 display:flex!important;flex-flow:row wrap!important;justify-content:flex-start!important;
 align-items:center!important;align-content:flex-start!important;
 width:500px!important;max-width:calc(100% - 315px)!important;
 padding:4px!important;gap:3px!important;
 border:1px solid #bfd6c9!important;border-radius:9px!important;
 background:rgba(255,255,255,.96)!important;
 box-shadow:0 2px 6px #0001!important;z-index:7!important;
}
.map .controls .kt68-control-set{
 display:flex!important;flex:0 0 auto!important;flex-wrap:nowrap!important;
 align-items:center!important;gap:4px!important;justify-content:flex-start!important;
 background:transparent!important;border:0!important;padding:0!important;
 border-radius:0!important;
}
.map .controls .kt68-control-set+.kt68-control-set{
 border-left:1px solid #c6d9cc!important;padding-left:5px!important;
}
.map .controls .kt68-control-title{display:none!important}
.map .controls button{
 font-size:10px!important;padding:4px 6px!important;
 min-height:27px!important;line-height:1.05!important;border-radius:6px!important;
 white-space:nowrap!important;
}
.map .controls #zoomIn,.map .controls #zoomOut{min-width:26px!important;padding:4px 6px!important}
.map .controls #fit{max-width:110px!important}
.map .controls #zoneContext{max-width:75px!important}
.map .controls .kt68-parcel-switch{
 display:inline-flex!important;gap:0!important;border:1px solid #267047!important;
 border-radius:7px!important;overflow:hidden!important;
}
.map .controls .kt68-parcel-switch button{
 border-radius:0!important;padding:6px 8px!important;min-height:26px!important;font-size:10px!important;
}
.map .controls .kt68-parcel-switch button[aria-pressed=false]{
 background:#e8f1eb!important;color:#24523d!important;
}
.map .controls .kt68-parcel-switch button[aria-pressed=true]{
 background:#176548!important;color:#fff!important;
}
.map .controls .kt68-control-set>label{
 font-size:11px!important;padding:2px!important;background:none!important;white-space:nowrap!important;
}
.map .controls .kt68-control-set>select{
 max-width:126px!important;height:27px!important;font-size:10px!important;padding:3px!important;
}
@media(max-width:1050px){
 .map .controls{max-width:calc(100% - 260px)!important;row-gap:3px!important}
}
@media(max-width:760px){
 .map .controls{top:58px!important;right:8px!important;max-width:calc(100% - 16px)!important;
   padding:4px!important;gap:3px!important}
 .map .controls .kt68-control-set+.kt68-control-set{padding-left:4px!important}
 .map .controls button{padding:5px 6px!important;font-size:10px!important}
 .map .controls .kt68-control-set>select{max-width:112px!important}
}
`;
document.head.appendChild(style);
const makeSet=(title,ids)=>{
 const div=document.createElement('div');div.className='kt68-control-set';div.setAttribute('role','group');div.setAttribute('aria-label',title);
 const label=document.createElement('span');label.className='kt68-control-title';label.textContent=title.toUpperCase();div.appendChild(label);
 ids.forEach(id=>{const node=get(id);if(node)div.appendChild(node)});
 return div;
};
const modeGroup=makeSet('Мащаб и изглед',['zoomIn','zoomOut','fit','zoneContext']);
const parcelGroup=makeSet('Имотен обхват',[]);
const switcher=document.createElement('span');switcher.className='kt68-parcel-switch';switcher.setAttribute('role','group');switcher.setAttribute('aria-label','Всички или избран имот');
switcher.append(get('showAll'),get('showSelected'));parcelGroup.append(switcher);
const labelsSet=makeSet('Слоеве и етикети',['toggleOverlaps']);
const label=document.querySelector('label[for="labelMode"]');
if(label){label.textContent='Етикети';labelsSet.append(label)}
if(get('labelMode'))labelsSet.append(get('labelMode'));
controls.append(modeGroup,parcelGroup,labelsSet);
const fitButton=get('fit');if(fitButton){fitButton.textContent='Начален изглед';fitButton.title='Възстанови изгледа на имотите след мащабиране или преместване'}
const contextButton=get('zoneContext');
if(contextButton){contextButton.textContent='Контекст';contextButton.title='Покажи по-широка територия; при налично архивно пресичане — обхвата на съответната зона'}
const showAll=get('showAll'),showSelected=get('showSelected');
showAll.textContent='Всички';showSelected.textContent='Избран';
showAll.title='Покажи всички намерени имоти заедно';
showSelected.title='Покажи избрания имот';
function refresh(){
 showAll.setAttribute('aria-pressed',String(!!combined));
 showSelected.setAttribute('aria-pressed',String(!combined));
}
function allParcelFeatures(){
 return found.filter(r=>r.status==='Намерен').flatMap(r=>[
  ...(r.geojson?.features||[]).map(f=>({...f,properties:{...f.properties,cadnum:r.cadnum||r.input}})),
  ...(r.overlap_geojson?.features||[]).map(f=>({...f,properties:{...f.properties,cadnum:r.cadnum||r.input,role:'archived_intersection'}}))
 ]);
}
showAll.onclick=()=>{
 const features=allParcelFeatures().filter(f=>f.geometry?.type==='Polygon'||f.geometry?.type==='MultiPolygon');
 if(!features.length)return;
 const b=bounds(features);if(!b)return;
 allFeatures=features;baseBox=b;combined=true;
 loadZones();fit();refresh();
};
showSelected.onclick=()=>{
 const i=found[selected]?.status==='Намерен'?selected:found.findIndex(r=>r.status==='Намерен');
 if(i<0)return;
 select(i,false);refresh();
};
// KT68 selection: the legacy SVG drag code captures the pointer on pointerdown,
// which can redirect the native click from a parcel path to the SVG itself.
// Remember the pressed cadastral path and select it on pointerup only when
// the pointer did not drag. Never alter any cadastral geometry or GIS result.
const parcelSvg=get('map');
let pressedParcel=null;
if(parcelSvg){
 parcelSvg.addEventListener('pointerdown',event=>{
  pressedParcel=null;
  if(event.button!==0)return;
  const path=event.target?.closest?.('path[aria-label^="Избери имот "]');
  if(!path||!parcelSvg.contains(path))return;
  const cadnum=path.getAttribute('aria-label').slice('Избери имот '.length).trim();
  if(cadnum)pressedParcel={cadnum,x:event.clientX,y:event.clientY};
 },true);
 parcelSvg.addEventListener('pointerup',event=>{
  const pressed=pressedParcel;pressedParcel=null;
  if(!pressed)return;
  if(Math.hypot(event.clientX-pressed.x,event.clientY-pressed.y)>5)return;
  const index=found.findIndex(r=>r.status==='Намерен'&&String(r.cadnum||r.input)===pressed.cadnum);
  if(index<0)return;
  // In 'Всички' mode select the parcel while retaining the combined viewport.
  select(index,combined);refresh();
 },true);
 parcelSvg.addEventListener('pointercancel',()=>{pressedParcel=null},true);
}
// Map click and result selection must also keep the visual segment synchronized.
const syncSoon=()=>Promise.resolve().then(refresh);
get('results')?.addEventListener('click',syncSoon);
get('results')?.addEventListener('keydown',syncSoon);
get('map')?.addEventListener('click',syncSoon);
get('map')?.addEventListener('keydown',syncSoon);
get('run')?.addEventListener('click',()=>{showAll.setAttribute('aria-pressed','false');showSelected.setAttribute('aria-pressed','true')});
function showContext(){
 if(!baseBox)return;
 const codes=new Set(allFeatures.filter(f=>f.properties?.role==='archived_intersection').map(f=>String(f.properties?.sitecode||'')).filter(Boolean));
 const zones=zoneFeatures.filter(f=>f._bbox&&codes.has(String(f.properties?.SITECODE||f.properties?.sitecode||'')));
 // Without an identified intersecting zone, the wider view is deliberately generic.
 if(!zones.length){viewBox=[-500,-325,2000,1300];redraw();return}
 const extent=bounds([...allFeatures.filter(f=>f.properties?.role!=='archived_intersection'),...zones]);
 if(!extent)return;
 const b=baseBox,scale=Math.min(900/Math.max(b.maxX-b.minX,1e-8),530/Math.max(b.maxY-b.minY,1e-8));
 const x=500+((extent.minX+extent.maxX-b.minX-b.maxX)/2)*scale;
 const y=325-((extent.minY+extent.maxY-b.minY-b.maxY)/2)*scale;
 let w=Math.max(1000,(extent.maxX-extent.minX)*scale*1.2);
 let h=Math.max(650,(extent.maxY-extent.minY)*scale*1.2);
 if(w/h>1000/650)h=w*650/1000;else w=h*1000/650;
 viewBox=[x-w/2,y-h/2,w,h];redraw();
}
if(contextButton)contextButton.onclick=showContext;
refresh();
})();