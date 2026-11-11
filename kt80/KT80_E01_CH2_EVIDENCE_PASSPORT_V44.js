/* KT80 CH2 V44 — preliminary, source-traceable dossier evidence passport.
 * Consumes V26 intake and IP MASTER V15; does not make legal decisions or verify claims.
 * All excerpts remain candidates, not proven facts. */
(function(root){'use strict';
const TOPICS=[
 ['activity','Предмет и основна дейност'],
 ['construction','Строителство, оборудване и съпътстващи дейности'],
 ['capacity','Капацитет и технически параметри'],
 ['area','Териториален обхват и площ'],
 ['water_supply','Водоснабдяване'],
 ['wastewater','Отпадъчни води и заустване'],
 ['electricity','Електрозахранване'],
 ['access','Транспортен достъп'],
 ['emissions','Емисии и въздействия'],
 ['waste','Отпадъци']
];
const t=x=>String(x??'').replace(/\s+/gu,' ').trim();
const norm=x=>t(x).toLocaleLowerCase('bg');
function polarity(text){
 const x=norm(text);
 const neg=/\b(?:не се предвижда|няма да|не се изгражда|не се използва|не е предвидено|не са предвидени|не се осъществява|без заустване)\b/u.test(x);
 const pos=/\b(?:предвижда се|ще се|се изгражда|ще бъде|ще има|се осигурява|ще се използва|осъществява се|заустване във|заустване в)\b/u.test(x);
 return neg&&!pos?'negative':pos&&!neg?'positive':'unspecified';
}
function build(intake,ip,audit){
 const files=Array.isArray(audit?.records)?audit.records:[];
 const byFile=new Map(files.map(x=>[x.file,x]));
 const fields=Array.isArray(ip?.fields)?ip.fields:[];
 const byTopic=new Map(fields.map(x=>[x.key,x]));
 const topics=TOPICS.map(([key,label])=>{
  const field=byTopic.get(key);
  const unique=new Map();
  for(const e of field?.evidence||[]){
   const excerpt=t(e.excerpt),document=t(e.document)||'НЕУСТАНОВЕН ДОКУМЕНТ';
   if(!excerpt)continue;
   const id=document+'|'+norm(excerpt);
   if(!unique.has(id))unique.set(id,{document,excerpt,kind:t(e.kind),polarity:polarity(excerpt),readStatus:byFile.get(document)?.state||'UNKNOWN',page:null,verified:false});
  }
  const sources=[...unique.values()].slice(0,16);
  const documents=[...new Set(sources.map(x=>x.document))];
  // Do not treat different statements as contradictions merely because there are multiple texts.
  // Opposite explicit assertions across excerpts are only a candidate for expert review.
  const possibleOpposition=sources.some(x=>x.polarity==='positive')&&sources.some(x=>x.polarity==='negative');
  return {key,label,status:sources.length?'ИМА ОТКЪСИ · НЕПОТВЪРДЕНИ':'НЯМА ДАННИ',
    sources,documentCount:documents.length,possibleOpposition,
    reviewRequired:possibleOpposition||sources.some(x=>x.readStatus!=='TEXT_EXTRACTED'),
    verified:false};
 });
 const unread=files.filter(x=>x.state==='UNSUPPORTED'||x.state==='NOT_READ');
 const caution=files.filter(x=>x.state==='REVIEW_REQUIRED');
 const possibleConflicts=topics.filter(x=>x.possibleOpposition);
 const dossierConflicts=(intake?.dossier_analysis?.findings||[]).filter(x=>x.conflict===true);
 const semanticFlags=(intake?.semantic_review?.flags||[]).filter(x=>x.kind==='conflict');
 const leading=intake?.classification?.leading_candidates||[];
 const notice={blocked:unread.length>0,unread:unread.map(x=>({file:x.file,reason:x.readerStatus})),review:caution.map(x=>x.file),
  missingTopics:topics.filter(x=>!x.sources.length).map(x=>x.label),leadingParcelCandidates:leading.length,
  pageTraceVerified:false};
 return Object.freeze({
  schema:'KT80-CH2-EVIDENCE-PASSPORT-V44',caseName:t(intake?.archive_name),generatedFrom:'V26 IN + IP MASTER V15 + Ч1',
  topics,filesCount:files.length,withEvidence:topics.filter(x=>x.sources.length).length,missingTopics:notice.missingTopics.length,
  uniqueExcerpts:topics.reduce((n,x)=>n+x.sources.length,0),unreadCount:unread.length,ocrReviewCount:caution.length,
  reviewFlags:{oppositePhrasing:possibleConflicts.map(x=>x.label),existingDossierConflicts:dossierConflicts.map(x=>({topic:x.key,status:x.status})),semantic:semanticFlags.map(x=>x.label)},
  limitations:notice,
  status:unread.length?'НЕПЪЛНА ПРЕПИСКА':caution.length||!leading.length?'ЗА ЕКСПЕРТНА ПРОВЕРКА':'ПРЕДВАРИТЕЛНО ИЗВЛЕЧЕНО',
  requiredStatement:'Откъсите са кандидат-доказателства. Няма автоматично потвърдени факти, прецизна страницова проследимост или окончателна правна квалификация.',
  acceptedForAutomaticProcedure:false
 });
}
function node(tag,text,css){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(css)e.className=css;return e}
function addOriginalButton(parent,file){
 const btn=node('button','◉ Оригинал','kt80-ch2-open');btn.type='button';
 btn.title='Отвори първичния документ за проверка';
 btn.addEventListener('click',()=>{if(root.KT80DossierOriginals?.openOriginal)root.KT80DossierOriginals.openOriginal(file);});
 parent.append(btn);
}
function render(result){
 const host=document.getElementById('kt80CH2Passport');if(!host)return;
 host.replaceChildren();host.append(node('h3','Ч2 · Доказателствен паспорт на преписката'));
 host.append(node('p','Теми с откъси: '+result.withEvidence+'/'+result.topics.length+' · Изходни откъси: '+result.uniqueExcerpts+
 ' · Непрочетени файлове: '+result.unreadCount+' · За OCR/документна проверка: '+result.ocrReviewCount+'.','kt80-ch2-summary'));
 host.append(node('p',result.requiredStatement,'kt80-ch2-warning'));
 if(result.unreadCount)host.append(node('p','КРИТИЧНО: Има непрочетени материали. Не може да се приема, че предметът и обхватът са пълно доказани.','kt80-ch2-critical'));
 if(result.limitations.leadingParcelCandidates===0)host.append(node('p','Няма автоматично установен водещ ПИ. Това не доказва, че ИП няма териториален обхват; проверете вида на преписката и документите.','kt80-ch2-warning'));
 if(result.reviewFlags.oppositePhrasing.length||result.reviewFlags.existingDossierConflicts.length||result.reviewFlags.semantic.length){
  const d=document.createElement('details');d.className='kt80-ch2-alert';d.open=true;
  d.append(node('summary','Сигнали за експертна проверка на противоречия'));
  for(const x of result.reviewFlags.oppositePhrasing)d.append(node('p','Потенциално противоположни формулировки: '+x+' — сравнете оригиналните документи.'));
  for(const x of result.reviewFlags.existingDossierConflicts)d.append(node('p','Съществуващ анализ: '+x.topic+' · '+x.status));
  for(const x of result.reviewFlags.semantic)d.append(node('p','Семантичен сигнал: '+x));
  host.append(d);
 }
 for(const item of result.topics){
  const d=document.createElement('details');d.className='kt80-ch2-topic';
  d.append(node('summary',item.label+' · '+item.status+' · '+item.sources.length+' откъса'));
  if(!item.sources.length)d.append(node('p','НЯМА ДАННИ в извлеченото. Липсата на откъс не означава отсъствие на дейност или въздействие.'));
  for(const src of item.sources){
   const card=node('div',undefined,'kt80-ch2-evidence');
   const head=node('div','Източник: '+src.document+' · '+(src.readStatus==='TEXT_EXTRACTED'?'текстово извличане':'изисква допълнителна проверка'),'kt80-ch2-source');
   card.append(head,node('p','„'+src.excerpt+'“'));
   addOriginalButton(card,src.document);d.append(card);
  }
  if(item.possibleOpposition)d.append(node('p','ВЪЗМОЖНО ПРОТИВОРЕЧИЕ — установени са утвърдителна и отрицателна формулировка; необходим е контекстен преглед.','kt80-ch2-critical'));
  host.append(d);
 }
 const footer=node('p','Проследимост до документ и откъс: налична. Проверена страница, таблица, приложение, ревизия и точност на OCR: все още НЕ са установени.','kt80-ch2-footnote');
 host.append(footer);
}
function reset(){const host=document.getElementById('kt80CH2Passport');if(host){host.replaceChildren();host.textContent='Доказателственият паспорт ще се изгради след обработка на преписката.'}}
root.KT80CH2Evidence=Object.freeze({build,render,reset});
document.addEventListener('kt80:case-reset',reset);
})(window);
