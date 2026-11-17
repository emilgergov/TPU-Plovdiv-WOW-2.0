#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const rd=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const old=rd('V27_27_KT77_04_4_R3_CONTEXT_LABELS_ONLY.html'),now=rd('V27_27_KT77_04_4_R4_CONTEXT_ADMIN_PAGINATION.html');
assert.equal(now.replace('v27-preview/kt77-04-4d-offline-pdf-pagekeep.js?v=kt77-044d-1','v27-preview/kt77-04-2-offline-pdf-hires.js?v=kt77-043-pagekeep'),old,'Only PDF1 renderer script changed');
const base=rd('kt77-04-2-offline-pdf-hires.js'),next=rd('kt77-04-4d-offline-pdf-pagekeep.js');
new vm.Script(next);
assert(next.includes("else if(following&&typeof following.text==='string')"));
assert(next.includes('nextHeight=nextLines.length*'));
assert(next.includes('finish();start();ctx.font='));
const oldGuard=base.slice(base.indexOf('  if(!normativePdf&&sub&&items[itemIndex+1]?.table&&y>95){'),base.indexOf("  ctx.font=(title?'bold 35px'",base.indexOf('  if(!normativePdf&&sub&&items[itemIndex+1]?.table&&y>95){')));
const newGuard=next.slice(next.indexOf('  if(!normativePdf&&sub&&y>95){'),next.indexOf("  ctx.font=(title?'bold 35px'",next.indexOf('  if(!normativePdf&&sub&&y>95){')));
const newLine="if(y+LINE>H-95){finish();start();ctx.font=(title?'bold 35px':sub?'bold 26px':item.bold?'bold 22px':'22px')+' Arial'}";
assert.equal(next.replace(newGuard,oldGuard).replace(newLine,'if(y+LINE>H-95){finish();start()}'),base,'All prior PDF2/PDF1 code byte-identical outside layout patch');
const pages=[];let current=[];
const document={createElement(tag){assert.equal(tag,'canvas');current=[];pages.push(current);
const ctx={font:'22px Arial',fillStyle:'',strokeStyle:'',textAlign:'left',measureText:s=>({width:String(s).length*10}),fillText(s,x,y){current.push({text:String(s),font:this.font,y});},fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},setTransform(){}};
return {getContext:()=>ctx,toDataURL:()=> 'data:image/jpeg;base64,'+Buffer.from('jpeg-placeholder').toString('base64')};}};
const win={},context={window:win,document,TextEncoder,Uint8Array,Blob,URL,Image:class{},atob:s=>Buffer.from(s,'base64').toString('binary')};
vm.runInNewContext(next,context);
(async()=>{
const content=[...Array.from({length:51},(_,i)=>({text:'Проверен текст '+i})),
{text:'Административна принадлежност на поземлените имоти',style:'sub'},
{text:'ПИ 56784.13.102 по КККР на гр. Пловдив. Площ на имота: 3 434,71 кв. м'},
{text:'ПИ 36676.129.457 по КККР на с. Катуница. Площ на имота: 16 609,10 кв. м'}];
await win.V26OfflinePDF.generate({content});
const title='Административна принадлежност на поземлените имоти';
const titlePage=pages.findIndex(p=>p.some(x=>x.text.startsWith('Административна принадлежност'))),firstPage=pages.findIndex(p=>p.some(x=>x.text==='56784.13.102'));
assert(titlePage>=0&&firstPage>=0);
assert.equal(titlePage,firstPage,'Orphan administrative heading');
const txt=pages[firstPage].find(x=>x.text==='ПИ '||x.text===' по КККР на гр. Пловдив. Площ на имота: 3 434,71 кв. м');
assert(txt.font.startsWith('22px'),'Paragraph inherited bold page header font');
console.log('PASS KT77-04.4D: heading and first administrative paragraph stay together; typography stable; locked generator unchanged');
})().catch(e=>{console.error(e);process.exitCode=1});
