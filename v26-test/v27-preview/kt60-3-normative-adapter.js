/* KT60.3: adapt actual archived article citations, without inventing verbatim clauses.
   A source-scoped verified citation is not a verified verbatim statute or case-specific conclusion. */
(function(root){'use strict';
const t=v=>String(v??'').replace(/\s+/gu,' ').trim();
const placeholder=v=>!t(v)||/^(?:ПРЕДСТОИ|НЯМА ДАННИ)/iu.test(t(v));
function classify(record){
 if(!record||!t(record.title)||!t(record.source))return null;
 const article=t(record.article),page=t(record.page),scope=t(record.verified_scope);
 const actualText=t(record.provisionText||record.articleText);
 const officialText=record.officialVerified===true&&!placeholder(record.version||record.effectiveDate)&&!!actualText;
 const scopeVerified=record.verified===true&&!!article&&!placeholder(page)&&!!scope&&
  (record.revision_verified===true||record.project_revision_accepted===true)&&/^(https:\/\/)/.test(t(record.source));
 const status=officialText?'article_text_verified':scopeVerified?'verified_citation':'catalog_only';
 return {id:t(record.id),title:t(record.title),source:t(record.source),article,page:placeholder(page)?'':page,
  scope,revision:t(record.date||record.version||record.effectiveDate),status,verifiedText:officialText?actualText:null,
  projectRevisionAccepted:record.project_revision_accepted===true,revisionVerified:record.revision_verified===true};
}
function build(register){
 const rows=(Array.isArray(register?.records)?register.records:[]).map(classify).filter(Boolean);
 return {rows,counts:{total:rows.length,verifiedCitations:rows.filter(r=>r.status==='verified_citation').length,
  verifiedFullText:rows.filter(r=>r.status==='article_text_verified').length,catalogOnly:rows.filter(r=>r.status==='catalog_only').length}};
}
root.KT603LegalArchive=Object.freeze({classify,build});
})(window);
