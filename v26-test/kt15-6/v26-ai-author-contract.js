/* KT15.9: secure AI author request/response contract. No browser API key or automatic Word injection. */
(function(root){'use strict';
const clean=v=>String(v??'').trim();
const TOPICS=['construction','electricity','water_supply','wastewater'];
function prepareRequest(input){
 const x=input||{},e=x.editorialBrief||{},gis=x.gis||{},norm=x.normative||{};
 const issues=[];
 if(e.schema!=='KT15_8_EDITORIAL_BRIEF_V1')issues.push('Липсва редакционна основа от ZIP преписката');
 if(!clean(x.dossierId))issues.push('Липсва идентификатор на преписката');
 if(gis.confirmed!==true||!clean(gis.source)||!Array.isArray(gis.findings)||!gis.findings.length)issues.push('Липсва потвърден ГИС резултат с източник и констатации');
 if(norm.confirmed!==true||!clean(norm.source)||!Array.isArray(norm.references)||!norm.references.length)issues.push('Липсва потвърден нормативен анализ с източник и референции');
 return {schema:'KT15_9_AI_AUTHOR_REQUEST_V1',ready:issues.length===0,issues,
  dossierId:clean(x.dossierId),subject:clean(e.subject),editorialBrief:e,
  gis:{confirmed:gis.confirmed===true,parcels:gis.parcels||[],findings:gis.findings||[],source:clean(gis.source)},
  normative:{confirmed:norm.confirmed===true,references:norm.references||[],findings:norm.findings||[],source:clean(norm.source)},
  instructions:{language:'bg',role:'Експерт, който съставя мотивиран проект на становище, не преписва откъси.',
   classical:'Запази четирите фактически абзаца на каноничния образец; използвай само потвърдени сведения.',
   expert:'Напиши самостоятелно, последователно, мотивирано експертно изложение, съобразено с конкретната преписка; не дублирай приложенията.',
   constraints:['Не измисляй факти, правни основания или ГИС резултати.','Отделяй заявени от установени факти.','При противоречие изисквай проверка.','Всяко конкретно твърдение да има източник.','При липса на данни маркирай въпрос за експертна проверка, а не дописвай предположение.']}};
}
function editorialTitleReview(request,draft){
 const issues=[];
 const title=draft&&draft.editorialTitle;
 if(!title)return {present:false,valid:true,issues}; // Backward-compatible with existing drafts.
 const subject=clean(title.subject),heading=clean(title.heading);
 if(!subject||!heading)issues.push('Непълен редактиран предмет или заглавие');
 if(subject&&heading&&!heading.includes(subject))issues.push('Заглавието не съдържа редактирания предмет');
 const parcelIds=heading.match(/\b\d{5}\.\d+\.\d+\b/g)||[];
 if(new Set(parcelIds).size!==parcelIds.length)issues.push('Повторен кадастрален идентификатор в заглавието');
 const original=clean(request&&request.subject);
 if(original&&subject&&original!==subject&&subject.length<8)issues.push('Редактираният предмет е необосновано кратък');
 return {present:true,valid:issues.length===0,issues};
}
function validateDraft(request,draft){
 const issues=[];
 if(!request||request.ready!==true)issues.push('Непотвърдена входна фактическа основа');
 if(!draft||draft.schema!=='KT15_9_AI_AUTHOR_DRAFT_V1')issues.push('Невалиден формат на AI проекта');
 const editorial=editorialTitleReview(request,draft);
 issues.push(...editorial.issues);
 const paragraphs=draft&&draft.classical||{};
 for(const topic of TOPICS)if(!clean(paragraphs[topic]))issues.push('Липсва класически абзац: '+topic);
 if(!clean(draft&&draft.expert&&draft.expert.text))issues.push('Липсва самостоятелен експертен текст');
 const claims=Array.isArray(draft&&draft.claims)?draft.claims:[];
 if(!claims.length)issues.push('Няма проследими фактически твърдения');
 for(const [i,claim] of claims.entries())if(!clean(claim.text)||!clean(claim.source)||claim.verified!==true)issues.push('Непотвърдено твърдение №'+(i+1));
 if(draft&&draft.requiresReview!==false)issues.push('Изисква експертна проверка');
 return {schema:'KT15_9_AI_AUTHOR_VALIDATION_V1',valid:issues.length===0,issues,
  readyForWord:false,reason:'Дори технически валиден AI проект изисква изрично експертно одобрение преди генериране на Word.'};
}
const api=Object.freeze({prepareRequest,validateDraft,editorialTitleReview});root.V26AIAuthorContract=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
