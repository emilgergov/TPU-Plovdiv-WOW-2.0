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
 const parcelLabels=[],dots=[];
 items.forEach((item,i)=>{
  const vertices=item.features.flatMap(f=>polygonRings(f.geometry).flat()).filter(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]));
  const avg=[vertices.reduce((a,p)=>a+p[0],0)/vertices.length,vertices.reduce((a,p)=>a+p[1],0)/vertices.length];
  const [x,y]=point(avg);
  dots.push('<g><circle cx="'+x.toFixed(2)+'" cy="'+y.toFixed(2)+'" r="13" fill="none" stroke="#b91c1c" stroke-width="3"/><circle cx="'+x.toFixed(2)+'" cy="'+y.toFixed(2)+'" r="9" fill="#dc2626" stroke="white" stroke-width="3"/></g>');
  parcelLabels.push('<text x="'+(30+(i%2)*485)+'" y="'+(505+Math.floor(i/2)*29)+'" font-size="23" font-weight="bold" fill="#183c30">'+esc(String(i+1)+'. ПИ '+item.id)+'</text>');
 });
 // Read-only factual ZZ/ZT summary; ZT names do not assert that a ZT boundary is drawn.
 const confirmed=Array.isArray(findings)?findings:[];
 if(confirmed.length&&confirmed.some((f,i)=>f.cadnum!==items[i]?.id))
  throw Error('KT77-04.4: PI MASTER context does not match requested cadastral IDs');
 const unique=(values)=>[...new Set(values.filter(Boolean))];
 const zz=unique(confirmed.flatMap(f=>(f.zones||[]).map(z=>(String(z.code||'').trim()+' — '+String(z.name||'').trim()).trim())));
 const zt=unique(confirmed.flatMap(f=>(f.territories||[]).map(z=>[String(z.category||'').trim(),String(z.name||'').trim()].filter(Boolean).join(' — '))));
 // Wrapped SVG text stays below the frame and separated from the parcel-number legend.
 function wrapText(label,entries,maxChars){
  const words=(label+(entries.length?entries.join('; '):'няма установено пресичане')).split(/\s+/);
  const lines=[],curr=[];
  for(const word of words){if(curr.length&&curr.join(' ').length+word.length+1>maxChars){lines.push(curr.join(' '));curr.length=0;}curr.push(word)}
  if(curr.length)lines.push(curr.join(' '));return lines;
 }
 const summaryLines=[
  ...wrapText('ЗЗ (ЗБР): ',zz,89),
  ...wrapText('ЗТ (ЗЗТ): ',zt,89)
 ];
 const summaryY=505+Math.ceil(items.length/2)*29+23;
 const height=Math.max(560,summaryY+summaryLines.length*27+24);
 const labelSvg=summaryLines.map((line,i)=>'<text x="30" y="'+(summaryY+i*27)+'" font-size="21" fill="#183c30">'+esc(line)+'</text>').join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="'+height+'" viewBox="0 0 1000 '+height+'">'+
 '<rect width="1000" height="100%" fill="#e9f3ec"/><rect x="15" y="15" width="970" height="415" rx="10" fill="#e2efe8" stroke="#c0d9cd"/>'+
 '<g>'+zonePaths+dots.join('')+'</g>'+
 '<text x="26" y="460" font-size="19" fill="#34584b">Червена точка — имот; зелен контур — налична граница на ЗЗ.</text>'+
 parcelLabels.join('')+labelSvg+'</svg>';
}
root.KT77044AutoContext=Object.freeze({buildSVG});
})(typeof window!=='undefined'?window:globalThis);
