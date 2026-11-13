const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../kt80/KT82_A_PDF1_V600.js'),'utf8');
function setup(){
 const window={KT77044AutoContext:{buildSVG:()=>'<svg/>'},KT80Display:{
  ekatte:()=> '36676',area:v=>v==null?'НЯМА ДАННИ':String(v),
  percent:v=>String(v)+' %',locality:v=>String(v||'НЯМА ДАННИ')}};
 const code=src.replace(/\}\)\(window\);\s*$/,'window.PDF1Test={bodyContent,areaDecision};})(window);');
 assert.notEqual(src,code);
 vm.runInNewContext(code,{window,document:{readyState:'loading',addEventListener(){}},Date,Set});
 return window;
}
const poly={type:'Polygon',coordinates:[[[24.7,42.1],[24.71,42.1],[24.71,42.11],[24.7,42.11],[24.7,42.1]]]};
const zone={geometry:poly,properties:{SITECODE:'BG0000194',NAME_BG:'Река Чая'}};
function record(id,area){return {input:id,cadnum:id,geojson:{features:[{geometry:poly}]},
 intersection_verified_outside:false,verified_zone_intersections:[{sitecode:'BG0000194',area_m2:area}]};}
function profile(){return {settlement:'Катуница',municipality:'Садово',province:'Пловдив',
 locality:'Попското',area_m2:100,zz:[{sitecode:'BG0000194',intersect_m2:100}],zt:[]};}
test('one and multiple parcels each receive individual map plus overview',()=>{
 for(const count of [1,2,3]){
  const w=setup(),ids=Array.from({length:count},(_,i)=>'36676.129.'+(457+i));
  const content=w.PDF1Test.bodyContent(ids.map(id=>record(id,50)),ids.map(profile),[zone]);
  assert.equal(content.filter(x=>typeof x.svg==='string').length,1);
  assert.equal(content.find(x=>x.parcelGrid)?.parcelGrid.length,count);
 }
});
test('missing verified area never falls back to archival area',()=>{
 const w=setup();
 const out=w.PDF1Test.bodyContent([record('36676.129.457',null),record('36676.129.458',101)],[profile(),profile()],[zone]);
 const zz=out.find(x=>x.table?.body?.[0]?.[1]==='Код и наименование на ЗЗ').table.body;
 assert.equal(zz[1][2],'НЯМА ДАННИ');
 assert.equal(zz[1][3],'НЯМА ДАННИ');
 assert.equal(zz[2][2],'100');
 assert.equal(w.KT82PDF1AreaAudit[0].raw_m2,101);
});
test('over one percent fails closed',()=>{
 const w=setup();
 assert.throws(()=>w.PDF1Test.bodyContent([record('36676.129.457',102)],[profile()],[zone]),/повече от 1/);
});
