/* KT77-11.4 — cautious source-fact bridge for BOTH classic A and B.
 * Reads ONLY browser-extracted original dossier text (not AI response).
 * Builds cadastral-identifier patches iff dossier and first Word literally agree.
 * All missing or unresolved facts are returned as blockers, never guessed.
 */
(function(root){'use strict';
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const DOC='01_Proekt_na_stanovishte_Klasicheski.docx';
const EXPECTED={A:41,B:43};
const text=p=>Array.from(p.getElementsByTagNameNS(W,'t')).map(x=>x.textContent||'').join('');
const paragraphs=d=>Array.from(d.getElementsByTagNameNS(W,'body')[0]?.childNodes||[]).filter(n=>n.nodeType===1&&n.namespaceURI===W&&n.localName==='p');
const ids=t=>[...new Set(String(t||'').match(/\b\d{5}\.\d+\.\d+\b/g)||[])];
async function getVerifiedPlan({scenario,primaryBlob,parcelIds}={}){
 const mode=String(scenario||'').replace('А','A').replace('Б','B').toUpperCase(),n=EXPECTED[mode];
 if(!n)throw Error('КТ77-11.4: непознат сценарий А/Б');
 if(!primaryBlob)throw Error('КТ77-11.4: липсва първичният ZIP');
 const entries=root.fflate.unzipSync(new Uint8Array(await primaryBlob.arrayBuffer()));
 const primaryFile=entries[DOC];if(!primaryFile)throw Error('КТ77-11.4: няма Classic Word в ZIP');
 const originalFile=mode==='A'?'KT35-A.docx':'KT39-B.docx';
 const r=await fetch(new URL('v27-preview/etalon/'+originalFile,document.baseURI),{cache:'no-store'});
 if(!r.ok)throw Error('КТ77-11.4: не е наличен оригиналният образец');
 const archive=root.fflate.unzipSync(new Uint8Array(await r.arrayBuffer()));
 const parsed=b=>new DOMParser().parseFromString(new TextDecoder().decode(b),'application/xml');
 const reference=paragraphs(parsed(archive['word/document.xml']));
 const primary=paragraphs(parsed(root.fflate.unzipSync(primaryFile)['word/document.xml']));
 if(reference.length!==n||primary.length!==n)throw Error('КТ77-11.4: неочакван брой абзаци в А или Б');
 const source=root.V26ArchiveTextPreview?.files||[];
 const evidence=source.filter(f=>f&&typeof f.path==='string'&&typeof f.text==='string'&&!f.error&&!f.truncated).map(f=>({source_file:f.path,text:f.text}));
 const patches=[],unresolved=[];
 const actualIds=new Set((Array.isArray(parcelIds)?parcelIds:[]).map(String).filter(Boolean));
 const allowed=[7,8,11,17,19,20,21,22,23,24];
 for(const index of allowed){
  const old=text(reference[index-1]),newText=text(primary[index-1]);
  if(old===newText)continue;
  const oldIDs=ids(old),newIDs=ids(newText);
  const newUnique=newIDs.filter(id=>actualIds.has(id)&&!oldIDs.includes(id));
  const oldUnique=oldIDs.filter(id=>!newIDs.includes(id));
  if(newUnique.length===1&&oldUnique.length===1){
   const newId=newUnique[0],oldId=oldUnique[0];
   const matched=evidence.filter(e=>e.text.includes(newId));
   const quote=(matched.length===1?matched[0].text.split(/\r?\n/).find(line=>line.includes(newId))||'':'').trim().slice(0,800);
   if(matched.length===1&&quote.includes(newId)){
    patches.push({paragraph:index,kind:'parcel_id',template_literal:oldId,value:newId,source_file:matched[0].source_file,source_quote:quote});
    continue;
   }
  }
  unresolved.push({paragraph:index,issue:'Разлика между първичния Word и еталона без еднозначно доказана замяна',original:old.slice(0,120),primary:newText.slice(0,120)});
 }
 return {scenario:mode,patches,evidence,unresolved,extraction:'BROWSER_ARCHIVE_TEXT_PREVIEW',verified:unresolved.length===0&&patches.length>0&&evidence.length>0};
}
root.KT7711CaseEvidenceBridge=Object.freeze({getVerifiedPlan});
})(window);
