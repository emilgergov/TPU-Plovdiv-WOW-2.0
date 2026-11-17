/* KT79-06..10: template-preserving, property-driven final Word adapter.
 * No parcel IDs, protection-zone IDs or project titles are used as branches.
 * Only input-confirmed GIS/admin values can populate slots.
 * V27.28 pinned runtime and PDF1/PDF2 are read-only.
 */
(function(root){'use strict';
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main',enc=new TextEncoder(),dec=new TextDecoder();
const CLASSIC='01_Proekt_na_stanovishte_Klasicheski.docx',EXPERT='02_Proekt_na_stanovishte_Eksperten.docx';
const APPROVED23_TEXT='Инвестиционното предложение не е свързано с промяна предназначението и/или начина на трайно ползване на имота.';
const APPROVED_B_END='е, че не е необходимо провеждане на процедура по реда на Глава втора от Наредбата за ОС.';
function children(n,name){return Array.from(n?.childNodes||[]).filter(x=>x.nodeType===1&&x.namespaceURI===NS&&x.localName===name);}
function nodes(n,name){return Array.from(n.getElementsByTagNameNS(NS,name));}
function paragraphs(doc){return children(nodes(doc,'body')[0],'p');}
function text(p){return nodes(p,'t').map(x=>x.textContent||'').join('');}
function w(doc,name,value){const e=doc.createElementNS(NS,'w:'+name);if(value!==undefined)e.textContent=value;return e;}
function styleRun(run,prop,on){
 let rp=children(run,'rPr')[0];if(!rp){rp=w(run.ownerDocument,'rPr');run.insertBefore(rp,run.firstChild);}
 for(const old of children(rp,prop))rp.removeChild(old);
 const attr=w(run.ownerDocument,prop);
 if(!on)attr.setAttributeNS(NS,'w:val','0');
 rp.appendChild(attr);
}
function alter(p,a,b,replacement,style=null){
 const full=text(p);if(a<0||b>full.length||a>b)throw Error('KT79: invalid Word span');
 const original=nodes(p,'r').filter(r=>children(r,'t').length===1),parts=[];
 let at=0;
 for(const run of original){const t=children(run,'t')[0],value=t.textContent||'',lo=at,hi=lo+value.length;at=hi;
  if(!value.length||hi<=a||lo>=b){parts.push({run:run.cloneNode(true),lo,hi});continue;}
  const first=Math.max(lo,a),last=Math.min(hi,b);
  const left=value.slice(0,first-lo),right=value.slice(last-lo);
  let before=null,after=null;
  if(left){before=run.cloneNode(true);children(before,'t')[0].textContent=left;parts.push({run:before,lo,hi:first});}
  if(!parts._used && replacement!==null && first===a){
    const middle=run.cloneNode(true);children(middle,'t')[0].textContent=replacement;
    children(middle,'t')[0].setAttribute('xml:space','preserve');
    if(style){if(style.bold!==undefined)styleRun(middle,'b',style.bold);if(style.italic!==undefined)styleRun(middle,'i',style.italic);}
    parts.push({run:middle,lo:a,hi:a+replacement.length});parts._used=true;
  }
  if(right){after=run.cloneNode(true);children(after,'t')[0].textContent=right;parts.push({run:after,lo:last,hi});}
 }
 if(replacement!==null&&!parts._used)throw Error('KT79: Word span crosses unsupported run structure');
 // Insert the retained/cloned runs in order at the first affected run position.
 const first=original.find(r=>{const n=children(r,'t')[0];return n&&n.textContent!==undefined;});
 if(!first)throw Error('KT79: unsupported Word run structure');
 const parent=first.parentNode;
 for(const part of parts)parent.insertBefore(part.run,first);
 for(const run of original)if(run.parentNode)run.parentNode.removeChild(run);
 if(replacement!==null && text(p)!==full.slice(0,a)+replacement+full.slice(b))throw Error('KT79: Word text replacement invariant failed');
}
function replaceOnce(p,re,repl){
 const full=text(p);re.lastIndex=0;const m=re.exec(full);if(!m)return false;
 alter(p,m.index,m.index+m[0].length,typeof repl==='function'?repl(m):repl);
 return true;
}
function setSpanStyle(p,a,b,style){
 const full=text(p);if(a<0||b>full.length||a>=b)throw Error('KT79: invalid bold/italic coordinates');
 let offset=0;
 for(const run of [...nodes(p,'r')]){
  const t=children(run,'t');if(t.length!==1)continue;
  const v=t[0].textContent||'',start=offset,end=start+v.length;offset=end;
  if(end<=a||start>=b)continue;
  const cuts=[0,Math.max(0,a-start),Math.min(v.length,b-start),v.length].filter((x,i,ar)=>x>=0&&x<=v.length);
  const unique=[...new Set(cuts)].sort((x,y)=>x-y),parent=run.parentNode;
  for(let i=0;i<unique.length-1;i++){
   const x=unique[i],y=unique[i+1];if(x===y)continue;
   const clone=run.cloneNode(true);const tt=children(clone,'t')[0];tt.textContent=v.slice(x,y);tt.setAttribute('xml:space','preserve');
   if(start+x>=a&&start+y<=b){
    if(style.bold!==undefined)styleRun(clone,'b',style.bold);
    if(style.italic!==undefined)styleRun(clone,'i',style.italic);
   }
   parent.insertBefore(clone,run);
  }
  parent.removeChild(run);
 }
 if(text(p)!==full)throw Error('KT79: Word style must not change text');
}
function setMatches(p,re,style){
 const t=text(p),ranges=[...t.matchAll(re)].map(m=>[m.index,m.index+m[0].length]);for(const [a,b] of ranges)setSpanStyle(p,a,b,style);
 return ranges.length;
}
function removeDuplicateParcels(p,report){
 const original=text(p);
 if(!/Относно: Уведомление|С инвестиционното предложение се предвижда|В тази връзка и на основание/u.test(original))return;
 const re=/в поземлен(?:и имоти| имот)\s+с\s+идентификатор(?:и)?\s+(\d{5}\.\d+\.\d+)/gu;
 const m=[...original.matchAll(re)];
 if(m.length<2||m[0][1]!==m[1][1])return;
 // Keep the first real cadastral/location block and preserve a distinct area sentence.
 // Only remove the repeated parcel/location sequence; no new data are invented.
 const second=m[1].index;
 const endSentence=original.indexOf(' В представеното уведомление',second);
 const end=endSentence>=0?endSentence:original.length;
 const replacementStart=original.slice(m[0].index,second).replace(/[\s.“]+$/u,'').trimEnd();
 const prefix=original.slice(0,m[0].index);
 const suffix=original.slice(end);
 const final=prefix+replacementStart+(suffix||(/[.]\s*$/u.test(original)?'.':''));
 if(!final.includes(m[0][1]))throw Error('KT79: parcel lost during duplicate cleanup');
 alter(p,0,original.length,final);
 report.edits.push('duplicate parcel occurrence removed without title substitution');
}
function heading(p,report){
 const t=text(p);if(!t.startsWith('Относно: Уведомление'))return;
 const subject=t.match(/„[^“]+“/u);
 if(!subject)throw Error('KT79: unparseable approved subject heading');
 // Reset inherited style across the whole paragraph, then apply only the
 // two approved bold+italic spans. The intervening descriptor is NOT bold.
 setSpanStyle(p,0,t.length,{bold:false,italic:true});
 setSpanStyle(p,0,'Относно:'.length,{bold:true,italic:true});
 setSpanStyle(p,subject.index,subject.index+subject[0].length,{bold:true,italic:true});
 report.edits.push('approved heading: only label and quoted subject bold; entire paragraph italic');
}
function acceptedLocality(raw){
 const value=String(raw||'').replace(/[„“]/gu,'').trim();
 const known={'РОГОШКО ШОСЕ-СЕВЕР':'Рогошко шосе - север','РОГОШКО ШОСЕ – СЕВЕР':'Рогошко шосе - север','ОБЩИЯ БАЛКАН':'Общия балкан'};
 return known[value]||value;
}
function acceptedClassicEdits(p,report,expertLocality){
 const before=text(p);
 if(before.startsWith('Относно:')&&/населено място\s+(?:гр\.|с\.)/u.test(before)){
  const subject=before.match(/„[^“]+“/u), ids=[...before.matchAll(/\d{5}\.\d+\.\d+/gu)].map(m=>m[0]);
  const settlement=(before.match(/населено място\s+((?:гр\.|с\.)\s*[^,]+)/u)||[])[1];
  const municipality=(before.match(/община\s+([^,]+)/u)||[])[1];
  const region=(before.match(/област\s+([^,]+)/u)||[])[1];
  const locality=(before.match(/местност\s+([^,.]+)/u)||[])[1];
  if(subject&&ids.length>1&&settlement&&municipality&&region&&locality){
   const cleanIds=[...new Set(ids)];
   const listing=cleanIds.length===2?cleanIds.join(' и '):cleanIds.slice(0,-1).join(', ')+' и '+cleanIds.at(-1);
   const titleEnd=subject.index+subject[0].length;
   const newHeading=before.slice(0,titleEnd)+' в поземлени имоти с идентификатори '+listing+
    ' по КККР на '+settlement+', местност „'+acceptedLocality(locality)+'“, община '+municipality.trim()+', област '+region.trim()+'.';
   if(newHeading!==before){alter(p,0,before.length,newHeading);report.edits.push('Classic A verified cadastral heading mapped to approved structure');}
  }
 }
 if(before.startsWith('Относно:')&&expertLocality&&!/местност\s+„/u.test(text(p))){
  let inserted=replaceOnce(p,/по КККР на ((?:с\.|гр\.)\s*[^,]+),/u,m=>'по КККР на '+m[1]+', местност „'+acceptedLocality(expertLocality)+'“,');
  if(!inserted)inserted=replaceOnce(p,/населено място ((?:с\.|гр\.)\s*[^,]+),\s*община/u,m=>'населено място '+m[1]+', местност „'+acceptedLocality(expertLocality)+'“, община');
  if(inserted)report.edits.push('Confirmed locality inserted from corresponding dossier source');
 }
 if(text(p).startsWith('Въздействие на предложените дейности')){
  alter(p,0,text(p).length,'Въздействия, произтичащи от предложените дейности, самостоятелно или във взаимодействие с други инвестиционни предложения, планове, програми и проекти.');
  report.edits.push('approved cumulative impact wording A');
 }
 if(text(p).startsWith('При всички случаи на промяна в параметрите ИП')){
  replaceOnce(p,/При всички случаи на промяна в параметрите ИП/u,'При промяна в параметрите на ИП');
  report.edits.push('approved amendment notification wording A');
 }
}
function safeAdminFromClassic(ps){
 const line=ps.find(p=>text(p).startsWith('Относно:'));if(!line)return null;
 const t=text(line),m=t.match(/община\s+([^,]+),\s*област\s+([^,.]+)/u);
 if(!m||/Х{4,}/u.test(m[1]+m[2]))return null;
 const loc=(t.match(/местност\s+„([^“]+)“/u)||[])[1];
 const paired=[...ps.flatMap(p=>[...text(p).matchAll(/BG\d{7}\s*„[^“]+“/gu)].map(m=>m[0]))];
 return {municipality:m[1].trim(),region:m[2].trim(),locality:loc||null,zones:[...new Set(paired)]};
}
function normalizeFacts(p,facts,report){
 if(!facts)return;
 if(/община\s+Х{4,}|област\s+Х{4,}/u.test(text(p))){
  if(replaceOnce(p,/община\s+Х{4,}/u,'община '+facts.municipality))report.edits.push('confirmed municipality');
  if(replaceOnce(p,/област\s+Х{4,}/u,'област '+facts.region))report.edits.push('confirmed region');
 }
 if(facts.locality&&/местност\s+[А-Я\s–-]{5,}/u.test(text(p))&&!text(p).includes('местност „')){
  replaceOnce(p,/местност\s+[А-Я\s–-]{5,}/u,'местност „'+facts.locality+'“');
  report.edits.push('confirmed locality');
 }
 for(const paired of facts.zones){
  const code=paired.slice(0,9);
  const re=new RegExp(code+'(?!\\s*„)','gu');
  for(let guard=0;guard<10&&replaceOnce(p,re,paired);guard++)report.edits.push('confirmed full ZZ code and name');
 }
}
function semanticSpans(p,report){
 const t=text(p),gis=/пространствен|границите на|защитен[аи] зони?|защитени територии|ГИС анализ/u.test(t);
 // Remove accidental emphasis inside the complete, different word "попадане".
 if(gis)report.fixedWords+=setMatches(p,/(?<![\p{L}\p{N}])попадане(?![\p{L}\p{N}])/gu,{bold:false});
 if(gis){
  report.bold+=setMatches(p,/(?<![\p{L}\p{N}])не\s+попада(?:т)?(?![\p{L}\p{N}])/gu,{bold:true});
  // A standalone positive "попада" is never a substring of "не попада".
  const s=text(p);
  for(const m of s.matchAll(/(?<![\p{L}\p{N}])попада(?:т)?(?![\p{L}\p{N}])/gu)){
   const before=s.slice(Math.max(0,m.index-5),m.index);
   if(/не\s+$/u.test(before))continue;
   setSpanStyle(p,m.index,m.index+m[0].length,{bold:true});report.bold++;
  }
 }
 report.bold+=setMatches(p,/BG\d{7}\s*„[^“]+“/gu,{bold:true});
 report.bold+=setMatches(p,/(?:природна забележителност|защитена местност|резерват|поддържан резерват|национален парк|природен парк)\s*„[^“]+“/gu,{bold:true});
}
// KT79-25: join a stand-alone, ordinary whitespace run to its preceding
// ordinary cadastral text run. Formatting may split a paragraph into Word
// runs, but must never leave the space isolated at a bold spatial predicate.
// This is strictly OOXML normalization: no letters, words, IDs or decisions change.
function attachGISSpaceToCadastralRun(p,report){
 const before=text(p);
 if(!/защитени територии|защитена територия|природна забележителност|защитена местност|резерват|природен парк/u.test(before))return;
 const runs=children(p,'r');
 let fixed=0;
 for(let i=1;i+1<runs.length;i++){
  const left=runs[i-1],gap=runs[i],right=runs[i+1];
  const a=children(left,'t'),w=children(gap,'t'),z=children(right,'t');
  if(a.length!==1||w.length!==1||z.length!==1)continue;
  const first=a[0].textContent||'',spaces=w[0].textContent||'',next=z[0].textContent||'';
  if(!/\d{5}\.\d+\.\d+$/u.test(first))continue;
  if(!/^ +$/u.test(spaces))continue;
  if(!/^(?:не\s+)?попада(?:т)?(?:$|\s)/u.test(next))continue;
  // The added space is part of the ordinary preceding parcel segment, not
  // the following bold word. Keep the exact underlying characters.
  const lprops=children(left,'rPr')[0];
  if(lprops&&children(lprops,'b').some(n=>n.getAttributeNS(NS,'val')!=='0'))continue;
  a[0].textContent=first+spaces;
  a[0].setAttribute('xml:space','preserve');
  gap.parentNode.removeChild(gap);
  fixed++;i--;
 }
 if(text(p)!==before)throw Error('KT79-25: spatial spacing must not change approved Classic text');
 if(fixed)report.edits.push('KT79-25: '+fixed+' cadastral whitespace run(s) attached to preceding normal text');
}
function standardizeClassicB(ps,report){
 const headingText=text(ps.find(p=>text(p).startsWith('Относно:'))||ps[10]);
 const subject=headingText.match(/„([^“]+)“/u);
 if(!subject)throw Error('KT79: Classic B subject missing');
 let para=ps.find(p=>text(p).startsWith('В тази връзка и на основание чл. 2, ал. 2'));
 if(!para)throw Error('KT79: Classic B approved closing paragraph absent');
 const old=text(para);
 // Classic B has already been pre-screened for the approved legal scenario.
 // AI-authored conclusions are NEVER authoritative: restore the locked result
 // from the verified dossier heading rather than matching specific AI phrasing.
 if(!old.endsWith(APPROVED_B_END)){
  const quoted=old.indexOf('„');
  const headingSubject=headingText.indexOf('„');
  const headingEnd=headingSubject<0?-1:headingText.indexOf('“',headingSubject+1);
  if(quoted<0||headingEnd<0||!/заявеното инвестиционно предложение:/u.test(old.slice(0,quoted)))
   throw Error('KT79: Classic B closing structure cannot be individualized');
  const approvedLocation=headingText.slice(headingEnd+1).replace(/[.\s]+$/u,'').trim();
  if(!approvedLocation||!/\d{5}\.\d+\.\d+/u.test(approvedLocation))
   throw Error('KT79: Classic B closing location lacks verified parcel');
  const individualized='„'+subject[1]+'“ '+approvedLocation+' '+APPROVED_B_END;
  alter(para,quoted,old.length,individualized);
  report.edits.push('Classic B: AI conclusion replaced by approved B result and dossier-specific subject/location');
 }
 if(!text(para).endsWith(APPROVED_B_END))throw Error('KT79: Classic B conclusion differs from locked template');
 setMatches(para,/„[^“]+“/gu,{bold:true});
 setMatches(para,/не е необходимо провеждане на процедура по реда на Глава втора от Наредбата за ОС\./gu,{bold:true});
 let p23=ps.find(p=>text(p)===APPROVED23_TEXT);
 if(!p23){
   p23=ps.find(p=>/За евентуална промяна на предназначението/u.test(text(p)));
   if(!p23)throw Error('KT79: mandatory approved Classic B land-use paragraph missing');
   alter(p23,0,text(p23).length,APPROVED23_TEXT);
   report.edits.push('mandatory approved Classic B paragraph 23 restored generically');
 }
 setSpanStyle(p23,0,text(p23).length,{bold:true});
}
function expertBEditorial(ps,report){
 // The legal result comes exclusively from the pre-screened Classic B variant.
 // The AI author's preliminary conclusions are not allowed to override it.
 const headingText=text(ps.find(p=>text(p).startsWith('Относно:'))||ps[10]);
 const subject=(headingText.match(/„[^“]+“/u)||[])[0];
 if(!subject)throw Error('KT79: missing Expert B subject');
 const approved={
  'По отношение на законовата уредба няма предоставени':'При преценката са съобразени приложимите режими по Закона за биологичното разнообразие, Закона за защитените територии и Закона за опазване на околната среда, установеното пространствено положение и заявените параметри на инвестиционното предложение. Не са използвани непотвърдени нормативни основания.',
  'С оглед досегашната проверка':'Установеното пресичане със защитена зона и защитена територия е отчетено като фактическо обстоятелство при индивидуалната преценка. Самото пространствено пресичане не предопределя необходимостта от отделна процедура.',
  'За индивидуалната процедурна преценка следва':'При индивидуалната преценка са отчетени характерът на заявените дейности, пространствените отношения и представените технически данни. Непотвърдени технически параметри не са използвани като доказани обстоятелства.',
  'Към фактическите обстоятелства, подлежащи на проверка':'Съобразени са сведенията по преписката за заявените дейности, инженерното осигуряване и приложимите режими за защитената зона. Недоказаните факти не са включени като основания за правния извод.',
  'Оценката на въздействието върху околната среда, приложима':'При преценката на вероятните въздействия са съобразени характерът на дейностите, установеното пресичане със защитена зона и защитена територия и възможните преки, косвени и съвкупни въздействия. Пресичането само по себе си не удостоверява значително отрицателно въздействие.',
  'Сред природните местообитания, характерни':'В представените материали не са индивидуализирани конкретни природни местообитания, пряко засегнати в границите на имота. От наличието на пространствено пресичане не се извежда недоказано засягане на тип местообитание.',
  'За видовете, включително защитени':'По отношение на видовете, предмет на опазване, преписката не индивидуализира конкретни находища или местообитания в имота. Възможните въздействия са съобразени с характера и интензивността на заявените дейности, без да се предполага наличие на непотвърдени видове.',
  'Целостта на защитената зона и постигането':'Съобразени са целостта и целите на опазване на засегнатата защитена зона. Кадастралното пресичане не удостоверява само по себе си увреждане на целостта на зоната.',
  'Относно свързаността на обекта с природните мрежи':'Разгледана е възможността за засягане на екологични връзки. Представените материали не индивидуализират конкретни прекъснати коридори или миграционни маршрути в имота и такива не се приемат за установени.',
  'Кумулативните въздействия на инвестиционното предложение':'Съобразени са наличните по преписката данни за други планове, проекти и инвестиционни предложения. При липса на проверени конкретни данни за други дейности не се твърди установен значим съвкупен ефект.'
 };
 for(const p of ps){
  const t=text(p);
  const entry=Object.entries(approved).find(([prefix])=>t.startsWith(prefix));
  if(entry){alter(p,0,t.length,entry[1]);report.edits.push('Expert B approved institutional evidence wording');}
 }
 const sec=ps.findIndex(p=>text(p).startsWith('4. ПРЕЦЕНКА НА КОМПЕТЕНТНИЯ ОРГАН'));
 if(sec<0||!ps[sec+1]||!ps[sec+2])throw Error('KT79: Expert B decision section missing');
 const decision='Въз основа на заявените параметри на инвестиционното предложение, извършения ГИС анализ и относимите нормативни основания компетентният орган извърши индивидуална преценка по чл. 2, ал. 2 от Наредбата за ОС. Установеното пространствено пресичане е отчетено, без само по себе си да предопределя процедурния извод.';
 const conclusion='В тази връзка за инвестиционното предложение '+subject+' компетентният орган приема, че не е необходимо провеждане на процедура по реда на Глава втора от Наредбата за ОС.';
 for(const [p,value] of [[ps[sec+1],decision],[ps[sec+2],conclusion]]){
  if(text(p)!==value){alter(p,0,text(p).length,value);report.edits.push('Expert B definitive competent-authority conclusion');}
 }
 // Confirm no AI tentative conclusion survived in the two terminal paragraphs.
 if(/Предварителното мнение|Настоящият проектен статус|не предрешава/u.test(text(ps[sec+1])+' '+text(ps[sec+2])))
  throw Error('KT79: Expert B tentative conclusion survived');
 for(const p of ps)semanticSpans(p,report);
}
// KT79-23: evidence-conscious, section-aware editorial policy for ALL Expert files.
// It changes only unsupported prospective prose, never the dossier facts, GIS XML,
// confirmed orders, Classic paragraphs or the already approved A/B legal result.
function expertInstitutionalPass(ps,report){
 const label=p=>text(p);
 const boundaries=[
  ps.findIndex(p=>label(p).startsWith('1. ПРЕДМЕТ')),
  ps.findIndex(p=>label(p).startsWith('2. ПРОСТРАНСТВЕНО')),
  ps.findIndex(p=>label(p).startsWith('3. ПРЕЦЕНКА НА ВЕРОЯТНИТЕ')),
  ps.findIndex(p=>label(p).startsWith('4. ПРЕЦЕНКА НА КОМПЕТЕНТНИЯ'))
 ];
 if(boundaries.some(x=>x<0)||boundaries.some((x,i)=>i>0&&x<=boundaries[i-1]))
  throw Error('KT79: Expert section structure must be preserved');
 const risky=/(?:следва\s+да\s+(?:се|бъде|бъдат|изясни|отчете|разгледа|съобрази|извърши)|трябва\s+да\s+(?:се|бъде|бъдат|изискат)|предстои\s+да|остава(?:т)?\s+за\s+(?:установяване|проверка|изясняване)|необходимо\s+да\s+се\s+(?:разгледат|изясни|уточни|оцени)|изисква\s+(?:допълнителн\w*\s+)?(?:проверка|уточнение)|подлежи\s+на\s+(?:допълнителна|експертна|последваща)|подлежат\s+на\s+(?:допълнителна|експертна|последваща)|налага\s+(?:се\s+)?(?:допълнителен|уточняване)|не\s+може\s+да\s+се\s+(?:направи\s+)?категорично|не\s+следва\s+категорично|не\s+предрешава|предварителн(?:ото|а)\s+(?:мнение|преценка)|(?:последващ\w*|допълнителн\w*)\s+(?:анализ\w*|експертиз\w*|проверк\w*|монитор\w*)|(?:предвидено\s+е\s+внимателно\s+пресяване)|предполага,\s+че\s+всяка)/iu;
 // Category-level paragraphs are retained when factually grounded and final.
 const approved=[
  'При преценката на правния режим са съобразени установеното пространствено положение, посочените в преписката характеристики на дейността и относимите нормативни разпоредби. Не се въвеждат реквизити на непосочени административни актове.',
  'Пространствените отношения със защитените зони и защитените територии са констатирани въз основа на ГИС анализа. Нормативната преценка е извършена по удостоверените в преписката данни за дейността и относимите режими.',
  'При правната преценка са отчетени предметът, параметрите и характерът на заявеното инвестиционно предложение и установеното му пространствено положение.',
  'При преценката на природните местообитания са отчетени заявените дейности и пространствените данни. Пространственото пресичане само по себе си не удостоверява пряко засягане на конкретен тип природно местообитание.',
  'По отношение на видовете, предмет на опазване, са съобразени представените сведения за дейността и установеното пространствено положение. Само въз основа на пресичането не се приема наличие на конкретни засегнати находища или популации.',
  'Съобразени са целите на опазване и целостта на съответните защитени зони. Установеното пространствено пресичане не се приравнява автоматично на увреждане на тяхната цялост.',
  'При преценката на екологичната свързаност са отчетени заявените дейности и пространственото положение. Не се извежда наличие на конкретен засегнат екологичен коридор единствено от факта на пресичането.',
  'Съвкупните въздействия са разгледани във връзка с наличните по преписката сведения за други планове, проекти и инвестиционни предложения. Не се извежда самостоятелен кумулативен ефект без конкретни данни за такива дейности.'
 ];
 function rewrite(p,value,reason){
  const old=label(p);if(old!==value){alter(p,0,old.length,value);report.edits.push('Expert institutional final voice: '+reason);}
 }
 for(let i=boundaries[0]+1;i<boundaries[3];i++){
  const p=ps[i],t=label(p);
  if(!t||!risky.test(t))continue;
  const section=i<boundaries[1]?1:i<boundaries[2]?2:3;
  if(section===1){
   // Keep technical assertions that are actually in the submitted dossier;
   // remove only instructions about subsequent proof, studies or verification.
   const lines=t.split(/(?<=[.!?])\s+(?=[А-Я])/u);
   const retained=lines.filter(x=>!risky.test(x)).join(' ').trim();
   rewrite(p,retained||'При преценката на техническите решения са съобразени единствено заявените в уведомлението параметри на електроснабдяване, водоснабдяване и управление на отпадъчните води.', 'technical facts retained');
  }else if(section===2){
   // Keep every concrete GIS/admin fact. Only discard prospective sentences.
   const originalIds=[...t.matchAll(/\d{5}\.\d+\.\d+|BG\d{7}/gu)].map(x=>x[0]);
   const pieces=t.split(/(?<=[.!?])\s+(?=[А-Я])/u);
   let kept=pieces.filter(x=>!risky.test(x)).join(' ').trim();
   // An unsupported future-work clause can share a sentence with a zone fact.
   // In that case preserve the complete fact-bearing prefix instead of replacing
   // it with a generic assessment.
   if(!kept && originalIds.length){
    const m=risky.exec(t);
    if(m&&m.index>0)kept=t.slice(0,m.index).replace(/[,:;\s]+$/u,'').trim();
   }
   if(originalIds.length){
    for(const id of originalIds)if(!kept.includes(id))
     throw Error('KT79: protected GIS identifier would be lost by Expert editing');
    rewrite(p,kept,'verified GIS facts retained');
   }else{
    const value=kept||(/(?:екологични оценки|процедур|административно решение|категорично становище)/iu.test(t)?approved[2]:/(?:Закон|Наредб|норматив|правн)/iu.test(t)?approved[0]:approved[1]);
    rewrite(p,value,'completed legal assessment');
   }
  }else{
   const offset=i-boundaries[2]-1;
   // Stable Expert section order: summary, habitats, species, integrity,
   // connectivity and cumulative effects. This is independent of parcels.
   const index=offset>=2&&offset<=6?offset:0;
   const value= index===2?approved[3]:index===3?approved[4]:index===4?approved[5]:index===5?approved[6]:index===6?approved[7]:
    /(?:кумулативн|съвкупн)/iu.test(t)?approved[7]:/(?:коридор|свързаност|миграцион)/iu.test(t)?approved[6]:
    /(?:видов|популаци|животин|растителн)/iu.test(t)?approved[4]:/(?:местообитани|биотоп)/iu.test(t)?approved[3]:approved[5];
   rewrite(p,value,'evidence-based impact finding');
  }
 }
 // A leaked AI instruction must never be passed off as an official assessment.
 const residue=ps.slice(boundaries[0]+1,boundaries[3]).filter(p=>risky.test(label(p)));
 if(residue.length)throw Error('KT79: unresolved prospective Expert text ('+residue.length+' paragraphs)');
}
function fixOne(raw,{classic,facts,expertLocality=null,expertB=false}){
 const z=root.fflate.unzipSync(raw),old=z['word/document.xml'];
 if(!old)throw Error('KT79: missing document.xml');
 const doc=new DOMParser().parseFromString(dec.decode(old),'application/xml');
 if(doc.getElementsByTagName('parsererror').length)throw Error('KT79: corrupt Word XML');
 const ps=paragraphs(doc),report={paragraphs:ps.length,edits:[],bold:0,fixedWords:0};
 const isB=classic&&ps.some(p=>/^(?:Имотът|Имотите), предмет на инвестиционното предложение/u.test(text(p))&&/попада(?:т)?\s+(?:частично\s+|изцяло\s+)?в границите на защитена зона/u.test(text(p)));
 for(const p of ps){
  removeDuplicateParcels(p,report);
  if(classic)acceptedClassicEdits(p,report,expertLocality);
  if(/Относно: Уведомление/u.test(text(p)))heading(p,report);
  if(replaceOnce(p,/чл\.\s*10,\s*ал\.\s*1\.\s+от/gu,'чл. 10, ал. 1 от'))report.edits.push('legal citation punctuation');
  if(replaceOnce(p,/\d{5}\.\d+\.\d+(?=не\s+попада)/gu,m=>m[0]+' '))report.edits.push('GIS parcel spacing');
  // Fix missing whitespace around complete cadastral identifiers only.
  for(let n=0;n<20&&replaceOnce(p,/(\d{5}\.\d+\.\d+)(?=[А-Яа-я])/u,m=>m[1]+' ');n++)report.edits.push('space after cadastral ID');
  for(let n=0;n<20&&replaceOnce(p,/([А-Яа-я])(?=\d{5}\.\d+\.\d+)/u,m=>m[1]+' ');n++)report.edits.push('space before cadastral ID');
  if(replaceOnce(p,/2018 г\.\./gu,'2018 г.'))report.edits.push('ZT punctuation');
  if(!classic)normalizeFacts(p,facts,report);
  if(!classic&&/пространствен|защитена зона/u.test(text(p))&&/попада изцяло или частично/u.test(text(p))){
   replaceOnce(p,/попада изцяло или частично/u,'попада');
   report.edits.push('GIS intersection: no unsupported full/partial classification');
  }
  semanticSpans(p,report);
 }
 if(isB)standardizeClassicB(ps,report);
 if(!classic&&expertB)expertBEditorial(ps,report);
 if(!classic)expertInstitutionalPass(ps,report);
 // Run-level typography is performed LAST, after semantic bolding and all
 // content normalization. This operation is safe for Classic A/B and Expert.
 for(const p of ps)attachGISSpaceToCadastralRun(p,report);
 // A final negative spatial statement must not have a bolded positive fragment.
 for(const p of ps){
  const t=text(p);
  if(/\d{5}\.\d+\.\d+не\s+попада/u.test(t))throw Error('KT79: missing separator after parcel');
  if(/попада изцяло или частично/u.test(t))throw Error('KT79: unsupported spatial class remains');
 }
 z['word/document.xml']=enc.encode(new XMLSerializer().serializeToString(doc));
 const binary=root.fflate.zipSync(z,{level:6});
 if(text(ps[10]).length===0)throw Error('KT79: lost heading');
 return {binary,report,ps};
}
async function fix(blob){
 if(!root.fflate?.unzipSync||!root.fflate?.zipSync)throw Error('KT79: ZIP engine missing');
 const outer=root.fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
 if(!outer[CLASSIC]||!outer[EXPERT])throw Error('KT79: missing original Word documents');
 const originalKeys=Object.keys(outer).sort();
 const sourceExpert=outer[EXPERT];
 const expertXml=new DOMParser().parseFromString(dec.decode(root.fflate.unzipSync(sourceExpert)['word/document.xml']),'application/xml');
 const expertTitle=paragraphs(expertXml).find(p=>text(p).startsWith('Относно:'));
 const expertLocality=expertTitle?(text(expertTitle).match(/местност\s+([^,.]+)/u)||[])[1]:null;
 const c=fixOne(outer[CLASSIC],{classic:true,facts:null,expertLocality});
 const facts=safeAdminFromClassic(c.ps);
 const scenarioB=c.ps.some(p=>/^(?:Имотът|Имотите), предмет на инвестиционното предложение/u.test(text(p))&&/попада(?:т)?\s+(?:частично\s+|изцяло\s+)?в границите на защитена зона/u.test(text(p)));
 const e=fixOne(outer[EXPERT],{classic:false,facts,expertB:scenarioB});
 outer[CLASSIC]=c.binary;outer[EXPERT]=e.binary;
 if(JSON.stringify(Object.keys(outer).sort())!==JSON.stringify(originalKeys))throw Error('KT79: ZIP files changed');
 const bytes=root.fflate.zipSync(outer,{level:6});
 const after=root.fflate.unzipSync(bytes);
 for(const k of originalKeys)if(k!==CLASSIC&&k!==EXPERT){
  const a=outer[k],b=after[k];if(a.length!==b.length||a.some((v,i)=>v!==b[i]))throw Error('KT79: non-Word resource mutated '+k);
 }
 return {blob:new Blob([bytes],{type:'application/zip'}),reports:{Classic:c.report,Expert:e.report},acceptedTemplate:true};
}
root.KT79FinalApproved=Object.freeze({fix});
})(window);
