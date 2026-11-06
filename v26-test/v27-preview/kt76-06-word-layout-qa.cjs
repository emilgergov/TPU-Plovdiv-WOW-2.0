'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const fflate=require('fflate'),{DOMParser,XMLSerializer}=require('@xmldom/xmldom');
const base='v26-test/v27-preview/';
const moduleJS=fs.readFileSync(base+'kt76-06-word-layout.js','utf8');
const html=fs.readFileSync(base+'KT76_06_WORD_INTEGRATION_TEST.html','utf8');
const earlier=fs.readFileSync(base+'KT76_05_R2_LEGAL_RETRY_TEST.html','utf8');
assert(html.includes('KT7606WordLayout.fix(kt7604.blob'));
assert(html.includes('KT7605UnifiedQA.verify(kt7606.blob'));
assert(!earlier.includes('KT7606WordLayout'));
for(const [i,m] of [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].entries())if(m[1].trim())new vm.Script(m[1],{filename:'inline-'+i});
const win={fflate},ctx={window:win,fflate,DOMParser,XMLSerializer,TextDecoder,TextEncoder,Blob,Error,console};
vm.createContext(ctx);vm.runInContext(moduleJS,ctx);
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main',V='urn:schemas-microsoft-com:vml';
const esc=t=>t.replace(/&/g,'&amp;').replace(/</g,'&lt;');
function p(text='',type='body'){
 const body=type==='empty'?'':type==='signature'?'<w:r><w:pict><v:shape style="width:192pt;height:96.75pt"/></w:pict></w:r>':'<w:r><w:rPr><w:rFonts w:ascii="Verdana"/><w:sz w:val="20"/>'+(type==='bold'?'<w:b/>':'')+'</w:rPr><w:t xml:space="preserve">'+esc(text)+'</w:t></w:r>';
 return '<w:p><w:pPr><w:spacing w:before="0" w:after="100" w:line="240" w:lineRule="auto"/></w:pPr>'+body+'</w:p>';
}
function docx(kind){
 const total=kind==='classic'?43:49,blanks=kind==='classic'?37:43,greets=kind==='classic'?41:47;
 const ps=Array.from({length:total},(_,i)=>{
  const n=i+1;if(n===11)return p('Относно: Уведомление за инвестиционно предложение (ИП): „Изграждане на малък едноетажен обслужващ обект с временна площадка за складиране на оборудване“ в поземлен имот с идентификатор 36676.129.457, населено място с. Катуница, община Садово, област Пловдив, местност '+(kind==='expert'?'ПОПСКОТО':'„Попското“')+'.');
  if(n>=blanks&&n<blanks+4)return p('','empty');
  if(n===greets)return p('С уважение,','bold');
  if(n===greets+1)return p('','signature');
  if(kind==='expert'&&n>=33&&n<=37)return p('Анализ на въздействие абзац '+n,'bold');
  return p('Съдържание '+n);
 }).join('');
 const xml='<w:document xmlns:w="'+W+'" xmlns:v="'+V+'"><w:body>'+ps+'</w:body></w:document>';
 return fflate.zipSync({'word/document.xml':new TextEncoder().encode(xml),'word/styles.xml':new TextEncoder().encode('styles'),'word/header1.xml':new TextEncoder().encode('header'),'word/footer1.xml':new TextEncoder().encode('footer'),'[Content_Types].xml':new TextEncoder().encode('content types')});
}
const plain=new TextEncoder().encode('%PDF-1.7\n'+'.'.repeat(650)+'\n%%EOF');
const c=docx('classic'),e=docx('expert');
const zip=new Blob([fflate.zipSync({'01_Proekt_na_stanovishte_Klasicheski.docx':c,'02_Proekt_na_stanovishte_Eksperten.docx':e,'03_GIS_analiz.pdf':plain,'04_Normativni_i_dokumentalni_referencii.pdf':plain,'README_BG.txt':new TextEncoder().encode('README')})]);
function parse(raw){
 const doc=fflate.unzipSync(raw),xml=new DOMParser().parseFromString(new TextDecoder().decode(doc['word/document.xml']),'application/xml');
 const ps=Array.from(xml.getElementsByTagNameNS(W,'body')[0].childNodes).filter(x=>x.nodeType===1&&x.localName==='p');
 const str=p=>Array.from(p.getElementsByTagNameNS(W,'t')).map(x=>x.textContent).join('');
 return {doc,ps,lines:ps.map(str)};
}
(async()=>{
 const result=await win.KT7606WordLayout.fix(zip,{scenario:'Б',parcelIds:['36676.129.457'],zoneCodes:['BG0000194']});
 assert(result.applied);
 const oldpkg=fflate.unzipSync(new Uint8Array(await zip.arrayBuffer()));
 const pkg=fflate.unzipSync(new Uint8Array(await result.blob.arrayBuffer()));
 for(const name of Object.keys(oldpkg))if(!name.endsWith('.docx'))assert.deepEqual(Buffer.from(pkg[name]),Buffer.from(oldpkg[name]),name);
 for(const [kind,fn,n] of [['classic','01_Proekt_na_stanovishte_Klasicheski.docx',43],['expert','02_Proekt_na_stanovishte_Eksperten.docx',49]]){
  const old=parse(oldpkg[fn]),now=parse(pkg[fn]);assert.equal(now.ps.length,n);
  for(let i=0;i<n;i++)assert.equal(now.lines[i],kind==='expert'&&i===10?old.lines[i].replace('местност ПОПСКОТО','местност „Попското“'):old.lines[i],'word content '+kind+' paragraph '+(i+1));
  for(const name of Object.keys(old.doc))if(name!=='word/document.xml')assert.deepEqual(Buffer.from(now.doc[name]),Buffer.from(old.doc[name]));
  const lead=kind==='classic'?36:42;const greet=kind==='classic'?40:46;
  for(let i=lead;i<lead+4;i++){
   const pr=now.ps[i].getElementsByTagNameNS(W,'pPr')[0],s=pr.getElementsByTagNameNS(W,'spacing')[0];
   assert.equal(s.getAttributeNS(W,'line'),'20');assert.equal(s.getAttributeNS(W,'lineRule'),'exact');
  }
  assert.equal(now.ps[greet].getElementsByTagNameNS(W,'keepNext').length,1);
  assert.equal(now.ps[greet+1].getElementsByTagNameNS(W,'pict').length,1);
  console.log('KT76-06 '+kind+' PASS — '+n+' paragraphs and signed OOXML intact');
  if(kind==='expert'){
   assert(now.lines[10].includes('местност „Попското“'));
   for(let i=32;i<=36;i++){
    const bs=Array.from(now.ps[i].getElementsByTagNameNS(W,'b'));
    assert(bs.length&&bs.every(b=>b.getAttributeNS(W,'val')==='0'),'unexpected bold '+(i+1));
   }
  }
 }
 const a=await win.KT7606WordLayout.fix(zip,{scenario:'А',parcelIds:['56784.13.102'],zoneCodes:[]});
 assert(!a.applied&&a.blob===zip,'scenario A must be unchanged');
 console.log('KT76-06 COMPLETE PASS — safe cosmetic formatting and original scenario A preserved');
})().catch(e=>{console.error(e);process.exitCode=1});
