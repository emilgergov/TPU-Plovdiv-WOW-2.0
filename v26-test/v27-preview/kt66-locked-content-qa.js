/* KT66 read-only substantive fixed-paragraph fidelity check for all new cases.
 * Word is never modified here. Only the original KT42's explicit case-dependent
 * paragraph slots are permitted to differ from KT56's approved exemplars.
 */
(function(root){'use strict';
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
function parse(bytes){
 const zip=root.fflate.unzipSync(bytes),xml=zip['word/document.xml'];
 if(!xml)throw Error('КТ66: невалиден Word XML');
 const doc=new DOMParser().parseFromString(new TextDecoder().decode(xml),'application/xml');
 const ps=Array.from(doc.getElementsByTagNameNS(NS,'body')[0].children).filter(x=>x.localName==='p');
 const texts=ps.map(p=>Array.from(p.getElementsByTagNameNS(NS,'t')).map(x=>x.textContent).join(''));
 return {zip,ps,texts};
}
function same(a,b){return a.length===b.length&&a.every((x,i)=>x===b[i]);}
async function check(doc,which){
 const expected={A:41,B:43,E:49}[which],refs={A:'KT35-A',B:'KT39-B',E:'V27-R02'};
 const current=parse(doc);
 const response=await fetch('v27-preview/etalon/'+refs[which]+'.docx',{cache:'no-store'});
 if(!response.ok)throw Error('КТ66: не може да зареди заключения еталон '+which);
 const original=parse(new Uint8Array(await response.arrayBuffer()));
 if(current.ps.length!==expected||original.ps.length!==expected)throw Error('КТ66: регресия в броя абзаци на '+which);
 const variable=which==='E'?[6,7,10,17,20,21,23,24,25,26,27,28,31,32,33,34,35,36,38,39]:
 [6,7,10,16,18,19,20,21,...(which==='B'?[22,23,24,25,26,27,28,29,30,31,32,33]:[22,23,24,25,26,27,28,29,30,31])];
 const mutable=new Set(variable);
 let fixed=0;
 for(let i=0;i<expected;i++){
  if(mutable.has(i))continue;
  if(current.texts[i]!==original.texts[i])throw Error('КТ66: забранена промяна на заключен абзац '+(i+1)+' в '+which);
  fixed++;
 }
 const assets=Object.keys(original.zip).filter(k=>k.startsWith('word/media/')||k.startsWith('word/header')||k.startsWith('word/footer')||k==='word/styles.xml');
 for(const file of assets){
  if(!current.zip[file]||!same(current.zip[file],original.zip[file]))throw Error('КТ66: променено оформление/лого/футер '+file+' в '+which);
 }
 const text=current.texts.join('\n');
 if(/\[\[(?:LEGAL|IMPACTS|PROCEDURE|CHARACTERIZATION|CONCLUSION)\]\]|\[ЗА ЕКСПЕРТНА ПРОВЕРКА|НЯМА ДАННИ/i.test(text))throw Error('КТ66: невалидни маркери или заместители в '+which);
 return {fixed,assets:assets.length,paragraphs:expected};
}
async function verify(blob,scenario){
 const pack=root.fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
 const classic=pack['01_Proekt_na_stanovishte_Klasicheski.docx'],expert=pack['02_Proekt_na_stanovishte_Eksperten.docx'];
 if(!classic||!expert)throw Error('КТ66: липсват двата оригинални Word документа в ZIP');
 const a=await check(classic,scenario==='Б'?'B':'A'),b=await check(expert,'E');
 return {classic:a,expert:b};
}
root.KT66ContentQA=Object.freeze({verify});
})(window);
