// KT82 V60.3 — actual GIS engine async race regression (node --test).
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../kt80/KT82_A_FREE_GIS_V603.js'),'utf8');
function boot(){
 const handlers={};const nodes={};
 for(const id of ['kt80FindParcels','kt80ParcelInput','kt80GISStatus','kt80GISMapEmpty','kt80GISMapCaption','kt80GISDetail','kt80GISZones','kt80GISParcels','kt80GISOverlaps','kt80GISLabels','kt80GISResults']){
  nodes[id]={value:'',disabled:false,hidden:false,textContent:'',addEventListener(name,fn){(this.handlers??={})[name]=fn},replaceChildren(){}};
 }
 nodes.kt80ParcelInput.value='36676.129.457';
 let resolveLookup;const wait=new Promise(resolve=>{resolveLookup=resolve});
 const root={V26ParcelEditor:{normalize:v=>({ids:v?String(v).trim().split(/\s*;\s*/):[],invalid:[],uncertain:[]})},
   V26BrowserGIS:{lookup:()=>wait},KT80Display:{area:n=>String(n)}};
 const document={readyState:'complete',getElementById:id=>nodes[id]||null,addEventListener:(name,fn)=>(handlers[name]??=[]).push(fn),dispatchEvent:e=>(handlers[e.type]||[]).forEach(f=>f(e))};
 vm.runInNewContext(src,{window:root,document,CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts.detail}},fetch:()=>Promise.reject(Error('unexpected fetch'))});
 return {root,document,nodes,resolveLookup};
}
test('late GIS lookup from old dossier cannot publish its results to new dossier',async()=>{
 const t=boot();
 const old=t.root.KT80FreeGIS.find();
 t.document.dispatchEvent({type:'kt80:case-change'});
 t.resolveLookup({results:[{input:'36676.129.457',status:'Намерен',geojson:{features:[]}}]});
 await old;
 assert.equal(t.root.KT80FreeGISResults,null);
 assert.equal(t.root.KT80FreeGIS.getResults().length,0);
 assert.equal(t.nodes.kt80FindParcels.disabled,false);
});
test('reset also cancels pending GIS lookup',async()=>{
 const t=boot();const old=t.root.KT80FreeGIS.find();
 t.document.dispatchEvent({type:'kt80:case-reset'});
 t.resolveLookup({results:[{input:'36676.129.457',status:'Намерен'}]});
 await old;
 assert.equal(t.root.KT80FreeGISResults,null);
 assert.equal(t.root.KT80FreeGIS.getResults().length,0);
});
