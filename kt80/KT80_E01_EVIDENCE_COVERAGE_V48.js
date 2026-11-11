/* KT80 V48 shared file-evidence coverage rules for IP MASTER and CH2.
   NOTE: a readable file is not a factually verified document.
   Missing extracted evidence never proves a negative fact. */
(function(root){'use strict';
const statusOf=s=>s==='TEXT_EXTRACTED'?'read':s==='REVIEW_REQUIRED'?'review':s==='NOT_READ'||s==='UNSUPPORTED'?'unread':'unknown';
function getFiles(audit){return Array.isArray(audit?.records)?audit.records:[]}
function summarize(audit,documentNames=[]){
 const files=getFiles(audit),wanted=[...new Set(documentNames.filter(Boolean))];
 const selected=wanted.map(name=>files.find(f=>f.file===name)||{file:name,state:'UNKNOWN'}); // retain unknown provenance
 const tally=data=>data.reduce((x,f)=>(x[statusOf(f.state)]++,x),{read:0,review:0,unread:0,unknown:0});
 const all=tally(files),sources=tally(selected);
 return {files:files.length,sourceFiles: selected.length,all,sources,
   hasMissingReaderData:files.length===0,
   hasIncompleteCoverage:all.unread>0||all.review>0||all.unknown>0,
   sourceRisk:sources.unread>0||sources.review>0||sources.unknown>0};
}
function statusLabel(summary,hasEvidence){
 const src=summary.sources,all=summary.all;
 if(hasEvidence){
  if(!summary.sourceFiles)return 'ИМА ОТКЪСИ · ИЗТОЧНИКЪТ НЕ Е УСТАНОВЕН';
  if(src.unknown)return 'ИМА ОТКЪСИ · НЕУСТАНОВЕН СТАТУС НА ИЗТОЧНИКА';
  if(src.unread)return 'ИМА ОТКЪСИ · ИЗТОЧНИК С НЕПРОЧЕТЕН СТАТУС';
  if(src.review&&src.read)return 'ИМА ОТКЪСИ · СМЕСЕНА ОСНОВА (ПРОЧЕТЕН + ЗА ПРОВЕРКА)';
  if(src.review)return 'ИМА ОТКЪСИ · ИЗТОЧНИК ЗА ПРОВЕРКА';
  return 'ИМА ОТКЪСИ · ОТ ПРОЧЕТЕН ФАЙЛ (НЕПОТВЪРДЕНИ)';
 }
 if(summary.hasMissingReaderData)return 'НЯМА ДАННИ В ИЗВЛЕЧЕНОТО · СТАТУСЪТ НА ФАЙЛОВЕТЕ Е НЕИЗВЕСТЕН';
 if(all.unread)return 'НЯМА ДАННИ В ИЗВЛЕЧЕНОТО · ИМА НЕПРОЧЕТЕНИ ФАЙЛОВЕ';
 if(all.review)return 'НЯМА ДАННИ В ИЗВЛЕЧЕНОТО · ИМА ФАЙЛОВЕ ЗА ПРОВЕРКА';
 return 'НЯМА ДАННИ В ИЗВЛЕЧЕНОТО · ВСИЧКИ ФАЙЛОВЕ С ИЗВЛЕЧЕН ТЕКСТ';
}
function brief(s){const a=s.all,b=s.sources;return 'Преписка: '+a.read+' 🟢 прочетени · '+a.review+' 🟡 за проверка · '+a.unread+' 🔴 непрочетени'+(a.unknown?' · '+a.unknown+' неизвестни':'')+'; източници по темата: '+b.read+' 🟢 · '+b.review+' 🟡 · '+b.unread+' 🔴'+(b.unknown?' · '+b.unknown+' неустановени':'')+'.'}
root.KT80EvidenceCoverage=Object.freeze({summarize,statusLabel,brief,statusOf});
})(window);
