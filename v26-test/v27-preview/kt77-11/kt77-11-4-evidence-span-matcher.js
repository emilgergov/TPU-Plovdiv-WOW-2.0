/* KT77-11.4 A+B: pure, deterministic, single-run factual replacement matcher.
 * Does not use AI, network access, or interpret legal conclusions.
 * Browser/global and Node exports for GitHub Actions exact regression checks.
 */
(function(root){'use strict';
const SLOTS=new Set([7,8,11,17,19,20,21,22,23,24]);
const LEGAL=/\b(?:чл\.|ал\.|Наредб|ЗООС|ЗБР|ЗЗТ|ОВОС|РД-\d+|ДВ,\s*бр\.)|(?:не\s+е\s+необходимо|няма\s+вероятност|допустим(?:о|а)\s+спрямо)/iu;
const RE_ID=/\b\d{5}\.\d+\.\d+\b/g;
const RE_ZONE=/BG\d{7}/g;
const norm=x=>String(x??'').trim();
const unique=x=>[...new Set(x)];
const ids=x=>unique(String(x||'').match(RE_ID)||[]);
const zones=x=>unique(String(x||'').match(RE_ZONE)||[]);
function difference(oldText,newText){
 if(typeof oldText!=='string'||typeof newText!=='string'||oldText===newText)return null;
 let i=0;while(i<oldText.length&&i<newText.length&&oldText[i]===newText[i])i++;
 let a=oldText.length,b=newText.length;
 while(a>i&&b>i&&oldText[a-1]===newText[b-1]){a--;b--;}
 return {old:oldText.slice(i,a),value:newText.slice(i,b),prefix:i,suffix:oldText.length-a};
}
function factKind(i,old,value){
 if(i===7)return 'recipient';
 if(i===8)return 'address';
 if(i===17)return 'reference';
 if(i===11){
  if(ids(value).length)return 'parcel_id';
  if(/^(?:гр\.|с\.)\s/u.test(value))return 'settlement';
  if(/община\s+/iu.test(value))return 'municipality';
  if(/област\s+/iu.test(value))return 'region';
  if(/местност\s+/iu.test(value))return 'locality';
  return 'subject';
 }
 if(ids(value).length)return 'parcel_id';
 if(/^(?:гр\.|с\.)\s/u.test(value))return 'settlement';
 if(/община\s+/iu.test(value))return 'municipality';
 if(/област\s+/iu.test(value))return 'region';
 if(/местност\s+/iu.test(value))return 'locality';
 if(i>=19&&i<=22)return 'characterization';
 return 'unknown';
}
function propose({paragraph,original,primary,runTexts,documents,confirmedParcelIds}){
 if(!Number.isInteger(paragraph)||!SLOTS.has(paragraph))return {ok:false,reason:'unapproved-slot'};
 if(original===primary)return {ok:true,unchanged:true};
 const d=difference(original,primary);
 if(!d||!d.old.trim()||!d.value.trim()||d.old===d.value||d.old.length>600||d.value.length>600)
  return {ok:false,reason:'non-atomic-or-too-long'};
 const kind=factKind(paragraph,d.old,d.value);
 if(kind==='unknown'||LEGAL.test(d.old)||LEGAL.test(d.value))return {ok:false,reason:'legal-or-unknown'};
 const runs=Array.isArray(runTexts)?runTexts:[];
 if(runs.filter(t=>typeof t==='string'&&t.split(d.old).length===2).length!==1)
  return {ok:false,reason:'not-one-unique-original-run'};
 // A source quote must contain the replacement verbatim. Matching a single,
 // non-truncated source file is necessary; never infer a value from file names.
 const supported=(Array.isArray(documents)?documents:[])
  .filter(e=>e&&typeof e.source_file==='string'&&typeof e.text==='string'&&!e.error&&!e.truncated)
  .filter(e=>e.text.includes(d.value));
 const distinct=new Map(supported.map(e=>[e.source_file,e]));
 if(distinct.size!==1)return {ok:false,reason:distinct.size?'ambiguous-source':'source-not-found'};
 const doc=[...distinct.values()][0];
 const quote=doc.text.split(/\r?\n/).find(line=>line.includes(d.value))||'';
 if(!quote.trim()||quote.length>1200)return {ok:false,reason:'quote-too-long-or-absent'};
 const desired=unique((Array.isArray(confirmedParcelIds)?confirmedParcelIds:[]).map(String));
 const resulting=ids(d.value);
 if(resulting.length&&resulting.some(id=>!desired.includes(id)))
  return {ok:false,reason:'parcel-not-confirmed'};
 if(zones(d.old).length||zones(d.value).length)return {ok:false,reason:'zone-update-requires-independent-gis-gate'};
 return {ok:true,unchanged:false,patch:{paragraph,kind,template_literal:d.old,value:d.value,source_file:doc.source_file,source_quote:quote.trim()}};
}
root.KT7711SpanMatcher=Object.freeze({difference,propose,ids,zones,factKind});
if(typeof module!=='undefined'&&module.exports)module.exports=root.KT7711SpanMatcher;
})(typeof window!=='undefined'?window:globalThis);
