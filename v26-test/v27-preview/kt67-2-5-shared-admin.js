/* KT67-2.5 — shared A/B administrative case metadata. Never invent location.
   Uses confirmed case metadata and actual GIS parcel labels; optional verified
   EKATTE objects are accepted only when they match the settlement identifier.
   This adapter does not open or rewrite approved KT56 Word templates. */
(function(root){'use strict';
const X10='Х'.repeat(10),X15='Х'.repeat(15);
const REF='Вх. № ОВОС-ХХХХ/ХХ.ХХ.ХХХХ г.';

/* Historical KT47 audited NSI settlement affiliations, restored for the
 * two regression cadastral districts. Not a complete national EKATTE list. */
const KT47_EKATTE=Object.freeze({
 '36676':{settlement:'с. Катуница',municipality:'Садово',region:'Пловдив',code:'36676',verified:true,source:'NSI EKATTE — KT47 archived audit'},
 '56784':{settlement:'гр. Пловдив',municipality:'Пловдив',region:'Пловдив',code:'56784',verified:true,source:'NSI EKATTE — KT47 archived audit'}
});
const trim=x=>String(x??'').replace(/\s+/g,' ').trim();
const missing=x=>!trim(x)||/\[(?:ЗА ПОПЪЛВАНЕ|ЗА ЕКСПЕРТНА ПРОВЕРКА)/iu.test(trim(x))||/^НЯМА ДАННИ$/iu.test(trim(x))||/^Х{4,}$/iu.test(trim(x))||/ОВОС-9999\s*\/\s*ДАТА-99/iu.test(trim(x));
function unique(xs){return [...new Set(xs.map(trim).filter(x=>x&&!missing(x)))];}
function party(x,label,n){
 let v=trim(x);
 if(label==='Възложител')v=v.replace(/^(?:ДО\s+)?(?:Възложител(?:я)?)(?:\s+на\s+инвестиционното\s+предложение)?\s*:?\s*/iu,'');
 else v=v.replace(/^(?:Адрес(?:\s+за\s+кореспонденция)?|За\s+кореспонденция)\s*:?\s*/iu,'');
 if(/^на инвестиционното предложение$/iu.test(v)||/^(?:неизвестен\s+възложител|няма данни)$/iu.test(v))v='';
 return label+': '+(missing(v)?'Х'.repeat(n):v);
}
function reference(v){
 v=trim(v);
 if(missing(v))return REF;
 if(/^Вх\.\s*№/iu.test(v))return v;
 return 'Вх. № '+v;
}
function placeLabel(v){v=trim(v);return /^(?:гр\.|с\.)\s*\S/iu.test(v)?v:'';}
function name(v){return trim(v).replace(/^(?:община|област)\s+/iu,'');}
function single(items){const a=unique(items);return a.length===1?a[0]:'';}
function administrative(meta={},results=[],ekatte=null){
 const values=results.map(r=>r||{});
 const match=(row)=>{
  // Accept EKATTE lookup only when it is explicitly verified and identifies
  // the same settlement code as the GIS cadastral record.
  if(!row||row.verified!==true)return null;
  const codes=unique(values.map(x=>x.ekatte||x.ekatte_code||x.ekatteCode||String(x.input||x.cadnum||'').split('.')[0]));
  if(codes.length!==1||trim(row.code||row.ekatte)!==codes[0])return null;
  const short=x=>trim(x).replace(/^(?:гр\.|с\.|град|село|община|област)\s+/iu,'').toLocaleLowerCase('bg');
  for(const k of ['settlement','municipality','region']){
   const inputs=unique([meta[k]||'',...values.map(v=>v[k]||'')]);
   if(inputs.some(v=>short(v)!==short(row[k]||'')))return null;
  }
  return row;
 };
 const codes=unique(values.map(x=>String(x.input||x.cadnum||'').split('.')[0]));
 const historical=codes.length===1?KT47_EKATTE[codes[0]]:null;
 const ek=match(ekatte)||match(historical)||{};
 let settlement=placeLabel(meta.settlement)||single(values.map(v=>placeLabel(v.settlement)))||placeLabel(ek.settlement);
 const municipal=single([meta.municipality||'',...values.map(v=>v.municipality||''),ek.municipality||''].filter(Boolean).map(name));
 const regional=single([meta.region||meta.oblast||'',...values.map(v=>v.region||v.oblast||''),ek.region||ek.oblast||''].filter(Boolean).map(name));
 const locality=single([meta.locality||'',...values.map(v=>v.locality||'')].filter(Boolean));
 const parts=[
  'населено място '+(settlement||X10),
  'община '+(municipal||X10),
  'област '+(regional||X10)
 ];
 if(locality)parts.push('местност '+locality);
 return {location:parts.join(', '),settlement,municipality:municipal,region:regional,locality,verifiedEkatte:!!Object.keys(ek).length};
}
function normalize(metadata={},results=[],opts={}){
 const m={...metadata};
 const location=administrative(m,results,opts.verifiedEkatte||null);
 m.recipient=party(m.recipient,'Възложител',10);
 m.address=party(m.address,'Адрес',15);
 m.incomingReference=reference(m.incomingReference);
 m.location=location.location;
 m.settlement=location.settlement;
 m.municipality=location.municipality;
 m.region=location.region;
 return {metadata:m,location,missing:{recipient:m.recipient.endsWith(X10),address:m.address.endsWith(X15),incoming:m.incomingReference===REF,municipality:!location.municipality,region:!location.region}};
}
root.KT6725Admin=Object.freeze({normalize,administrative,party,reference});
})(window);
