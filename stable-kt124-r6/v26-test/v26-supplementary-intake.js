/* V26.3 supplementary dossier reference logic. Standalone; not yet wired to UI. */
(function(root){
'use strict';
const re=/(?:вх\.?\s*(?:№|номер)?\s*|входящ\s*(?:№|номер)\s*)([А-ЯA-Z0-9][А-ЯA-Z0-9\-\/\. ]{0,45}?)\s*(?:от\s*|\/\s*)(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{4})\s*(?:г\.)?/giu;
function parse(text,source){
 const out=[];for(const m of String(text||'').matchAll(re)){
  const number=m[1].trim().replace(/[\s.\-/]+$/,'');
  const parts=m[2].replace(/[\-/]/g,'.').split('.'),dd=+parts[0],mm=+parts[1],yy=+parts[2];
  if(!number||yy<2000||mm<1||mm>12||dd<1||dd>new Date(Date.UTC(yy,mm,0)).getUTCDate())continue;
  out.push({number,date:parts.map((v,i)=>i<2?v.padStart(2,'0'):v).join('.'),source:String(source||''),role:'unconfirmed',confirmed:false,clarifies:[],supersedes:[]});
 }return out;
}
function consolidate(entries){
 const map=new Map();for(const x of entries||[]){
  if(!x.number||!x.date)continue;
  const key=x.number.replace(/\s+/g,'').toUpperCase()+'|'+x.date;
  if(!map.has(key))map.set(key,{...x,sourceFiles:[x.source].filter(Boolean)});
  else if(x.source&&!map.get(key).sourceFiles.includes(x.source))map.get(key).sourceFiles.push(x.source);
 }
 return [...map.values()].sort((a,b)=>a.date.split('.').reverse().join('-').localeCompare(b.date.split('.').reverse().join('-'))||a.number.localeCompare(b.number));
}
function buildReferences(entries){
 const list=consolidate(entries);
 if(list.some(x=>!x.confirmed||!['initial','supplementary'].includes(x.role)))throw Error('Потвърдете ролята, номера и датата на всеки входящ документ.');
 const initial=list.filter(x=>x.role==='initial'),extra=list.filter(x=>x.role==='supplementary');
 if(initial.length!==1)throw Error('Посочете точно една основна преписка.');
 const ref=x=>'вх. № '+x.number+'/'+x.date+' г.';
 return {initial:ref(initial[0]),supplementary:extra.map(ref),
  wordPhrase:extra.length?'съгласно първоначалната документация '+ref(initial[0])+' и представената допълнителна информация '+extra.map(ref).join('; '):'съгласно документацията '+ref(initial[0]),
  provenance:list.map(x=>({reference:ref(x),role:x.role,sourceFiles:x.sourceFiles,clarifies:x.clarifies||[],supersedes:x.supersedes||[]}))};
}
root.V26SupplementaryIntake={parse,consolidate,buildReferences};
})(typeof window!=='undefined'?window:globalThis);
