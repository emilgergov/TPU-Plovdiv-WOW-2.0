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
function buildSVG(results,zoneFeatures=[]){
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
 const xs=allPoints.map(p=>p[0]*latFactor),ys=allPoints.map(p=>p[1]);
 let minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
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
 const labels=[],dots=[];
 items.forEach((item,i)=>{
  const vertices=item.features.flatMap(f=>polygonRings(f.geometry).flat()).filter(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]));
  const avg=[vertices.reduce((a,p)=>a+p[0],0)/vertices.length,vertices.reduce((a,p)=>a+p[1],0)/vertices.length];
  const [x,y]=point(avg);
  dots.push('<g><circle cx="'+x.toFixed(2)+'" cy="'+y.toFixed(2)+'" r="13" fill="none" stroke="#b91c1c" stroke-width="3"/><circle cx="'+x.toFixed(2)+'" cy="'+y.toFixed(2)+'" r="9" fill="#dc2626" stroke="white" stroke-width="3"/></g>');
  labels.push('<text x="'+(35+(i%2)*475)+'" y="'+(460+Math.floor(i/2)*22)+'" font-size="18" fill="#183c30">'+esc(String(i+1)+'. ПИ '+item.id)+'</text>');
 });
 return '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="'+Math.max(495,465+Math.ceil(items.length/2)*22)+'" viewBox="0 0 1000 '+Math.max(495,465+Math.ceil(items.length/2)*22)+'">'+
 '<rect width="1000" height="100%" fill="#e9f3ec"/><rect x="15" y="15" width="970" height="415" rx="10" fill="#e2efe8" stroke="#c0d9cd"/>'+
 '<g>'+zonePaths+dots.join('')+'</g>'+
 '<text x="26" y="450" font-size="16" fill="#34584b">Червена точка — установен поземлен имот; зелен контур — налична граница на ЗЗ.</text>'+labels.join('')+'</svg>';
}
root.KT77044AutoContext=Object.freeze({buildSVG});
})(typeof window!=='undefined'?window:globalThis);
