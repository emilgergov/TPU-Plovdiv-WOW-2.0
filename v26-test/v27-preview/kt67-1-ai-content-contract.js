/* KT67-1: one AI content contract for classic A/B and expert V27-R02.
 * No paragraph slicing, no assertion that AI text is source-verified, no DOCX edits.
 * The next integration step (KT67-2) explicitly maps these slots to original KT42.
 */
(function(root){'use strict';
const labels=['CHARACTERIZATION','LEGAL','PROCEDURE','IMPACTS'];
const clean=x=>String(x??'').replace(/\r\n?/g,'\n').trim();
const normalize=x=>clean(x).replace(/\s+/g,' ');
const missing=x=>/^(?:НЯМА ДАННИ(?: В ПРЕПИСКАТА)?|НЕ Е УСТАНОВЕНО|НЕУСТАНОВЕНО)[.!]?$/i.test(normalize(x));
const tag=x=>/^\[\s*(?:ЗА ЕКСПЕРТНА ПРОВЕРКА|ЗА ПОПЪЛВАНЕ)[^\]]*\]$/i.test(normalize(x));
function parse(raw){
 const src=clean(raw);
 if(!src)throw Error('КТ67.1: липсва AI проект.');
 const hits=[...src.matchAll(/^\s*\[\[(CHARACTERIZATION|LEGAL|PROCEDURE|IMPACTS|CONCLUSION)\]\]\s*$/gm)];
 if(hits.length!==4&&hits.length!==5)throw Error('КТ67.1: AI авторът трябва да върне четири раздела; допуска се и отделен пети CONCLUSION за съвместимост.');
 if(hits.slice(0,4).some((h,i)=>h[1]!==labels[i])||(hits.length===5&&hits[4][1]!=='CONCLUSION'))throw Error('КТ67.1: разделите са в неправилен ред или са дублирани.');
 if(src.slice(0,hits[0].index).trim())throw Error('КТ67.1: непозволен текст преди разделите.');
 const chunks={};
 hits.forEach((hit,i)=>{
  const portion=src.slice(hit.index+hit[0].length,hits[i+1]?.index??src.length).trim();
  if(!portion)throw Error('КТ67.1: празен AI раздел '+hit[1]);
  if(/^\s*\[\[/m.test(portion))throw Error('КТ67.1: непознат технически AI маркер в '+hit[1]);
  const ps=portion.split(/\n\s*\n/).map(normalize).filter(Boolean);
  if(!ps.length||ps.some(x=>missing(x)||tag(x)))throw Error('КТ67.1: самостоятелен заместител вместо анализ в '+hit[1]);
  chunks[hit[1]]=ps;
 });
 return Object.freeze({raw:src,sections:Object.freeze(chunks),version:hits.length===5?'five-section-legacy':'four-section'});
}
function assemble(p){
 const parts=[];
 for(const key of labels)parts.push('[['+key+']]\n'+p[key].join('\n\n'));
 return parts.join('\n\n');
}
function unique(ps){return ps.length===new Set(ps.map(x=>x.toLocaleLowerCase('bg'))).size;}
function plan(raw,{parcelIds=[],gisScenario='',sourceFacts=[],verifiedLegalSources=[]}={}){
 const parsed=parse(raw),s=parsed.sections;
 const issues=[];
 if(s.CHARACTERIZATION.length!==4)issues.push({code:'CHARACTERIZATION_COUNT',severity:'block',actual:s.CHARACTERIZATION.length,required:4});
 if(s.LEGAL.length!==4)issues.push({code:'LEGAL_COUNT',severity:'block',actual:s.LEGAL.length,required:4});
 if(s.IMPACTS.length!==6)issues.push({code:'IMPACTS_COUNT',severity:'block',actual:s.IMPACTS.length,required:6});
 if(s.PROCEDURE.length<1||s.PROCEDURE.length>2)issues.push({code:'PROCEDURE_COUNT',severity:'block',actual:s.PROCEDURE.length,required:2});
 for(const key of labels)if(!unique(s[key]))issues.push({code:'DUPLICATE_PARAGRAPH',severity:'block',section:key});
 for(const key of labels)for(const p of s[key])if(p.length<45)issues.push({code:'SHALLOW_PARAGRAPH',severity:'block',section:key});
 const ids=[...new Set(parcelIds.map(normalize))].filter(Boolean);
 const mentions=[...new Set(parsed.raw.match(/\b\d{5}\.\d+\.\d+\b/g)||[])];
 for(const id of mentions)if(!ids.includes(id))issues.push({code:'UNKNOWN_PARCEL',severity:'block',id});
 if(!['А','Б','A','B'].includes(gisScenario))issues.push({code:'GIS_SCENARIO_UNVERIFIED',severity:'block'});
 const normalizedScenario=gisScenario==='B'?'Б':gisScenario==='A'?'А':gisScenario;
 if(normalizedScenario==='Б'&&!ids.length)issues.push({code:'NO_PARCEL',severity:'block'});
 // Provenance labels are NOT inferred from prose; AI cannot certify its own conclusions.
 const verifiedFacts=(Array.isArray(sourceFacts)?sourceFacts:[]).filter(f=>f?.status==='source_matched'&&normalize(f.file));
 const verifiedProvisions=(Array.isArray(verifiedLegalSources)?verifiedLegalSources:[]).filter(l=>l?.verification==='article_verified'&&normalize(l.provisionText)&&normalize(l.source));
 const warnings=[];
 if(!verifiedFacts.length)warnings.push('КТ67.1: липсват проследими индивидуални факти; фактологичните твърдения изискват експертна проверка.');
 if(!verifiedProvisions.length)warnings.push('КТ67.1: липсват проверени текстове на разпоредби; правните изводи остават проектни.');
 const draftForKT42=assemble(s); // Preserve full paragraphs and exactly four sections for original client.
 return Object.freeze({
  schema:'KT67_AI_CONTENT_V1',sourceVersion:parsed.version,reviewRequired:true,
  scenario:normalizedScenario,parcelIds:ids,
  classic:Object.freeze({characterization:s.CHARACTERIZATION.slice(),legalProject:s.LEGAL.slice(),impactsProject:s.IMPACTS.slice(1),procedureProject:s.PROCEDURE[s.PROCEDURE.length-1]}),
  expert:Object.freeze({characterization:s.CHARACTERIZATION.slice(),legal:s.LEGAL.slice(),impacts:s.IMPACTS.slice(),procedure:s.PROCEDURE.slice(),draft: draftForKT42}),
  provenance:Object.freeze({verifiedFactCount:verifiedFacts.length,verifiedProvisionCount:verifiedProvisions.length,legalStatus:'draft_requires_expert_review',procedureStatus:'draft_requires_expert_review'}),
  warnings,issues,readyForIntegration:issues.every(i=>i.severity!=='block')
 });
}
root.KT67AIContent=Object.freeze({parse,plan});
})(typeof window!=='undefined'?window:globalThis);
