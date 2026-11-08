#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname,read=f=>fs.readFileSync(path.join(root,f),'utf8');
const old=read('kt67-2-draft-package.js');
const curr=read('kt77-04-1-pdf1-pi-master-zt-preview.js');
const source=read('V27_27_KT77_03_R11_ZZT_ARCHIVE_ACCEPTANCE.html');
const preview=read('V27_27_KT77_04_1_PDF1_PI_MASTER_ZT_PREVIEW.html');
const oldScript='<script src="v27-preview/kt67-2-draft-package.js?v=kt67-2-draft-1">';
const newScript='<script src="v27-preview/kt77-04-1-pdf1-pi-master-zt-preview.js?v=kt77-041-preview-1">';
assert(source.includes(oldScript)&&preview.includes(newScript));
assert.equal(preview.replace(newScript,oldScript),source,'HTML must be byte-identical except PDF1 generator script');
assert(!source.includes(newScript),'original KT77-03 must stay pristine');
const s0='function gisPdf(results,options={}){';
const s1=" content.push({text:'Посочените площи са изчислени от ГИС геометрията и не заместват актуалната кадастрална площ. Пресичанията са пространствен резултат, а не самостоятелна правна оценка.',fontSize:8,margin:[0,3,0,0]});";
const methodStart='/* KT77-04.1: READ-ONLY additional ZT spatial findings.';
const methodEnd=s0;
const mStart=curr.indexOf(methodStart),mEnd=curr.indexOf(methodEnd,mStart);
assert(mStart>0&&mEnd>mStart);
const method=curr.slice(mStart,mEnd);
const appendixBegin=' if(options.kt77041ZtFindings){';
const appendixEnd='\n'+s1;
const start=curr.indexOf(appendixBegin,mEnd),end=curr.indexOf(appendixEnd,start);
assert(start>0&&end>start);
const appendix=curr.slice(start,end);
assert(appendix.includes("Източник: ПИ MASTER"));
const pdfOrig='const pdf1=await pdfBlob(gisPdf(results,register))';
const pdfNew='const kt77041ZtFindings=await kt77041Findings(results);\n const pdf1=await pdfBlob(gisPdf(results,{...register,kt77041ZtFindings}))';
const standaloneOrig='return pdfBlob(kind===2?normativePdf(results,register):gisPdf(results,register))';
const standaloneNew='return kind===2?pdfBlob(normativePdf(results,register)):pdfBlob(gisPdf(results,{...register,kt77041ZtFindings:await kt77041Findings(results)}))';
const restored=curr.slice(0,mStart)+curr.slice(mEnd+1);
const restored2=restored.replace('\n'+appendix+'\n','').replace(pdfNew,pdfOrig).replace(standaloneNew,standaloneOrig);
assert.equal(restored2,old,'The only differences to approved generator must be added PDF1 ZT table and GIS lookup; Word/PDF2 byte identical');
assert.equal((curr.match(/kt77041Findings\(results\)/g)||[]).length,3);
assert(!curr.includes('window.V26NormativeRegister.records.push'));
assert(!/zt.*scenario_override\s*=/.test(curr));
const sourceReader='async function kt77041Findings(results)';
const sourceStart=curr.indexOf(sourceReader,mStart);
assert(sourceStart>mStart);
const sourceEnd=curr.indexOf('\nfunction gisPdf(',sourceStart);
const extract=curr.slice(sourceStart,sourceEnd);
const parcelSamples={
 '46989.205.218':{cadnum:'46989.205.218',zz:[{code:'BG0001031'}],zt:[{category:'Природна забележителност',name:'СВЕТИ ДУХ',area_m2:2878.449,percent:99.832}]},
 '56784.13.102':{cadnum:'56784.13.102',zz:[],zt:[]},
 '47086.6.15':{cadnum:'47086.6.15',zz:[],zt:[{category:'Защитена местност',name:'ТРАКИЙСКИ РАВНЕЦ',area_m2:100,percent:10}]}
};
const index={lookup:async id=>parcelSamples[id]?{status:'FOUND',profile:parcelSamples[id]}:{status:'NOT_IN_VALIDATED_CADASTRE'}};
const context={window:{KT77PiMasterIndex:{create:base=>{assert(String(base).includes('gis-data/pi-master/browser-index'));return index;}}},URL,document:{baseURI:'https://emilgergov.github.io/TPU-Plovdiv-WOW-2.0/v26-test/'}};
vm.createContext(context);
vm.runInContext(extract+'\nthis.kt77041Findings=kt77041Findings',context);
(async()=>{
 const rows=await context.kt77041Findings([{input:'46989.205.218'},{input:'56784.13.102'}]);
 assert.equal(rows.length,2);
 assert.equal(rows[0].territories[0].name,'СВЕТИ ДУХ');
 assert.equal(rows[0].territories[0].area_m2,2878.449);
 assert.equal(rows[1].territories.length,0,'No unverified protected territory fabricated');
 const onlyZT=await context.kt77041Findings([{input:'47086.6.15'}]);
 assert.equal(onlyZT[0].territories.length,1);
 assert.equal(parcelSamples['47086.6.15'].zz.length,0,'ZT-only parcel remains no Natura 2000 intersections');
 await assert.rejects(()=>context.kt77041Findings([{input:'99999.999.9999'}]),/липсва проверен регистърен профил/);
 const bad={...parcelSamples['46989.205.218'],zt:[{category:'Природна забележителност',name:'СВЕТИ ДУХ',area_m2:3000,percent:109}]};
 index.lookup=async()=>({status:'FOUND',profile:bad});
 await assert.rejects(()=>context.kt77041Findings([{input:'46989.205.218'}]),/некоректни данни/);
 console.log('PASS KT77-04.1: byte-identical approved HTML/Word/PDF2, PDF1-only PI MASTER ZT facts, absent ZT, ZT-only scenario A, invalid/missing source fail-closed');
})().catch(e=>{console.error(e);process.exitCode=1});
