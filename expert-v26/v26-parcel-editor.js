(()=>{'use strict';
function normalize(raw){
 const ids=[],changes=[],uncertain=[],invalid=[],originals=[],seen=new Set();
 const text=String(raw||'').replace(/[\u00a0\u200b\u200c\u200d\ufeff]/g,' ').replace(/[，、；;]/g,';').replace(/[．。]/g,'.');
 const chunks=text.split(/[;\n\r,]+/).flatMap(x=>x.trim().split(/\s+(?=\d{5}(?:\s*[.\s]\s*\d))/)).filter(x=>x.trim());
 for(const chunk of chunks){
  const original=chunk.trim();let value=original.replace(/\s*\.\s*/g,'.').replace(/\.{2,}/g,'.').replace(/^\.+|\.+$/g,'').trim();
  if(/^\d{5}(?:\s+\d+){2,4}$/.test(value))value=value.replace(/\s+/g,'.');
  else value=value.replace(/\s+/g,'');
  if(!/^\d{5}(?:\.\d+){2,4}$/.test(value)){( /^\d{9,}$/.test(value)?uncertain:invalid).push(original);continue}
  const p=value.split('.');
  if(p[1].length>3||p[2].length>4||p.slice(3).some(x=>x.length>4)){uncertain.push(original);continue}
  const parcel=p.slice(0,3).join('.');
  if(value!==original||value!==parcel)changes.push(original+' → '+parcel+(value!==parcel?' (пълен: '+value+')':''));
  originals.push({original,normalized:value,parcel,kind:p.length===3?'parcel':p.length===4?'building':'unit'});
  if(!seen.has(parcel)){seen.add(parcel);ids.push(parcel)}
 }
 return {ids,changes,uncertain,invalid,originals};
}
window.V26ParcelEditor={normalize};
})();