/**
 * KT134 conservative grouping of different-format copies of one document.
 * The physical originals and extracted texts are NEVER removed.
 * No group is constructed merely because filenames match.
 */
const normalize=s=>String(s??'').normalize('NFKC').toLocaleLowerCase('bg-BG');
const tokens=s=>normalize(s).match(/[\p{L}\p{N}]+/gu)||[];
const ext=s=>{const m=/^(.*)\.(pdf|docx?|odt)$/i.exec(s);return m?{stem:normalize(m[1]),format:m[2].toLowerCase()}:null};
const count=arr=>{const m=new Map();for(const w of arr)m.set(w,(m.get(w)||0)+1);return m};
function similarity(a,b){
 const aa=count(a),bb=count(b);
 let common=0;
 for(const [w,n] of aa)common+=Math.min(n,bb.get(w)||0);
 return (2*common)/(a.length+b.length||1);
}
function numericSignature(ts){return ts.filter(t=>/\d/u.test(t)).join('|')}
export function groupKT134DocumentVariants(documents){
 if(!Array.isArray(documents))throw Error('Няма прегледани документи');
 const items=documents.map((d,i)=>({
  index:i,fileId:String(d?.fileId||'').trim(),kind:d?.kind||'unknown',
  sourceText:String(d?.sourceText||''),...ext(String(d?.fileId||'').trim())
 }));
 const candidates=[];
 for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
  const a=items[i],b=items[j];
  if(!a.stem||a.stem!==b.stem||a.format===b.format)continue;
  const ta=tokens(a.sourceText),tb=tokens(b.sourceText);
  const score=ta.length>=50&&tb.length>=50?similarity(ta,tb):0;
  const sameNumbers=numericSignature(ta)===numericSignature(tb);
  if(score>=0.985&&sameNumbers&&
   (a.kind==='unknown'||b.kind==='unknown'||a.kind===b.kind)){
   candidates.push(Object.freeze({first:i,second:j,score:Number(score.toFixed(5))}));
  }
 }
 // Do not link a file to several competing groups: ambiguous triplets need
 // explicit review rather than silently selecting one authoritative copy.
 const degree=new Map();
 for(const e of candidates){degree.set(e.first,(degree.get(e.first)||0)+1);degree.set(e.second,(degree.get(e.second)||0)+1)}
 const selected=candidates.filter(e=>degree.get(e.first)===1&&degree.get(e.second)===1);
 const byIndex=new Map();
 for(const e of selected){
  const pair=[items[e.first],items[e.second]];
  const leader=pair.find(x=>x.format==='pdf')||pair[0];
  byIndex.set(e.first,{id:leader.fileId,score:e.score});
  byIndex.set(e.second,{id:leader.fileId,score:e.score});
 }
 const result=documents.map((d,i)=>Object.freeze({
  ...d,
  logicalDocumentId:byIndex.get(i)?.id||String(d.fileId),
  originalVariant:byIndex.has(i),
  equivalenceStatus:byIndex.has(i)?'probable_same_notice_pending_source_review':'distinct_or_unverified',
  equivalenceScore:byIndex.get(i)?.score||null
 }));
 return Object.freeze(result);
}
