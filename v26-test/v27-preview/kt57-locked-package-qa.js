/* KT57 read-only output QA: preserve approved A/B/R02 content. Never edits DOCX. */
(function(root){'use strict';
 const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 const parse=bytes=>{
   const entries=root.fflate.unzipSync(bytes);
   if(!entries['word/document.xml'])throw Error('Липсва Word документът.');
   const xml=new DOMParser().parseFromString(new TextDecoder().decode(entries['word/document.xml']),'application/xml');
   if(xml.getElementsByTagName('parsererror').length)throw Error('Невалиден Word XML.');
   const body=xml.getElementsByTagNameNS(NS,'body')[0];
   const ps=Array.from(body.children).filter(x=>x.localName==='p');
   const txt=ps.map(p=>Array.from(p.getElementsByTagNameNS(NS,'t')).map(x=>x.textContent).join(''));
   return {entries,ps,txt};
 };
 // A descriptive sentence containing “няма данни” is not an empty Word
 // slot. Reject technical AI markers and standalone missing-content fillers.
 const problem=t=>{
   const v=String(t||'').trim();
   if(/\[\[(?:CHARACTERIZATION|LEGAL|IMPACTS|PROCEDURE|CONCLUSION)\]\]|\[\s*ЗА ЕКСПЕРТНА ПРОВЕРКА/iu.test(v))return 'AI_MARKER';
   if(/^НЯМА ДАННИ(?:\s+В\s+ПРЕПИСКАТА)?[.!]?$/iu.test(v))return 'EMPTY_PLACEHOLDER';
   return '';
 };
 async function exactRef(path){
   const r=await fetch(path,{cache:'no-store'});
   if(!r.ok)throw Error('Не може да се зареди заключеният образец: '+path);
   return parse(new Uint8Array(await r.arrayBuffer()));
 }
 const eq=(a,b)=>a.length===b.length&&a.every((t,i)=>t===b[i]);
 async function verify(blob,context={}){
   if(!root.fflate?.unzipSync)throw Error('Липсва библиотека за проверка на ZIP.');
   const outer=root.fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
   const names=Object.keys(outer);
   const req=['01_Proekt_na_stanovishte_Klasicheski.docx','02_Proekt_na_stanovishte_Eksperten.docx','03_GIS_analiz.pdf','04_Normativni_i_dokumentalni_referencii.pdf','README_BG.txt'];
   for(const n of req)if(!outer[n])throw Error('КТ57: липсва '+n+' в работния ZIP.');
   for(const n of req.filter(x=>x.endsWith('.pdf'))){
     if(new TextDecoder().decode(outer[n].slice(0,4))!=='%PDF')throw Error('КТ57: невалиден PDF '+n);
   }
   const classic=parse(outer[req[0]]),expert=parse(outer[req[1]]);
   const B=Array.isArray(context.zoneCodes)&&context.zoneCodes.length>0, refClassic=B?'KT39-B':'KT35-A';
   const expected=B?43:41;
   if(classic.ps.length!==expected||expert.ps.length!==49)throw Error('КТ57: разлика в структурата на заключените Word образци.');
   for(const [label,document] of [['класически',classic],['експертен',expert]]){
     for(let i=0;i<document.txt.length;i++){
       const issue=problem(document.txt[i]);
       if(issue)throw Error('КТ57: недопустим заместител '+issue+' в '+label+' Word, абзац '+(i+1)+'.');
     }
   }
   if(!classic.entries['word/styles.xml']||!expert.entries['word/styles.xml'])throw Error('КТ57: липсва оригиналното Word оформление.');
   const refA=await exactRef('v27-preview/etalon/'+refClassic+'.docx');
   const refE=await exactRef('v27-preview/etalon/V27-R02.docx');
   // For the approved specimen case, only administrative fields can differ.
   const isSpecimen=(String(context.parcelIds||'').match(/\d{5}\.\d+\.\d+/g)||[]).sort().join(',')==='56784.13.102,56784.13.105,56784.13.106';
   if(isSpecimen){
     const mutableClassic=new Set([6,7,10,16]),mutableExpert=new Set([6,7,10,17]);
     for(let i=0;i<classic.txt.length;i++)if(!mutableClassic.has(i)&&classic.txt[i]!==refA.txt[i])throw Error('КТ57: съдържателна регресия в класическия Word, абзац '+(i+1));
     for(let i=0;i<expert.txt.length;i++)if(!mutableExpert.has(i)&&expert.txt[i]!==refE.txt[i])throw Error('КТ57: съдържателна регресия в експертния Word, абзац '+(i+1));
   }
   return {scenario:B?'Б':'А',classicParagraphs:classic.ps.length,expertParagraphs:expert.ps.length,specimenExact:isSpecimen,files:names.length};
 }
 root.KT57PackageQA=Object.freeze({verify,problem});
})(window);
