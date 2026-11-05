/* KT61 draft-only writer. The original KT42 generator and approved KT56 DOCX
   are never edited. For a new dossier, retain typography and administrative
   layout while replacing case-specific sample prose with AI-authored prose.
   An AI proposal is a REVIEW REQUIRED document, not an official decision. */
(function(root){'use strict';
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const files={A:'v27-preview/etalon/KT35-A.docx',B:'v27-preview/etalon/KT39-B.docx',E:'v27-preview/etalon/V27-R02.docx'};
const string=v=>String(v??'').replace(/\s+/gu,' ').trim();
const note='ПРОЕКТ ЗА ЕКСПЕРТНА ПРОВЕРКА — не представлява издадено становище.';
const isBad=v=>!string(v)||/\[(?:ЗА ЕКСПЕРТНА ПРОВЕРКА|ЗА ПОПЪЛВАНЕ|ОТКЪС ОТ ПРЕПИСКАТА)|НЯМА ДАННИ/iu.test(v);
function sections(raw){
 const s=String(raw||''),m=[...s.matchAll(/^\s*\[\[(CHARACTERIZATION|LEGAL|PROCEDURE|IMPACTS)\]\]\s*$/gm)],out={};
 for(let i=0;i<m.length;i++){const k=m[i][1],last=m[i+1]?.index??s.length;
  out[k]=s.slice(m[i].index+m[i][0].length,last).trim().split(/\n\s*\n/u).map(string).filter(Boolean);}
 if(['CHARACTERIZATION','LEGAL','PROCEDURE','IMPACTS'].some(x=>!out[x]?.length))throw Error('КТ61: AI проектът няма всички четири съдържателни раздела.');
 return out;
}
function sentences(paras,num){
 const raw=(paras||[]).flatMap(p=>String(p).split(/(?<=[.!?])\s+(?=[А-ЯA-Z„])/u)).map(string).filter(x=>x.length>=12&&!isBad(x));
 // Group into up to num contiguous non-empty subsections; no invented wording or duplication.
 if(!raw.length)return [];
 const groups=Array.from({length:Math.min(num,raw.length)},()=>[]);
 raw.forEach((text,i)=>groups[Math.min(groups.length-1,Math.floor(i*groups.length/raw.length))].push(text));
 return groups.map(parts=>parts.join(' '));
}
const all=(el,local)=>Array.from(el.getElementsByTagNameNS(NS,local));
function get(p){return all(p,'t').map(t=>t.textContent).join('');}
function put(p,value){
 if(!p)throw Error('КТ61: липсва абзац в заключения образец');
 const ts=all(p,'t');if(!ts.length)throw Error('КТ61: еталонен абзац без текстов контейнер');
 ts[0].textContent=String(value??'');ts[0].setAttribute('xml:space','preserve');
 for(let i=1;i<ts.length;i++)ts[i].textContent='';
}
async function template(which){
 if(!root.fflate?.unzipSync||!root.fflate?.zipSync)throw Error('КТ61: липсва ZIP библиотеката');
 const response=await fetch(files[which],{cache:'no-store'});
 if(!response.ok)throw Error('КТ61: не е зареден заключеният образец '+which);
 const zip=root.fflate.unzipSync(new Uint8Array(await response.arrayBuffer()));
 const doc=new DOMParser().parseFromString(new TextDecoder().decode(zip['word/document.xml']),'application/xml');
 if(doc.getElementsByTagName('parsererror').length)throw Error('КТ61: повреден Word XML');
 const body=all(doc,'body')[0],p=Array.from(body.children).filter(x=>x.localName==='p');
 if(p.length!==({A:41,B:43,E:49}[which]))throw Error('КТ61: промяна в одобрения образец '+which);
 return {zip,doc,p};
}
function insertMetadata(p,m,which){
 const title=string(m.subject).replace(/^Относно:\s*/iu,'').replace(/^[„“"]+|[„“"]+$/gu,'');
 const ids=string(m.parcelIds),place=string(m.location);
 if(!title||!ids||!/\b\d{5}\.\d+\.\d+\b/u.test(ids))throw Error('КТ61: липсва потвърден предмет или кадастрален идентификатор');
 put(p[6],string(m.recipient)||'XXXXXXXXXXXX');
 put(p[7],string(m.address)||'XXXXXXXXXXXX');
 put(p[10],'Относно: Уведомление за инвестиционно предложение (ИП): „'+title+'“ в имот(и) с идентификатор(и) '+ids+(place?', '+place:'')+'.');
 put(p[which==='E'?17:16],'Във връзка с уведомление '+(string(m.incomingReference)||'Вх. № ОВОС-XXXXXXXX / ДАТА-XX.XX.XXXX г.')+' се представя работен проект за експертна проверка по заявеното инвестиционно предложение.');
}
function caseScope(d){
 const ids=string(d.metadata.parcelIds),zones=Array.isArray(d.zones)?d.zones.join(', '):'';
 return d.scenario==='Б'
  ?'В работния ГИС анализ е отчетено пространствено пресичане за имот(и) '+ids+' със защитена зона '+zones+'. Пространственото положение е онагледено в отделния ГИС PDF.'
  :'По работния ГИС анализ за имот(и) '+ids+' не е отчетено пространствено пресичане със защитена зона от мрежата „Натура 2000“.';
}
function cleanCaseSamples(p){
 // Never show GIS map imagery of the approved example for a different parcel.
 for(let i=18;i<p.length;i++)for(const el of [...all(p[i],'drawing'),...all(p[i],'pict')])el.parentNode?.removeChild(el);
 const exemplar=/56784\.13\.(?:102|105|106)|BG0000578|Рогошко шосе/iu;
 for(let i=0;i<p.length;i++)if(exemplar.test(get(p[i])))put(p[i],'');
}
async function finish(o,which,d){
 cleanCaseSamples(o.p);
 const remaining=o.p.map(get).join('\n');
 if(/56784\.13\.(?:102|105|106)|BG0000578|Рогошко шосе/iu.test(remaining))throw Error('КТ61: останали чужди фактически данни от еталона');
 // Do not silently allow copy-pasted sample decision or filled artificial proof.
 const xml=new XMLSerializer().serializeToString(o.doc);
 o.zip['word/document.xml']=new TextEncoder().encode(xml);
 return new Blob([root.fflate.zipSync(o.zip,{level:6})],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
function caseMatch(d){
 const ids=string(d.metadata?.parcelIds).match(/\b\d{5}\.\d+\.\d+\b/gu)||[];
 return ids.length===3&&ids.sort().join(',')==='56784.13.102,56784.13.105,56784.13.106'&&/складове за промишлени стоки и офиси/iu.test(string(d.metadata?.subject));
}
async function classic(scenario,paragraphs,m,ctx={},original){
 if(!['А','Б'].includes(scenario))throw Error('КТ61: неизвестен ГИС сценарий');
 if(caseMatch({metadata:m}))return original(scenario,paragraphs,m,ctx);
 const src=sections(root.KT61CurrentAiDraft);
 const d={scenario,zones:ctx.determination?.zones||[],metadata:m};
 if(scenario==='Б'&&!d.zones.length)throw Error('КТ61: вариант Б без ГИС установена зона');
 const o=await template(scenario==='Б'?'B':'A'),p=o.p;
 insertMetadata(p,m,'C');
 const chars=Array.from({length:4},(_,i)=>!isBad(paragraphs?.[i])?string(paragraphs[i]):'');
 const authored=sentences(src.CHARACTERIZATION,4);
 for(let i=0;i<4;i++)put(p[18+i],chars[i]||authored[i]||'');
 const legal=sentences(src.LEGAL,scenario==='Б'?4:2),impacts=sentences(src.IMPACTS,5),procedure=src.PROCEDURE.join(' ');
 if(scenario==='Б'){
  put(p[22],legal[0]||'');put(p[23],caseScope(d));
  put(p[24],'Пресичаща защитена зона: '+d.zones.join(', ')+'. Приложимостта на специалните режими подлежи на експертен преглед.');
  [25,26,27].forEach((idx,i)=>put(p[idx],legal[i+1]||''));
  [28,29,30,31,32].forEach((idx,i)=>put(p[idx],impacts[i]||''));
  put(p[33],procedure+' '+note);
 }else{
  put(p[22],caseScope(d));put(p[23],'Пространствените данни са представени в самостоятелния ГИС анализ.');
  [24,25].forEach((idx,i)=>put(p[idx],legal[i]||''));
  [26,27,28,29,30].forEach((idx,i)=>put(p[idx],impacts[i]||''));
  put(p[31],procedure+' '+note);
 }
 return finish(o,scenario,d);
}
async function expert(d,options={},original){
 if(caseMatch(d))return original(d,options);
 const src=sections(d.aiDraft);
 const o=await template('E'),p=o.p;
 insertMetadata(p,d.metadata,'E');
 put(p[20],src.CHARACTERIZATION[0]||'');
 put(p[21],src.CHARACTERIZATION.slice(1).join('\n\n'));
 put(p[23],caseScope(d));
 put(p[24],d.scenario==='Б'?'Установено пресичане със зона '+(d.zones||[]).join(', ')+'.':'Не е установено пресичане по работния ГИС анализ.');
 const legal=sentences(src.LEGAL,4),impacts=sentences(src.IMPACTS,6);
 [25,26,27,28].forEach((idx,i)=>put(p[idx],legal[i]||''));
 [31,32,33,34,35,36].forEach((idx,i)=>put(p[idx],impacts[i]||''));
 put(p[38],src.PROCEDURE[0]||'');
 put(p[39],src.PROCEDURE.slice(1).join(' ')||src.PROCEDURE[0]+' '+note);
 return finish(o,'E',d);
}
function install(){
 if(!root.V26TemplateWord?.make||!root.V26ExpertWord?.make)throw Error('КТ61: оригиналните Word генератори не са заредени');
 const originalClassic=root.V26TemplateWord,originalExpert=root.V26ExpertWord;
 root.V26TemplateWord={...originalClassic,make:(scenario,paragraphs,m,ctx)=>classic(scenario,paragraphs,m,ctx,originalClassic.make)};
 root.V26ExpertWord={...originalExpert,make:(d,opts)=>expert(d,opts,originalExpert.make)};
 return ()=>{root.V26TemplateWord=originalClassic;root.V26ExpertWord=originalExpert;root.KT61CurrentAiDraft=null;};
}
root.KT61DraftWord=Object.freeze({install,sections,sentences});
})(window);
