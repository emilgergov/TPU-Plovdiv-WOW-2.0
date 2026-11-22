'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'KT82_A_PDF1_V600_KT134_CANDIDATE.js'),'utf8');
const id='99999.999.999';
const square=[[[24.6,42.1],[24.61,42.1],[24.61,42.11],[24.6,42.11],[24.6,42.1]]];
const feature={type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:square}};
const zones=Array.from({length:32},(_,i)=>({...feature,properties:{SITECODE:'BG'+String(i).padStart(7,'0'),NAME_BG:'Тестова зона '+i}}));
const pdfBlob=new Blob(['%PDF-1.4\n', 'X'.repeat(250)],{type:'application/pdf'});
function fixture({intersection=[],outside=true,missingProfile=false,shortZones=false,invalidGeometry=false,changeDuringVerify=false,invalidPdf=false}={}){
 const events=[],downloads=[],elems={
   kt80ParcelInput:{value:id,addEventListener(){}},
   kt80PDF1:{disabled:false,addEventListener(){}},
   kt80PDF1Status:{textContent:''},
   kt80FindParcels:{addEventListener(){}}
 };
 const urls=[];
 const document={
   readyState:'complete',
   getElementById(k){return elems[k]||null},
   addEventListener(){},
   dispatchEvent(e){events.push(e)},
   createElement(tag){
     if(tag==='a')return {href:'',download:'',click(){downloads.push(this.download)},remove(){}};
     return {textContent:'',setAttribute(){}};
   },
   body:{append(){}}
 };
 const root={
   KT80WorkflowState:{caseCycleId:'CASE_A',generation:1},
   KT82EvidenceInvalidation:{getRevision:()=>4},
   KT80FreeGISResults:{ids:[id],results:[{input:id,cadnum:id,status:'Намерен',geojson:{features:invalidGeometry?[]:[feature]}}]},
   V26ParcelEditor:{normalize(){return {ids:[id],invalid:[],uncertain:[]}}},
   KT80PIMaster:{getResult(){return {ids:[id],items:[missingProfile?{status:'NOT_FOUND'}:{status:'FOUND',profile:{
     settlement:'Тестово село',municipality:'Тестова община',province:'Пловдив',
     locality:'Тестова местност',area_m2:500,zz:[],zt:[]
   }}]}}},
   KT80FreeGIS:{getMap(){return {zones:shortZones?zones.slice(0,31):zones}}},
   KT77044AutoContext:{buildSVG(){return '<svg xmlns="http://www.w3.org/2000/svg"></svg>'}},
   KT80Display:{ekatte(){return '99999'},area(v){return v==null?'НЯМА ДАННИ':String(v)},locality(v){return String(v)},percent(v){return String(v)+'%'}},
   V26KT12Overlay:{async verify(rows){
     if(changeDuringVerify)root.KT80WorkflowState.caseCycleId='CASE_B';
     rows.forEach(r=>{r.verified_zone_intersections=intersection;r.intersection_verified_outside=outside});
   }},
   KT80V22PDF:{async generate({content}){root.generatedContent=content;return invalidPdf?new Blob(['bad']):pdfBlob}}
 };
 const context={window:root,document,Blob,URL:{createObjectURL(){urls.push('blob:kt134');return 'blob:kt134'},revokeObjectURL(){}},
  CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail}},XMLSerializer:class{},
  setTimeout(){},console};
 vm.runInNewContext(script,context);
 assert.equal(typeof root.KT80PDF1Bridge?.makePDF,'function','PDF1 bridge should initialize');
 return {root,document,events,downloads,elems,urls};
}
async function test(name,opts,checks){
 const f=fixture(opts);
 await f.root.KT80PDF1Bridge.makePDF();
 checks(f);
 console.log('PASS',name);
}
(async()=>{
 await test('successful PDF1 and receipt',{},f=>{
   assert.equal(f.downloads.length,1);
   const receipt=f.events.find(e=>e.type==='kt82:pdf1-completed')?.detail;
   assert(receipt,'completion event');
   assert.equal(receipt.caseId,'CASE_A');assert.equal(receipt.generation,1);
   assert.equal(receipt.evidenceRevision,4);assert.equal(receipt.ids[0],id);
   assert(f.root.generatedContent.some(c=>c.text?.includes('ЕКАТТЕ 99999')));
   assert(f.root.generatedContent.some(c=>c.text?.includes('община Тестова община')));
 });
 await test('valid confirmed intersection',{intersection:[{sitecode:'BG0000000',area_m2:150}],outside:false},f=>{
   assert.equal(f.downloads.length,1);assert.equal(f.events.filter(e=>e.type==='kt82:pdf1-completed').length,1);
 });
 await test('contradictory inside and outside blocked',{intersection:['BG0000000'],outside:true},f=>{
   assert.equal(f.downloads.length,0);assert.match(f.elems.kt80PDF1Status.textContent,/Противоречиви/);
 });
 await test('uncertain no-intersection blocked',{intersection:[],outside:false},f=>{
   assert.equal(f.downloads.length,0);assert.match(f.elems.kt80PDF1Status.textContent,/Непотвърден/);
 });
 await test('invalid parcel geometry blocked',{invalidGeometry:true},f=>{
   assert.equal(f.downloads.length,0);assert.match(f.elems.kt80PDF1Status.textContent,/геометрия/);
 });
 await test('PI MASTER incomplete blocked',{missingProfile:true},f=>{
   assert.equal(f.downloads.length,0);assert.match(f.elems.kt80PDF1Status.textContent,/ПИ MASTER/);
 });
 await test('missing zone dataset blocked',{shortZones:true},f=>{
   assert.equal(f.downloads.length,0);assert.match(f.elems.kt80PDF1Status.textContent,/непълни граници/);
 });
 await test('case change during GIS verify cancels PDF',{changeDuringVerify:true},f=>{
   assert.equal(f.downloads.length,0);assert.equal(f.events.filter(e=>e.type==='kt82:pdf1-completed').length,0);
 });
 await test('invalid PDF signature blocked',{invalidPdf:true},f=>{
   assert.equal(f.downloads.length,0);assert.match(f.elems.kt80PDF1Status.textContent,/PDF1 не е генериран/);
 });
 console.log('KT134 lifecycle 9/9');
})().catch(e=>{console.error(e);process.exitCode=1});
