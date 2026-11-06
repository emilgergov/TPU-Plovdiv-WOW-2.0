'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const fflate=require('fflate'),{DOMParser,XMLSerializer}=require('@xmldom/xmldom');
const base='v26-test/v27-preview/';
const page=fs.readFileSync(base+'KT76_05_UNIFIED_ZIP_TEST.html','utf8');
const oldPage=fs.readFileSync(base+'KT76_04_EXPERT_GIS_TEST.html','utf8');
assert(page.includes('KT7605UnifiedQA.verify(kt7604.blob'));
assert(page.includes('kt76-05-unified-zip-qa.js?v=kt76-05-1'));
assert(!oldPage.includes('KT7605UnifiedQA'));
for(const [i,m] of [...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].entries())
 if(m[1].trim())new vm.Script(m[1],{filename:'inline '+i});
const code=fs.readFileSync(base+'kt76-05-unified-zip-qa.js','utf8');
const ctx={window:{fflate},fflate,DOMParser,XMLSerializer,TextEncoder,TextDecoder,Blob,console,Error};
vm.createContext(ctx);vm.runInContext(code,ctx);
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const escape=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;');
function paragraph(text,bold=false){return '<w:p><w:r><w:rPr>'+(bold?'<w:b/>':'')+'</w:rPr><w:t xml:space="preserve">'+escape(text)+'</w:t></w:r></w:p>';}
function boldParts(textParts){return '<w:p>'+textParts.map(([t,b])=>'<w:r><w:rPr>'+(b?'<w:b/>':'')+'</w:rPr><w:t xml:space="preserve">'+escape(t)+'</w:t></w:r>').join('')+'</w:p>';}
function word(kind,partial){
 const count=kind==='classic'?43:49;
 const title='„Изграждане на малък едноетажен обслужващ обект с временна площадка за складиране на оборудване“';
 const finish='не е необходимо провеждане на процедура по реда на Глава втора от Наредбата за ОС.';
 const a=Array.from({length:count},(_,i)=>{
 const n=i+1;
 if(n===11)return paragraph('Относно: Уведомление за инвестиционно предложение (ИП): '+title+' в поземлен имот с идентификатор 36676.129.457, населено място с. Катуница, община Садово, област Пловдив, местност „Попското“.');
 if(kind==='classic'){
  if(n===18)return paragraph('чл. 10, ал. 1 от същата.');
  if(n===23)return paragraph('Инвестиционното предложение не е свързано с промяна предназначението и/или начина на трайно ползване на имота.',true);
  if(n===24)return paragraph('Имотът, предмет на инвестиционното предложение, с идентификатор 36676.129.457 по КККР на с. Катуница, местност „Попското“, община Садово, област Пловдив, '+(partial?'попада частично':'попада')+' в границите на защитена зона BG0000194 „Река Чая“.');
  if(n===25)return paragraph('Защитена зона BG0000194 „Река Чая“ е обявена със Заповед № РД-688/25.08.2020 г., изменена със Заповед № РД-648/19.07.2024 г.');
  if(n===34)return boldParts([['В тази връзка инвестиционното предложение: ',false],[title,true],[' в поземлен имот с идентификатор 36676.129.457, населено място с. Катуница, община Садово, област Пловдив, местност Попското е, че ',false],[finish,true]]);
  if(n===41)return paragraph('С уважение,',true);
 }else {
  if(n===24)return paragraph('Поземленият имот с идентификатор 36676.129.457 '+(partial?'попада частично':'попада изцяло')+' в границите на защитена зона BG0000194 „Река Чая“.');
  if(n===25)return paragraph('Защитена зона BG0000194 „Река Чая“ е обявена със Заповед № РД-688/25.08.2020 г., изменена със Заповед № РД-648/19.07.2024 г.');
 }
 return paragraph('Непроменен текст '+n);
 }).join('');
 const xml='<w:document xmlns:w="'+NS+'"><w:body>'+a+'</w:body></w:document>';
 return fflate.zipSync({'word/document.xml':new TextEncoder().encode(xml),'word/styles.xml':new TextEncoder().encode('STYLE'),'[Content_Types].xml':new TextEncoder().encode('CONTENT TYPE')});
}
function zip(partial=false,opts={}){
 const pdf=new TextEncoder().encode('%PDF-1.7\n'+'x'.repeat(600)+'\n%%EOF');
 const entries={'01_Proekt_na_stanovishte_Klasicheski.docx':word('classic',partial),
  '02_Proekt_na_stanovishte_Eksperten.docx':word('expert',opts.opposite?!partial:partial),
  '03_GIS_analiz.pdf':pdf,
  '04_Normativni_i_dokumentalni_referencii.pdf':pdf,
  'README_BG.txt':new TextEncoder().encode('REPORT')};
 if(opts.missing)delete entries[opts.missing];
 if(opts.fakePDF)entries['03_GIS_analiz.pdf']=new TextEncoder().encode('not a pdf');
 return new Blob([fflate.zipSync(entries)]);
}
const inputs=partial=>({scenario:'Б',parcelIds:['36676.129.457'],zoneCodes:['BG0000194'],spatialRelation:partial?'попада частично':'попада'});
(async()=>{
 for(const partial of [false,true]){
  const source=zip(partial),r=await ctx.window.KT7605UnifiedQA.verify(source,inputs(partial));
  assert(r.passed);assert.equal(r.files.length,5);assert.equal(r.pdfCount,2);assert.equal(r.classicParagraphs,43);assert.equal(r.expertParagraphs,49);
  console.log('KT76-05 '+(partial?'PARTIAL':'FULL')+' PASS — 5 ZIP members, 43/49 paras, 2 PDFs, exact bold and GIS agreement');
 }
 await assert.rejects(()=>ctx.window.KT7605UnifiedQA.verify(zip(false,{opposite:true}),inputs(false)),/противоречат/);
 await assert.rejects(()=>ctx.window.KT7605UnifiedQA.verify(zip(false,{fakePDF:true}),inputs(false)),/PDF/);
 await assert.rejects(()=>ctx.window.KT7605UnifiedQA.verify(zip(false,{missing:'README_BG.txt'}),inputs(false)),/README_BG/);
 console.log('KT76-05 COMPLETE PASS: fail-closed on contradictory GIS, broken PDF or incomplete ZIP');
})().catch(e=>{console.error(e);process.exitCode=1});