#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=x=>fs.readFileSync(path.join(__dirname,x),'utf8');
const parent=read('V27_27_KT77_04_4_R2_CONTEXT_NAMED_ZZ_ZT.html');
const next=read('V27_27_KT77_04_4_R3_CONTEXT_LABELS_ONLY.html');
assert.equal(next.replace('v27-preview/kt77-04-4c-pdf1-context-labels-only.js?v=kt77-044c-1','v27-preview/kt77-04-4b-pdf1-auto-context.js?v=kt77-044b-r2-names'),parent,'No unrelated changes allowed');
const js=read('kt77-04-4c-pdf1-context-labels-only.js');new vm.Script(js);
assert(js.includes('No repeated cadastral list'),'No-list contract');
assert(!js.includes("parcelLabels.push("),'Cadastral IDs must not be repeated in schematic');
const window={};vm.runInNewContext(js,{window,Math});
const ring=(x,y,w,h)=>({type:'Polygon',coordinates:[[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]]]});
const ids=['56784.13.102','36676.129.457','47086.6.15','46989.205.218'];
const results=ids.map((cadnum,i)=>({cadnum,geojson:{features:[{geometry:ring(24.5+i*.14,42.2+i*.04,.0006,.0006)}]}}));
const findings=[
 {cadnum:ids[0],zones:[],territories:[]},
 {cadnum:ids[1],zones:[{code:'BG0000194',name:'Река Чая'}],territories:[]},
 {cadnum:ids[2],zones:[],territories:[{category:'Защитена местност',name:'Тракийски равнец'}]},
 {cadnum:ids[3],zones:[{code:'BG0001031',name:'Родопи – Средни'}],territories:[{category:'Природна забележителност',name:'Свети Дух'}]}
];
const zones=[{properties:{SITECODE:'BG0000194'},geometry:ring(24.5,42.2,.1,.13)},{properties:{SITECODE:'BG0001031'},geometry:ring(24.75,42.3,.25,.23)}];
const svg=window.KT77044AutoContext.buildSVG(results,zones,findings);
assert.equal((svg.match(/fill="#dc2626"/g)||[]).length,4,'Exactly 4 parcel dots');
assert.equal((svg.match(/<rect [^>]*rx="5"/g)||[]).length,4,'Exactly 4 floating ZZ/ZT label boxes');
for(const token of ['BG0000194','Река Чая','BG0001031','Родопи – Средни','Тракийски равнец','Свети Дух'])
 assert(svg.includes(token),'Missing named spatial label '+token);
for(const id of ids)assert(!svg.includes(id),'Cadastral IDs repeated in context');
assert(!svg.includes('1. ПИ')&&!svg.includes('ЗЗ (ЗБР):'),'Context must not be an inventory list');
assert(svg.includes('Етикет ЗТ — само ГИС констатация'),'ZT must not imply drawn ZT boundaries');
assert(!js.includes('zoneContext'),'PDF1 must not depend on button');
console.log('PASS: 4 red pins, four in-map names, no cadastral inventories, no ZT boundaries, isolated HTML changes');
