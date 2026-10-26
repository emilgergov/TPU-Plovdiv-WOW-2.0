/* V26 GitHub Pages browser GIS adapter. No server requests and no fabricated matches. */
(()=>{'use strict';
const validId=id=>/^\d{5}\.\d+\.\d+(?:\.\d+)*$/.test(id);
async function lookup(ids){
 if(!Array.isArray(ids)||!ids.length||ids.length>100)throw Error('Невалиден брой имоти (1–100).');
 const results=ids.map(raw=>{const id=String(raw).trim();return {input:id,cadnum:id,status:'ПРЕДСТОИ',geojson:{type:'FeatureCollection',features:[]},note:validId(id)?'Няма заредена проверена геометрия за този идентификатор.':'Невалиден формат на кадастрален идентификатор.'};});
 return {results,summary:{found_count:0,requested_count:ids.length,geometry_area_sum_m2:0,archived_zones:[],note:'Браузърна справка: кадастралният индекс още не е интегриран. Няма удостоверено пресичане и не се генерира геометрия.'},geometry_qa:[]};
}
window.V26BrowserGIS=Object.freeze({lookup});
})();