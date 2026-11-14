/* KT84: isolated no-regression tests. Run: node --test kt80/tests/kt84-guards.test.mjs */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
const base=path.resolve(import.meta.dirname,'../..');
const load=relative=>fs.readFileSync(path.join(base,relative),'utf8');
test('GIS: only a complete, prefix-consistent and counted 258-shard archive is accepted',async()=>{
 const code=load('v26-test/v26-approved-gis-zip.js');
 const win={zip:{
  BlobReader:class{constructor(file){this.file=file}},
  TextWriter:class{},
  ZipReader:class{constructor(reader){this.reader=reader}getEntries(){return this.reader.file.entries}close(){return Promise.resolve()}}
 }};
 vm.runInNewContext(code,{window:win,document:{},console});
 const geom='00,02,03,04,05,06,07,10,11,12,14,15,16,17,18,20,21,22,23,24,27,29,30,31,32,34,35,36,37,38,39,40,43,44,46,47,48,49,51,52,53,54,55,56,57,58,59,61,62,63,65,66,67,68,69,70,72,73,75,77,78,80,81,83,86,87,99'.split(',');
 const overlap=geom.filter(x=>!['14','18','30','54','65'].includes(x));
 const names=['manifest.json',...geom.flatMap(p=>['parcels','parcelgeom'].map(k=>k+'_'+p+'.json.gz')),...overlap.flatMap(p=>['overlays','overlapgeom'].map(k=>k+'_'+p+'.json.gz'))];
 const manifest={status:'PASS_COUNT_BY_PREFIX',parcel_geometry:917418,parcel_prefixes:67,overlap_records_expected:181154,shards:258};
 const makeFile=(list,m=manifest)=>({name:'approved.zip',entries:list.map(filename=>({filename,directory:false,getData:async()=>JSON.stringify(m)}))});
 assert.equal(names.length,259);
 assert.equal((await win.V26ApprovedGIS.openArchive(makeFile(names))).shards,258);
 await assert.rejects(()=>win.V26ApprovedGIS.openArchive(makeFile(names.filter(x=>x!=='parcelgeom_36.json.gz'))),/258/);
 await assert.rejects(()=>win.V26ApprovedGIS.openArchive(makeFile(names.filter(x=>x!=='manifest.json'))),/манифест/);
 await assert.rejects(()=>win.V26ApprovedGIS.openArchive(makeFile([...names.filter(x=>x!=='parcels_36.json.gz'),'parcels_42.json.gz'])),/префикси/);
 await assert.rejects(()=>win.V26ApprovedGIS.openArchive(makeFile(names,{...manifest,parcel_geometry:5})),/манифест/);
});
test('Dossier: legacy DOC with extracted text is for review, not unread or fully verified',()=>{
 const win={};const doc={addEventListener(){}};
 vm.runInNewContext(load('kt80/KT82_DOSSIER_COMPLETENESS_V34.js'),{window:win,document:doc});
 const intake={files:[
  {filename:'old.doc',status:'текстът е прочетен; ПРОВЕРКА: DOC: таблици'},
  {filename:'letter.pdf',status:'текстът е прочетен'},
  {filename:'scan.pdf',status:'НЕПРОЧЕТЕН: няма извлекаем текст'}
 ]};
 const a=win.KT80DossierCompleteness.audit(intake);
 assert.deepEqual(Array.from(a.records,r=>r.state),['REVIEW_REQUIRED','TEXT_EXTRACTED','NOT_READ']);
 assert.equal(a.filesEnumerated,3);
 assert.equal(a.filesVerifiedWithoutReview,1);
});
test('Stage 1: file selection itself cannot reset or return to dashboard',()=>{
 const src=load('kt80/KT83_WORKFLOW_CASE_V591.js');
 const match=src.match(/\$\('kt80InputFile'\)\.addEventListener\('change',\(\)=>\{([\s\S]*?)\n \}\);/);
 assert.ok(match,'real input change handler must be present');
 const handler=new Function('$','state','say',match[1]);
 const file={name:'p4.zip'},nodes={
  kt80InputFile:{files:[file],value:'file-input-value'},
  kt80SelectedFileName:{textContent:'',title:''},
  kt80InputStatus:{textContent:''}
 };
 const $=id=>nodes[id],messages=[];
 const state={intake:null,fileName:null,generation:0,caseCycleId:'original-cycle'};
 handler($,state,value=>messages.push(value));
 assert.equal(state.generation,0);
 assert.equal(state.caseCycleId,'original-cycle');
 assert.equal(state.fileName,null);
 assert.equal(nodes.kt80SelectedFileName.textContent,'p4.zip');
 assert.match(nodes.kt80InputStatus.textContent,/Обработи преписката/);
 state.intake={files:[{}]};state.fileName='p4.zip';
 nodes.kt80InputFile.files=[{name:'another.zip'}];
 handler($,state,value=>messages.push(value));
 assert.equal(state.caseCycleId,'original-cycle');
 assert.equal(nodes.kt80InputFile.value,'');
 assert.match(messages.at(-1),/Текущите данни не са променени/);
});
test('EG author: clearing a recovered error removes stale text without erasing a normal status',()=>{
 const target={textContent:'Мрежова грешка',dataset:{kt80Error:'true'},setAttribute(name,value){this[name]=value}};
 const doc={readyState:'loading',addEventListener(){},getElementById(){return target}};
 const win={};
 vm.runInNewContext(load('kt80/KT80_GLOBAL_ACTIVITY_V569.js'),{window:win,document:doc});
 win.KT80AdministrativeNotice.clearError('scope');
 assert.equal(target.textContent,'');
 assert.equal(target.role,'status');
 target.textContent='Ново предложение';win.KT80AdministrativeNotice.clearError('scope');
 assert.equal(target.textContent,'Ново предложение');
});
test('Spatial proof and procedural readiness remain fail-closed for missing GIS/legal evidence',()=>{
 const win={};
 vm.runInNewContext(load('kt80/integration/kt83-p2-spatial-gate.js'),{window:win,console});
 vm.runInNewContext(load('kt80/integration/kt83-p5-single-route.js'),{window:win,console});
 const spatial=win.KT83P2SpatialGate.check({caseId:'case',generation:0,evidenceRevision:0,ids:['56784.13.102'],gisDecision:'REQUIRED',live:{ids:[],results:[]},pi:{ids:[],items:[]},zones:[]});
 assert.equal(spatial.ok,false);
 const legal=win.KT83P5SingleRoute.next({step:4,caseId:'case',generation:0,evidenceRevision:0,route:{valid:true,phase:'normative_v11'},confirmedSubject:true,confirmedScope:true,verifiedLaw:{ok:false}});
 assert.notEqual(legal.ready,true);
});
