#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const js=fs.readFileSync(path.join(__dirname,'kt77-04-5-pdf2-strong-legal-renderer.js'),'utf8');
new vm.Script(js);
const draw=[];const context2d={font:'20px Arial',fillStyle:'',strokeStyle:'',textAlign:'left',
  measureText:s=>({width:String(s).length*10}),fillText:s=>draw.push(String(s)),fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},setTransform(){}};
const canvas={getContext:()=>context2d,toDataURL:()=> 'data:image/jpeg;base64,'+Buffer.from('test-page').toString('base64')};
const w={},doc={createElement:tag=>{assert.equal(tag,'canvas');return canvas}};
vm.runInNewContext(js,{window:w,document:doc,TextEncoder,Blob,Uint8Array,atob,URL,Image:class{}});
(async()=>{
 const pdf=await w.V26OfflinePDF.generate({kt77045Normative:true,content:[
  {text:'Източник за проверка: МОСВ',link:'https://www.moew.government.bg/bg/priroda/natura-2000/registri-za-zastiteni-zoni/'},
  {text:'Източник за проверка: ИАОС',link:'https://eea.government.bg/'},
  {text:'чл. 31, ал. 1, т. 2 от ЗБР'}
 ]});
 const bytes=Buffer.from(await pdf.arrayBuffer()).toString('latin1');
 assert(bytes.startsWith('%PDF-1.4'));
 assert.equal((bytes.match(/\/Subtype \/Link/g)||[]).length,2,'Missing actual clickable PDF annotations');
 assert(bytes.includes('/Annots ['),'PDF page must refer to its annotations');
 assert(bytes.includes('https://www.moew.government.bg'),'MOEW official URL not embedded');
 assert(bytes.includes('https://eea.government.bg/'),'EEA official URL not embedded');
 assert(draw.includes('Източник за проверка: МОСВ'),'Short MOEW label missing');
 assert(draw.includes('Източник за проверка: ИАОС'),'Short EEA label missing');
 console.log('PASS KT77 PDF2: two clickable PDF hyperlink annotations with clear МОСВ and ИАОС labels');
})().catch(e=>{console.error(e);process.exitCode=1});
