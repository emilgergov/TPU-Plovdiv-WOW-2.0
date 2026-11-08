#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const rd=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const old=rd('V27_27_KT77_04_3_PDF1_PAGINATION_ONLY.html');
const now=rd('V27_27_KT77_04_4_CONTEXT_ALL_AND_PDF1_AUTO_PREVIEW.html');
let norm=now.replace('v27-preview/kt77-04-4b-pdf1-generator-auto-context-preview.js?v=kt77-044b-1','v27-preview/kt77-04-2-pdf1-approved-10-edits-preview.js?v=kt77-042-3-area-inline');
norm=norm.replace('<script src="v27-preview/kt77-04-4b-pdf1-auto-context.js?v=kt77-044b-1"></script>\n','').replace('<script src="v27-preview/kt77-04-4a-multi-context-red-points.js?v=kt77-044a-1"></script>\n','');
assert.equal(norm,old,'KT77-04.3 locked HTML must be unchanged except 3 opt-in scripts');
const marker=rd('kt77-04-4a-multi-context-red-points.js'),builder=rd('kt77-04-4b-pdf1-auto-context.js'),pack=rd('kt77-04-4b-pdf1-generator-auto-context-preview.js');
new vm.Script(marker);new vm.Script(builder);new vm.Script(pack);
assert(marker.includes("context.addEventListener('click',()=>{if(validIds().length>1)showAll.click()},true)"));
assert(marker.includes("getScreenCTM()"));
assert(marker.includes('getBBox()'));
assert(marker.includes('requestAnimationFrame(refresh)'));
assert(marker.includes("data"+"set.cadnum=id"));
assert(marker.includes('markers=new Map()'));
assert(marker.includes("parent.classList.add('kt77-044-active')"));
const prevGen=rd('kt77-04-2-pdf1-approved-10-edits-preview.js');
const a=" if(options.kt77044ContextSvg&&String(options.kt77044ContextSvg).includes('<svg')){\n  content.push({text:'Общ пространствен контекст на анализираните поземлени имоти',style:'sub'});\n  content.push({svg:options.kt77044ContextSvg,width:510,margin:[0,5,0,10]});\n }\n";
const b="const kt77044ContextSvg=kt77044RequiredContextSvg(results,register?.zoneFeatures||[],kt77041ZtFindings);\n ";
const c=",kt77044ContextSvg";
const d=",kt77044ContextSvg:kt77044RequiredContextSvg(results,register?.zoneFeatures||[],findings)";
assert(pack.includes(a)&&pack.includes(b)&&pack.includes(d));
const helperStart=pack.indexOf("function kt77044RequiredContextSvg(results,zoneFeatures,findings){");
const helperEnd=pack.indexOf("function gisPdf(results,options={}){",helperStart);
assert(helperStart>0&&helperEnd>helperStart,'Automatic context fail-closed helper missing');
const helper=pack.slice(helperStart,helperEnd);
assert(helper.includes("throw Error("),'Cannot silently omit PDF1 context');
let normalized=pack.replace(helper,'').replace(a,'').replace(b,'').replace(d,'').replace("kt77041ZtFindings,kt77044ContextSvg","kt77041ZtFindings").replace('if(kind===2)return pdfBlob(normativePdf(results,register));const findings=await kt77041Findings(results);return pdfBlob(gisPdf(results,{...register,kt77041ZtFindings:findings','return kind===2?pdfBlob(normativePdf(results,register)):pdfBlob(gisPdf(results,{...register,kt77041ZtFindings:await kt77041Findings(results)');
assert.equal(normalized,prevGen,'Word/PDF2 and all existing PDF1 source must be byte-identical once isolated context additions removed');
const window={};vm.runInNewContext(builder,{window,globalThis:window,Math});
const rect=(x,y,w,h)=>({type:'Polygon',coordinates:[[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]]]});
const records=[
 {cadnum:'56784.13.102',geojson:{features:[{geometry:rect(24.7,42.1,.001,.001)}]}},
 {cadnum:'36676.129.457',geojson:{features:[{geometry:rect(24.8,42.2,.001,.001)}]}},
 {cadnum:'47086.6.15',geojson:{features:[{geometry:rect(24.9,42.3,.001,.001)}]}},
 {cadnum:'46989.205.218',geojson:{features:[{geometry:rect(25.0,42.4,.001,.001)}]}}
];
const res=window.KT77044AutoContext.buildSVG(records,[{geometry:rect(24.6,42,0.5,0.5)}]);
assert(res.startsWith('<svg'));
assert.equal((res.match(/fill="#dc2626"/g)||[]).length,4,'every found parcel must yield one red point');
for(const r of records)assert(res.includes(r.cadnum),'map legend must identify all four parcels');
assert(res.includes('stroke="#176b53"'),'available Natura geometry should be drawn');

const findings=[
 {cadnum:'56784.13.102',zones:[],territories:[]},
 {cadnum:'36676.129.457',zones:[{code:'BG0000194',name:'Река Чая'}],territories:[]},
 {cadnum:'47086.6.15',zones:[],territories:[{category:'Защитена местност',name:'Тракийски равнец'}]},
 {cadnum:'46989.205.218',zones:[{code:'BG0001031',name:'Родопи – Средни'}],territories:[{category:'Природна забележителност',name:'Свети Дух'}]}
];
const named=window.KT77044AutoContext.buildSVG(records,[{geometry:rect(24.6,42,0.5,0.5)}],findings);
for(const name of ['BG0000194','Река Чая','BG0001031','Родопи – Средни','Тракийски равнец','Свети Дух'])assert(named.includes(name),'Missing validated protected-area name '+name);
assert(named.includes('ЗЗ (ЗБР):')&&named.includes('ЗТ (ЗЗТ):'),'Separate ZZ and ZT factual name labels');
assert(!named.includes('граница на ЗТ'),'Do not suggest an unverified ZT polygon');
assert(named.indexOf('Червена точка')<named.indexOf('1. ПИ')&&named.indexOf('1. ПИ')<named.indexOf('ЗЗ (ЗБР):'),'Legend, parcel IDs and protection names must have separated positions');
assert.throws(()=>window.KT77044AutoContext.buildSVG(records,[],findings.slice(1)),/does not match requested cadastral IDs/);

assert(!builder.includes('zoneContext'),'auto-context must NEVER depend on Context button state');
assert.throws(()=>window.KT77044AutoContext.buildSVG([{cadnum:'1',geojson:{features:[]}}]),/missing confirmed geometry/);
console.log('PASS KT77-04.4: all 4 red markers, automatic PDF1 GIS context, unused Context button, preserved prior HTML/Word/PDF2');
