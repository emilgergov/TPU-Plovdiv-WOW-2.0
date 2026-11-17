/* KT77-04.4B — automatic GIS context SVG from confirmed parcels and available zone geometries.
 * Independent of Context button, zoom, pan, selection and cached screen bitmap.
 * Visual supplement only: no new intersection calculations and no ZT boundary fabrication. */
(function(root){'use strict';
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;'}[c]))}
function polygonRings(g){
 if(!g||!['Polygon','MultiPolygon'].includes(g.type))return [];
 const polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;
 return polys.flatMap(p=>p.filter(r=>Array.isArray(r)&&r.length>=3));
}
function buildSVG(results,zoneFeatures=[],findings=[]){
 if(!Array.isArray(results)||!results.length)return null;
 const items=results.map(r=>({id:String(r.cadnum||r.input||'').trim(),features:(r.geojson?.features||[]).filter(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type))}));
 if(items.some(x=>!x.id||!x.features.length)||new Set(items.map(x=>x.id)).size!==items.length)throw Error('KT77-04.4: missing confirmed geometry for context');
 const pts=items.flatMap(x=>x.features.flatMap(f=>polygonRings(f.geometry)).flat()).filter(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]));
 if(!pts.length)throw Error('KT77-04.4: no valid parcel vertices');
 const lat0=pts.reduce((sum,p)=>sum+p[1],0)/pts.length;
 const latFactor=Math.max(0.15,Math.cos(lat0*Math.PI/180));
 const zones=(Array.isArray(zoneFeatures)?zoneFeatures:[]).filter(f=>['Polygon','MultiPolygon'].includes(f?.geometry?.type));
 // Expand only to relevant, already available Natura-zone geometry. The cadastral points are authoritative.
 const allPoints=pts.concat(zones.flatMap(f=>polygonRings(f.geometry).flat()).filter(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1])));
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 for(const p of allPoints){const x=p[0]*latFactor,y=p[1];minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
 let dx=Math.max(maxX-minX,0.001),dy=Math.max(maxY-minY,0.001);
 const padX=dx*0.09,padY=dy*0.09;minX-=padX;maxX+=padX;minY-=padY;maxY+=padY;
 dx=maxX-minX;dy=maxY-minY;
 const scale=Math.min(900/dx,355/dy);
 const offsetX=500-(minX+maxX)*scale/2,offsetY=220+(minY+maxY)*scale/2;
 const point=p=>[(p[0]*latFactor*scale+offsetX),(-p[1]*scale+offsetY)];
 function dFor(g){
  return polygonRings(g).map(r=>r.filter(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1])).map((p,i)=>{const q=point(p);return (i?'L':'M')+q[0].toFixed(2)+' '+q[1].toFixed(2)}).join(' ')+' Z').join(' ');
 }
 const zonePaths=zones.map(z=>'<path d="'+esc(dFor(z.geometry))+'" fill="#8ebea71c" stroke="#176b53" stroke-width="2" vector-effect="non-scaling-stroke"/>').join('');

 // One dot per validated parcel. The detailed cadastral identifiers remain in the approved PDF below.
 const dots=[],anchors=[];
 items.forEach(item=>{
  const vertices=item.features.flatMap(f=>polygonRings(f.geometry).flat()).filter(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]));
  const avg=[vertices.reduce((a,p)=>a+p[0],0)/vertices.length,vertices.reduce((a,p)=>a+p[1],0)/vertices.length];
  const [x,y]=point(avg);anchors.push({id:item.id,x,y});
  dots.push('<g><circle cx="'+x.toFixed(2)+'" cy="'+y.toFixed(2)+'" r="13" fill="none" stroke="#b91c1c" stroke-width="3"/><circle cx="'+x.toFixed(2)+'" cy="'+y.toFixed(2)+'" r="9" fill="#dc2626" stroke="white" stroke-width="3"/></g>');
 });
 const confirmed=Array.isArray(findings)?findings:[];
 if(confirmed.length&&confirmed.some((f,i)=>f.cadnum!==items[i]?.id))
  throw Error('KT77-04.4: PI MASTER context does not match requested cadastral IDs');
 const annotations=[],seenZZ=new Set(),seenZT=new Set();
 for(let i=0;i<confirmed.length;i++){
  const f=confirmed[i],anchor=anchors[i];
  for(const z of f.zones||[]){
   const code=String(z.code||'').trim(),name=String(z.name||'').trim();
   if(!code||!name||seenZZ.has(code))continue;
   seenZZ.add(code);
   const feature=zones.find(g=>String(g.properties?.SITECODE||g.properties?.sitecode||'')===code);
   let loc=anchor;
   if(feature){
    const verts=polygonRings(feature.geometry).flat().filter(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]));
    if(verts.length){const mean=[verts.reduce((v,p)=>v+p[0],0)/verts.length,verts.reduce((v,p)=>v+p[1],0)/verts.length];const [x,y]=point(mean);loc={x,y};}
   }
   // A ZZ label is explicitly associated with the actual known zone geometry if available.
   annotations.push({kind:'zz',code,name,x:loc.x,y:loc.y});
  }
  for(const z of f.territories||[]){
   const name=String(z.name||'').trim(),category=String(z.category||'').trim();
   const key=category+'|'+name+'|'+f.cadnum;
   if(!name||seenZT.has(key))continue;
   seenZT.add(key);
   // ZT label denotes a fact at this parcel marker, NEVER an inferred ZT polygon.
   annotations.push({kind:'zt',code:'ЗТ · '+category,name,x:anchor.x,y:anchor.y});
  }
 }
 // Compact labels INSIDE the map, like the browser's existing zone labels.
 // Candidate placements avoid marker centres, each other and the map edges.
 const placed=[],labelSVG=[];
 function findLabel(a,index){
  const width=Math.max(125,Math.min(246,Math.max(a.code.length*7.2,a.name.length*7.3)+24)),height=43;
  const candidates=[[18,-59],[26,18],[-width-18,-49],[-width-24,20],[35,-100],[-width-32,-96],[18,70],[-width-18,76]];
  let best=null,bestScore=Infinity;
  for(const [ox,oy] of candidates){
   let x=Math.max(20,Math.min(980-width,a.x+ox)),y=Math.max(23,Math.min(416-height,a.y+oy));
   const overlap=placed.reduce((n,p)=>{
    const dx=Math.max(0,Math.min(x+width,p.x+p.width)-Math.max(x,p.x));
    const dy=Math.max(0,Math.min(y+height,p.y+p.height)-Math.max(y,p.y));
    return n+dx*dy;
   },0);
   const dotClash=anchors.filter(p=>p.x>=x-9&&p.x<=x+width+9&&p.y>=y-9&&p.y<=y+height+9).length;
   const score=overlap*100+dotClash*15000+Math.hypot(x-a.x,y-a.y)+index*0.001;
   if(score<bestScore){bestScore=score;best={x,y,width,height}}
   if(score<200)break;
  }
  return best;
 }
 annotations.forEach((a,i)=>{
  const b=findLabel(a,i);placed.push(b);
  const stroke=a.kind==='zt'?'#b97714':'#497eaf';
  const fill=a.kind==='zt'?'#fffaf0':'#f8fbff';
  const lineX=Math.max(b.x,Math.min(b.x+b.width,a.x)),lineY=Math.max(b.y,Math.min(b.y+b.height,a.y));
  labelSVG.push('<g>'+
    '<path d="M'+a.x.toFixed(1)+' '+a.y.toFixed(1)+' L'+lineX.toFixed(1)+' '+lineY.toFixed(1)+'" fill="none" stroke="'+stroke+'" stroke-width="1.4" stroke-dasharray="'+(a.kind==='zt'?'4 3':'none')+'"/>'+
    '<rect x="'+b.x.toFixed(1)+'" y="'+b.y.toFixed(1)+'" width="'+b.width.toFixed(1)+'" height="'+b.height+'" rx="5" fill="'+fill+'" stroke="'+stroke+'" stroke-width="1.5"/>'+
    '<text x="'+(b.x+8).toFixed(1)+'" y="'+(b.y+16).toFixed(1)+'" font-size="12" font-weight="bold" fill="#214b55">'+esc(a.code)+'</text>'+
    '<text x="'+(b.x+8).toFixed(1)+'" y="'+(b.y+34).toFixed(1)+'" font-size="14" fill="#183c30">'+esc(a.name)+'</text></g>');
 });
 // No repeated cadastral list, no duplicate detailed ZZ/ZT inventories: this is context only.
 const height=492;
 return '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="'+height+'" viewBox="0 0 1000 '+height+'">'+
 '<rect width="1000" height="100%" fill="#e9f3ec"/><rect x="15" y="15" width="970" height="415" rx="10" fill="#e2efe8" stroke="#c0d9cd"/>'+
 '<g>'+zonePaths+dots.join('')+labelSVG.join('')+'</g>'+
 '<text x="26" y="460" font-size="18" fill="#34584b">Червена точка — имот · Зелен контур — ЗЗ · Етикет ЗТ — само ГИС констатация.</text></svg>';
}
root.KT77044AutoContext=Object.freeze({buildSVG});
})(typeof window!=='undefined'?window:globalThis);
