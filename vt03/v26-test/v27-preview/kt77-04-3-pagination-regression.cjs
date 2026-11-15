#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=n=>fs.readFileSync(path.join(__dirname,n),'utf8');
const base=read('V27_27_KT77_04_2_R3_PDF1_FOUR_PARCELS_CACHE_SAFE.html');
const next=read('V27_27_KT77_04_3_PDF1_PAGINATION_ONLY.html');
const prev='v27-preview/kt77-04-2-offline-pdf-hires.js?v=kt77-042-3-pi-bold';
const now='v27-preview/kt77-04-2-offline-pdf-hires.js?v=kt77-043-pagekeep';
assert.equal(next.replace(now,prev),base,'New HTML must differ only in fallback PDF1 pagination renderer version');
const renderer=read('kt77-04-2-offline-pdf-hires.js');
new vm.Script(renderer,{filename:'kt77-04-2-offline-pdf-hires.js'});
assert(renderer.includes('if(!normativePdf&&sub&&items[itemIndex+1]?.table&&y>95)'));
assert(renderer.includes('y+minRequired>H-100'));
assert(renderer.includes('rows.length>1&&y>95&&y+tableMinimumHeight(item.table)>H-100'));
assert(renderer.includes("normativePdf?'ТПУ Пловдив · Нормативни референции'"),'Normative PDF2 route must remain unchanged');
const drawings=[];let n=0;
const document={createElement(tag){
 assert.equal(tag,'canvas');
 const page=++n,draw=[];
 drawings.push(draw);
 const ctx={font:'22px Arial',fillStyle:'#000',strokeStyle:'#fff',textAlign:'left',
   measureText:t=>({width:String(t).length*10}),
   fillText:t=>draw.push(String(t)),fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},setTransform(){}};
 return {getContext:()=>ctx,toDataURL:()=> 'data:image/jpeg;base64,'+Buffer.from('minimal-test-jpeg').toString('base64')};
}};
const context={window:{},document,TextEncoder,Blob,Uint8Array,URL,Image:class{},atob:s=>Buffer.from(s,'base64').toString('binary')};
vm.runInNewContext(renderer,context);
const filler=Array.from({length:36},(_,i)=>({text:'Обикновен текст '+(i+1)}));
const table={table:{headerRows:1,body:[
  ['Поземлен имот','Код и наименование на ЗЗ','Пресичане (кв. м)','Дял от имота'],
  ['56784.13.102','Няма защитена зона','—','—'],
  ['36676.129.457','BG0000194 — Река Чая','16 609,10','100,00 %']
]}};
(async()=>{
 await context.window.V26OfflinePDF.generate({content:[{text:'Начало на ГИС документа'},...filler,
  {text:'А. Защитени зони от мрежата „Натура 2000“ (ЗБР)',style:'sub'},table,
  {text:'Б. Защитени територии (ЗЗТ)',style:'sub'},
  {table:{headerRows:1,body:[['Имот','ЗТ'],['47086.6.15','Тракийски равнец']]}}
 ]});
 assert(drawings.length>=2,'Test case must cover a page boundary');
 const caption='А. Защитени зони от мрежата „Натура 2000“ (ЗБР)';
 const headingPage=drawings.findIndex(x=>x.includes(caption));
 const headerPage=drawings.findIndex(x=>x.includes('Поземлен имот'));
 const firstRowPage=drawings.findIndex(x=>x.some(t=>t.includes('56784.13.102')));
 assert(headingPage>=1,'A title should move away from the crowded first page');
 assert.equal(headingPage,headerPage,'Title and table header split across pages');
 assert.equal(headerPage,firstRowPage,'Table header and first data row split across pages');
 console.log('PASS KT77-04.3: content-preserving pagination, title + header + first data row remain together, no PDF2 renderer change');
})().catch(e=>{console.error(e);process.exitCode=1});
