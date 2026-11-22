'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve(__dirname,'../..');
const gate=fs.readFileSync(path.join(__dirname,'KT134_SPATIAL_GATE_CONSISTENCY.js'),'utf8');
const pdf=fs.readFileSync(path.join(__dirname,'KT82_A_PDF1_V600_KT134_CANDIDATE.js'),'utf8');
const automatic=fs.readFileSync(path.join(base,'vt03/kt80/integration/kt83-p2-automatic-pdf1.js'),'utf8');
const id='99999.999.999';
const poly={type:'Polygon',coordinates:[[[24.6,42.1],[24.61,42.1],[24.61,42.11],[24.6,42.11],[24.6,42.1]]]};
class BlobMock{constructor(parts){this.data=parts.join('');this.size=this.data.length}slice(a,b){return{text:async()=>this.data.slice(a,b)}}}
async function scenario(name,opts={}){
 const listeners=new Map(),events=[],downloads=[],status={textContent:''},button={disabled:false,addEventListener(){}};
 const elements={kt80ParcelInput:{value:id,addEventListener(){}},kt80PDF1:button,kt80PDF1Status:status,
 kt80FindParcels:{addEventListener(){}},kt83P1RouteText:{textContent:''}};
 const doc={readyState:'complete',getElementById:key=>elements[key]||null,addEventListener(type,handler){
 listeners.set(type,[...(listeners.get(type)||[]),handler])},dispatchEvent(event){
 events.push(event.type);for(const cb of listeners.get(event.type)||[])cb(event)},
 createElement:()=>({click(){downloads.push('PDF1')},remove(){},setAttribute(){}}),body:{append(){}}};
 const zones=Array.from({length:32},(_,i)=>({type:'Feature',geometry:poly,properties:{SITECODE:'BG'+String(i).padStart(7,'0'),NAME_BG:'Тестова зона'}}));
 const root={setTimeout(){},KT80WorkflowState:{step:3,caseCycleId:'CASE_123',generation:1,
 normativeGate:{expertConfirmed:true,decision:'REQUIRED'}},
 KT82EvidenceInvalidation:{getRevision:()=>0},
 KT80FreeGISResults:{ids:[id],results:[{input:id,cadnum:id,status:'Намерен',geojson:{features:[{geometry:poly}]},
 verified_zone_intersections:opts.intersections??[],intersection_verified_outside:opts.outside??true}]},
 V26ParcelEditor:{normalize:()=>({ids:[id],invalid:[],uncertain:[]})},
 KT80PIMaster:{getResult:()=>({ids:[id],items:[{status:'FOUND',profile:{area_m2:500,settlement:'Тестово',
 municipality:'Пловдив',province:'Пловдив',locality:'поле',zz:[],zt:[]}}]})},
 KT80FreeGIS:{getMap:()=>({zones})},KT77044AutoContext:{buildSVG:()=>'<svg/>'},
 KT80Display:{ekatte:()=> '99999',area:x=>String(x??'НЯМА ДАННИ'),locality:String,percent:x=>String(x)+'%'},
 V26KT12Overlay:{async verify(rows){if(opts.changeCase)root.KT80WorkflowState.caseCycleId='CASE_OTHER';
 for(const r of rows){r.verified_zone_intersections=opts.intersections??[];
 r.intersection_verified_outside=opts.outside??true}}},
 KT80V22PDF:{async generate(){return new BlobMock(['%PDF-1.4\n'+'X'.repeat(500)])}}};
 const customEvent=class{constructor(type,args){this.type=type;this.detail=args.detail}};
 const context={window:root,document:doc,Blob:BlobMock,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},
 CustomEvent:customEvent,setTimeout(){},console};
 vm.runInNewContext(gate,context,{filename:'KT134_SPATIAL_GATE_CONSISTENCY.js'});
 vm.runInNewContext(pdf,context,{filename:'KT82_A_PDF1_V600_KT134_CANDIDATE.js'});
 vm.runInNewContext(automatic,context,{filename:'kt83-p2-automatic-pdf1.js'});
 const initial=root.KT83P2Automatic.check();
 doc.dispatchEvent(new customEvent('kt80:stage-open',{detail:{step:3}}));
 await Promise.resolve();await Promise.resolve();await Promise.resolve();
 const allowed=opts.allowed??true,expectedDownload=allowed&&!opts.changeCase?1:0;
 assert.equal(initial.ok,allowed,name+': gate');
 assert.equal(downloads.length,expectedDownload,name+': download count');
 assert.equal(events.filter(e=>e==='kt82:pdf1-completed').length,expectedDownload,name+': receipt');
 assert.equal(button.disabled,false,name+': button must be enabled');
 if(opts.changeCase)assert.match(status.textContent,/Преписката е променена/);
 console.log('PASS: '+name);
}
(async()=>{
 await scenario('confirmed outside');
 await scenario('verified overlap',{intersections:[{sitecode:'BG0000000',area_m2:100}],outside:false});
 await scenario('contradictory overlap',{intersections:['BG0000000'],outside:true,allowed:false});
 await scenario('indeterminate outside',{intersections:[],outside:false,allowed:false});
 await scenario('case changed during verification',{changeCase:true});
 console.log('KT134 Stage3 → automatic PDF1: 5/5');
})().catch(e=>{console.error(e);process.exitCode=1});
