/* PDF 1: print-ready browser document from the same geometry as the V26 map. */
(()=>{'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hasPolygon=r=>r?.status==='Намерен'&&r.geojson?.features?.some(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type));
const points=g=>{const a=[];function walk(x){if(Array.isArray(x)&&typeof x[0]==='number'&&typeof x[1]==='number')a.push(x);else if(Array.isArray(x))x.forEach(walk)}walk(g.coordinates);return a};
function diagram(result){
 const feats=result.geojson.features.filter(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type));
 const xy=feats.flatMap(f=>points(f.geometry));if(!xy.length)return '';
 const xs=xy.map(p=>p[0]),ys=xy.map(p=>p[1]);const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const w=Math.max(maxX-minX,1e-9),h=Math.max(maxY-minY,1e-9),scale=Math.min(620/w,330/h);
 const sx=x=>40+(x-minX)*scale,sy=y=>365-(y-minY)*scale;
 function rings(g){return g.type==='Polygon'?g.coordinates:g.coordinates.flat(1)}
 const shapes=feats.flatMap(f=>rings(f.geometry).map(ring=>'<polygon points="'+ring.map(p=>sx(p[0]).toFixed(2)+','+sy(p[1]).toFixed(2)).join(' ')+'" fill="#b5d8c8" stroke="#176749" stroke-width="1.6" fill-opacity=".55"/>')).join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 410" role="img" aria-label="Контур на имот">'+shapes+'</svg>';
}
function open(results,source){
 const valid=results.filter(hasPolygon);if(!valid.length)throw Error('Няма реална имотна геометрия за PDF №1.');
 const blocks=results.map(r=>'<section><h2>Имот '+esc(r.cadnum||r.input)+'</h2><p>Статус: '+esc(hasPolygon(r)?'Архивна имотна геометрия':'ПРЕДСТОИ — липсва имотна геометрия')+'</p>'+(hasPolygon(r)?diagram(r)+'<p>Площ по геометрия: '+esc(r.area_m2_geometry??'ПРЕДСТОИ')+' кв. м</p>':'')+'<p>Актуално пресичане със защитена зона: <b>ПРЕДСТОИ</b>.</p></section>').join('');
 const html='<!doctype html><html lang="bg"><head><meta charset="utf-8"><title>ТПУ Пловдив — ГИС анализ — Приложение №1</title><style>body{font:12px Arial;color:#183b2e;margin:18mm}h1{font-size:19px}h2{font-size:15px}section{page-break-inside:avoid;margin:20px 0;border-top:1px solid #ccc;padding-top:12px}svg{width:100%;max-height:370px}p{line-height:1.5}@page{size:A4;margin:18mm}</style></head><body><h1>ТПУ Пловдив — Приложение №1 — ГИС анализ</h1><p><b>Работен справочен документ. Не удостоверява актуални граници, правен режим или официално становище.</b></p><p>Източник: '+esc(source||'регионална архивна кадастрална FileGDB')+'. Полигони: '+valid.length+' от '+results.length+' имота.</p>'+blocks+'<p>За PDF използвайте „Печат“ → „Запазване като PDF“.</p></body></html>';
 const popup=window.open('','_blank');if(!popup)throw Error('Разрешете изскачащите прозорци за този сайт.');popup.document.open();popup.document.write(html);popup.document.close();popup.focus();return valid.length;
}
window.V26PDF1=Object.freeze({open});
})();