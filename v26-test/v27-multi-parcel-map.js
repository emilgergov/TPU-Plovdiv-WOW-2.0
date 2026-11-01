/* V27.1 P5: deterministic multi-parcel overview from confirmed parcel geometry. */
(function(root){'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&quot;'}[c]));
function build(results,zoneFeatures=[]){
 if(!Array.isArray(results)||!results.length)return null;
 const items=results.map(r=>{
  const id=String(r.input||r.cadnum||'').trim();
  const shapes=(r.geojson?.features||[]).filter(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type));
  const polygons=[];
  for(const f of shapes){
   const geometry=f.geometry;
   if(geometry.type==='Polygon')polygons.push(...geometry.coordinates.slice(0,1));
   else for(const poly of geometry.coordinates)polygons.push(...poly.slice(0,1));
  }
  const rings=polygons.map(ring=>ring.filter(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]))).filter(ring=>ring.length>=3);
  return {id,rings};
 });
 if(items.some(item=>!item.id||!item.rings.length)||new Set(items.map(x=>x.id)).size!==items.length)return null;
 const pts=items.flatMap(x=>x.rings.flat()),xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const dx=Math.max(maxX-minX,1e-9),dy=Math.max(maxY-minY,1e-9);
 const scale=Math.min(660/dx,400/dy),project=p=>[50+(p[0]-minX)*scale,460-(p[1]-minY)*scale];
 const verifiedCodes=new Set(results.flatMap(r=>(r.verified_zone_intersections||[]).map(z=>typeof z==='string'?z:String(z?.sitecode||z?.code||''))).filter(code=>/^BG\d{7}$/.test(code)));
 const zonePaths=[];
 for(const f of (Array.isArray(zoneFeatures)?zoneFeatures:[])){
  const code=String(f?.properties?.SITECODE||f?.properties?.sitecode||'');
  if(!verifiedCodes.has(code)||!['Polygon','MultiPolygon'].includes(f?.geometry?.type))continue;
  const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
  for(const poly of polys)for(const ring of poly){
   const pts=ring.filter(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]));
   if(pts.length<3)continue;
   zonePaths.push('<path d="'+pts.map((p,j)=>{const q=project(p);return(j?'L':'M')+q[0].toFixed(2)+' '+q[1].toFixed(2)}).join(' ')+' Z" fill="none" stroke="#8b5a25" stroke-width="2" stroke-dasharray="7 5"/>');
  }
 }
 const paths=items.map((item,i)=>{
  const shapes=item.rings.map(ring=>'<path d="'+ring.map((p,j)=>{const q=project(p);return(j?'L':'M')+q[0].toFixed(2)+' '+q[1].toFixed(2)}).join(' ')+' Z" fill="none" stroke="#256c53" stroke-width="2.5"/>').join('');
  const p=project(item.rings[0][0]);
  return '<g>'+shapes+'<text x="'+(p[0]+5).toFixed(2)+'" y="'+(p[1]-7).toFixed(2)+'" font-size="13" fill="#173e31">'+esc(item.id)+'</text></g>';
 }).join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" width="760" height="520" viewBox="0 0 760 520"><rect width="760" height="520" fill="#fff"/><text x="24" y="28" font-size="17" fill="#173e31">Обзорна карта на потвърдените имоти</text>'+zonePaths.join('')+paths+'<text x="24" y="504" font-size="11" fill="#444">Източник: потвърдена имотна геометрия от ГИС анализа. '+(zonePaths.length?'Пунктир: граници от работния слой за зони с потвърдено пресичане.':'Граници на защитени зони не са визуализирани.')+'</text></svg>';
}
root.V27MultiParcelMap=Object.freeze({build});
})(typeof window!=='undefined'?window:globalThis);
