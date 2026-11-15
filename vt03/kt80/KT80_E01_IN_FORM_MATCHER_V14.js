/* KT80 E01 V14 — IN document to official template comparison, never legal route choice.
   Reads a curated registry of source anchors; input originals remain untouched. */
(function(root){'use strict';
const registryUrl='KT80_E01_IN_FORM_REGISTRY_V14.json';
function normalize(x){return String(x||'').toLocaleLowerCase('bg-BG').normalize('NFKC').replace(/[\s\u00a0]+/g,' ').trim()}
function evidence(result){
 const passages=[];
 function push(text,source,kind){if(typeof text==='string'&&text.trim())passages.push({text:normalize(text.slice(0,12000)),source,kind})}
 for(const d of result.files||[])push(d.filename||d.file||d.name,'име на файл','filename');
 for(const s of result.subject_candidates||[]){
  push(typeof s==='string'?s:s.title||s.heading,s.source||'предмет','extracted');
  for(const t of s.sections||[])push(typeof t==='string'?t:t.text,s.source||'секция','extracted');
 }
 for(const d of result.dossier_documents||[]){
  push(d.file,'документ','filename');
  for(const f of d.facts||[])push(f.value,d.file||'факт','extracted');
  for(const v of d.references||[])push(typeof v==='string'?v:v.text||v.excerpt,d.file||'референция','extracted');
 }
 return passages;
}
function matchForm(form,passages){
 let score=0,contentHits=0,signals=[],origins=new Set();
 for(const k of form.strong||[]){
  const p=passages.find(x=>x.text.includes(normalize(k)));
  if(p){score+=p.kind==='filename'?1:3;contentHits+=p.kind==='extracted'?1:0;signals.push(k);origins.add(p.source)}
 }
 for(const k of form.keywords||[]){
  const p=passages.find(x=>x.text.includes(normalize(k)));
  if(p){score+=p.kind==='filename'?1:2;contentHits+=p.kind==='extracted'?1:0;signals.push(k);origins.add(p.source)}
 }
 return {form,score,contentHits,signals,sourceLabels:[...origins].slice(0,4),
   kind:score>=5&&contentHits>=1&&signals.length>=2?'POTENTIAL_FORM_MATCH_REQUIRES_EXPERT':
        score>=2?'WEAK_INDICATION_REQUIRES_REVIEW':'NO_RELIABLE_TEMPLATE_MATCH'};
}
function el(tag,text,className){const node=document.createElement(tag);if(className)node.className=className;if(text!=null)node.textContent=text;return node}
function display(registry,result){
 const host=document.getElementById('kt80FormMatches');if(!host)return;
 host.replaceChildren();
 const hits=registry.forms.map(f=>matchForm(f,evidence(result))).filter(x=>x.score>=2).sort((a,b)=>b.score-a.score||a.form.id.localeCompare(b.form.id));
 if(!hits.length){host.append(el('p','Няма достатъчно текстови сигнали за надежден кандидат за нормативен образец. Прегледайте оригинала; липсата на съвпадение не означава нередовна преписка.'));return}
 host.append(el('p','Предварително сравнение по прочетени заглавия, откъси и източници. Това не удостоверява съответствие с нормативния образец или приложима процедура.'));
 for(const h of hits.slice(0,5)){
  const section=el('section',null,'kt80-match-result');
  section.append(el('strong',h.form.title+' · '+h.form.id));
  section.append(el('p',(h.kind==='POTENTIAL_FORM_MATCH_REQUIRES_EXPERT'?'Кандидат за съвпадение':'Слабо сходство — нужда от преглед')+' · доказателствени сигнали: '+h.signals.join('; ')));
  section.append(el('small','Откъси/имена: '+h.sourceLabels.join('; ')+' · Правно основание (за проверка): '+h.form.official_basis));
  const a=el('a','Официален източник ↗');a.href=h.form.source;a.target='_blank';a.rel='noopener noreferrer';section.append(a);
  section.append(el('small','Актуалната редакция и задължителните реквизити НЕ са потвърдени. Резултатът НЕ определя процедурата.'));
  host.append(section);
 }
 if(hits.filter(x=>x.kind==='POTENTIAL_FORM_MATCH_REQUIRES_EXPERT').length>1)host.append(el('p','Няколко възможни съвпадения: изисква се преглед на всеки документ и нормативния клон.'));
}
async function compare(result){
 const host=document.getElementById('kt80FormMatches');if(host)host.textContent='Проверка на документните кандидати по наличните откъси…';
 try{
  const response=await fetch(registryUrl,{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const registry=await response.json();
  if(!registry||!Array.isArray(registry.forms)||registry.forms.length<1)throw Error('липсва валиден регистър');
  display(registry,result);
  return {status:'COMPARISON_ONLY_NOT_LEGAL_CLASSIFICATION',registryCount:registry.forms.length};
 }catch(e){if(host)host.textContent='Сравнението с образците не е изпълнено: '+String(e?.message||e)+'. Обработката на преписката остава отделна.';return {status:'UNAVAILABLE'};}
}
root.KT80FormMatcher=Object.freeze({compare,matchForm,evidence});
})(window);
