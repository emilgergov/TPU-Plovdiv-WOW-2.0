/* V27.1 P8 — conservative draft quality gate, no AI-generated assertion becomes verified. */
(function(root){'use strict';
const norm=x=>String(x==null?'':x).replace(/\s+/g,' ').trim();
function inspect({draft,subject,parcelIds=[],gis,legal,evidence}={}){
 const issues=[],body=norm(draft),ids=[...new Set(parcelIds.map(norm))];
 if(!body)issues.push({code:'EMPTY_DRAFT',severity:'block'});
 if(!norm(subject))issues.push({code:'UNCONFIRMED_SUBJECT',severity:'block'});
 for(const id of ids)if(!body.includes(id))issues.push({code:'MISSING_PARCEL',severity:'review',detail:id});
 const found=[...new Set(body.match(/\b\d{5}\.\d+\.\d+\b/g)||[])];
 for(const id of found)if(!ids.includes(id))issues.push({code:'UNKNOWN_PARCEL',severity:'block',detail:id});
 if(/идентификаторентификатор|(?:\b\S+\b)(?:\s+\1){2,}/iu.test(body))issues.push({code:'MALFORMED_TEXT',severity:'review'});
 if(gis?.scenario==='REVIEW'||gis?.allVerified!==true)issues.push({code:'GIS_NOT_VERIFIED',severity:'block'});
 if(gis?.scenario==='B'&&/не\s+(?:попада|пресича)\s+(?:в|със)\s+защитен[иа]/iu.test(body))issues.push({code:'POSSIBLE_GIS_CONTRADICTION',severity:'review'});
 if(gis?.scenario==='A'&&/пресича\s+защитен[иа]\s+зон/iu.test(body))issues.push({code:'POSSIBLE_GIS_CONTRADICTION',severity:'review'});
 const legalSources=legal?.sources||[];
 if(!legalSources.some(s=>s.verification==='article_verified')&&/на\s+основание\s+чл\.?\s*\d+/iu.test(body))issues.push({code:'UNVERIFIED_ARTICLE_CITATION',severity:'review'});
 const facts=(evidence?.facts||[]).filter(f=>f.status==='source_matched');
 for(const kind of ['electricity','water_supply','wastewater']){
  const values=[...new Set(facts.filter(f=>f.kind===kind).map(f=>norm(f.value).toLowerCase()))];
  if(values.length>1)issues.push({code:'CONFLICTING_SOURCE_FACTS',severity:'review',detail:kind});
 }
 return {accepted:!issues.some(x=>x.severity==='block'),reviewRequired:true,issues,checkedParcels:ids.length};
}
root.V27DraftQuality=Object.freeze({inspect});
})(typeof window!=='undefined'?window:globalThis);
