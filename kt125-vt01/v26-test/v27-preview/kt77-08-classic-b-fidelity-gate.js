/* KT77-08: Read-only Classic B acceptance gate.
 * Never modifies DOCX, ZIP, original templates, or ZT additions.
 * Exact approved wording of invariant paragraphs from locked KT76-03 sample.
 * New-case factual/legal paragraphs remain case-specific and must be reviewed.
 */
(function(root){'use strict';
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const NAME='01_Proekt_na_stanovishte_Klasicheski.docx';
const exactIndices=[18,30,31,32,33,34,36];
const text=p=>Array.from(p.getElementsByTagNameNS(NS,'t')).map(x=>x.textContent||'').join('');
function verify(blob,{scenario=''}={}){
 const mode=scenario==='B'?'Б':scenario==='A'?'А':scenario;
 if(mode==='А')return Promise.resolve(Object.freeze({passed:true,scenario:'А',checked:0}));
 if(mode!=='Б')throw Error('КТ77-08: непотвърден сценарий');
 return (async()=>{
  if(!root.fflate?.unzipSync)throw Error('КТ77-08: липсва ZIP библиотека');
  const accepted=root.KT7603ClassicB?.approved;
  if(!accepted)throw Error('КТ77-08: липсва регистърът на заключения Classic Б');
  const outer=root.fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
  if(!outer[NAME])throw Error('КТ77-08: липсва Classic Б');
  const inner=root.fflate.unzipSync(outer[NAME]);
  const xml=new DOMParser().parseFromString(new TextDecoder().decode(inner['word/document.xml']),'application/xml');
  if(xml.getElementsByTagName('parsererror').length)throw Error('КТ77-08: невалиден DOCX XML');
  const body=xml.getElementsByTagNameNS(NS,'body')[0];
  const ps=Array.from(body?.childNodes||[]).filter(x=>x.nodeType===1&&x.namespaceURI===NS&&x.localName==='p');
  if(ps.length!==43)throw Error('КТ77-08: Classic Б има '+ps.length+' вместо заключените 43 абзаца');
  const errors=[];
  for(const i of exactIndices){const actual=text(ps[i-1]);if(actual!==accepted[i])errors.push(i);}
  // Exact legal finding from another investment proposal must never be transplanted.
  // Verify that case-dependent parts exist, without altering or approving their content.
  for(const i of [11,19,20,21,22,23,24,25,26,27,28,29,35]){
   if(!text(ps[i-1]).trim())errors.push(i);
  }
  if(errors.length)throw Error('КТ77-08: Classic Б НЕ СЪОТВЕТСТВА на заключения образец; засегнати абзаци № '+[...new Set(errors)].sort((a,b)=>a-b).join(', ')+'. ZIP блокиран, Word текстът не е променян.');
  return Object.freeze({passed:true,scenario:'Б',paragraphs:43,checked:exactIndices.length,readonly:true});
 })();
}
root.KT7708ClassicBGuard=Object.freeze({verify});
})(typeof window!=='undefined'?window:globalThis);
