/* KT77-11.4 — evidence bridge, same rules for A 41 / B 43.
 * Uses only original ZIP text preview (no AI text) and a confirmed parcel set.
 * Never fabricates facts, allows legal conclusions, or silently copies specimen data.
 */
(function(root){'use strict';
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const DOC='01_Proekt_na_stanovishte_Klasicheski.docx';
const EXPECTED={A:41,B:43};
const MATCH=root.KT7711SpanMatcher;
const ps=d=>Array.from(d.getElementsByTagNameNS(W,'body')[0]?.childNodes||[]).filter(n=>n.nodeType===1&&n.namespaceURI===W&&n.localName==='p');
const ts=p=>Array.from(p.getElementsByTagNameNS(W,'t')).map(t=>t.textContent||'');
const text=p=>ts(p).join('');
async function getVerifiedPlan({scenario,primaryBlob,parcelIds}={}){
 if(!MATCH?.proposeMany)throw Error('КТ77-11.4: липсва модулът за доказателствени текстови замени');
 const mode=String(scenario||'').replace('А','A').replace('Б','B').toUpperCase(),n=EXPECTED[mode];
 if(!n)throw Error('КТ77-11.4: непознат сценарий А/Б');
 if(!primaryBlob||!root.fflate?.unzipSync)throw Error('КТ77-11.4: липсва първичният ZIP/библиотеката');
 const archive=root.fflate.unzipSync(new Uint8Array(await primaryBlob.arrayBuffer()));
 const doc=archive[DOC];if(!doc)throw Error('КТ77-11.4: липсва първичен Classic Word');
 const filename=mode==='A'?'KT35-A.docx':'KT39-B.docx';
 const response=await fetch(new URL('v27-preview/etalon/'+filename,document.baseURI),{cache:'no-store'});
 if(!response.ok)throw Error('КТ77-11.4: недостъпен заключен еталон '+filename);
 const original=root.fflate.unzipSync(new Uint8Array(await response.arrayBuffer()));
 const parse=b=>new DOMParser().parseFromString(new TextDecoder().decode(b),'application/xml');
 const a=ps(parse(original['word/document.xml']));
 const b=ps(parse(root.fflate.unzipSync(doc)['word/document.xml']));
 if(a.length!==n||b.length!==n)throw Error('КТ77-11.4: невалиден брой абзаци в '+mode);
 const preview=root.V26ArchiveTextPreview;
 const documents=Array.isArray(preview?.files)?preview.files:[];
 const evidence=documents.filter(d=>d&&typeof d.path==='string'&&typeof d.text==='string'&&!d.error&&!d.truncated)
  .map(d=>({source_file:d.path,text:d.text}));
 const patches=[],unresolved=[],confirmed=Array.isArray(parcelIds)?parcelIds.map(String):[];
 // Old-case identifiers should never be accepted as verified merely because
 // they appear in the specimen; the registered parcel list comes from GIS.
 const primaryIds=MATCH.ids(b.map(text).join(' '));
 const unrelated=primaryIds.filter(id=>!confirmed.includes(id));
 if(unrelated.length)unresolved.push({scope:'all',issue:'Първичният Word съдържа неподтвърдени имотни идентификатори',values:unrelated});
 for(const index of [7,8,11,17,19,20,21,22,23,24]){
  const old=text(a[index-1]),newText=text(b[index-1]);
  const candidate=MATCH.proposeMany({paragraph:index,original:old,primary:newText,runTexts:ts(a[index-1]),documents:evidence,confirmedParcelIds:confirmed});
  if(candidate.ok&&!candidate.unchanged)patches.push(...candidate.patches);
  else if(!candidate.ok)unresolved.push({paragraph:index,reason:candidate.reason,original:old.slice(0,150),primary:newText.slice(0,150)});
 }
 // No changes in legal or protected fixed slots unless the exact old specimen
 // is valid for current evidence; this is NOT yet a universal finding.
 const differenceOutside=[...a.keys()].map(i=>i+1).filter(i=>![7,8,11,17,19,20,21,22,23,24].includes(i)&&text(a[i-1])!==text(b[i-1]));
 if(differenceOutside.length)unresolved.push({scope:'other',issue:'Променени юридически или фиксирани позиции без разрешен редакционен договор',paragraphs:differenceOutside});
 return {
  scenario:mode,patches,evidence,unresolved,extraction:'BROWSER_ARCHIVE_TEXT_PREVIEW',
  verified:!unresolved.length&&patches.length>0&&evidence.length>0,
  primaryParagraphCount:n,checkedParagraphs:n
 };
}
root.KT7711CaseEvidenceBridge=Object.freeze({getVerifiedPlan});
})(window);
