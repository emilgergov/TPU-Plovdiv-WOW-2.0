/* KT74: scoped DOCX fidelity post-processor for Classic A / B.
 * Never changes approved DOCX files or GIS/PDF and never wraps Expert Word.
 * Keep same 41/43 paragraphs, header/footer, styles, and original named runs.
 */
(function(root){'use strict';
const upstream=root.V26TemplateWord;
if(!upstream?.make)throw Error('KT74: липсва класическият генератор.');
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const nodes=(node,tag)=>Array.from(node.getElementsByTagNameNS(NS,tag));
const paras=xml=>Array.from(nodes(xml,'body')[0].children).filter(n=>n.localName==='p');
const text=p=>nodes(p,'t').map(n=>n.textContent||'').join('');
function write(p,value){
 const ts=nodes(p,'t');if(!ts.length)throw Error('KT74: еталонен абзац без текст');
 ts[0].textContent=value;ts[0].setAttribute('xml:space','preserve');
 ts.slice(1).forEach(x=>x.textContent='');
}
function normalizeReference(m){
 const raw=String(m?.incomingReference||'').replace(/\s+/g,' ').trim();
 const match=raw.match(/(?:ОВОС-)[\wА-Яа-яХх-]+(?:\s*\/\s*[\dХх.]+)?/u);
 if(!raw||/\[ЗА ЕКСПЕРТНА ПРОВЕРКА|НЯМА ДАННИ|ДАТА-99/u.test(raw))return 'Вх. № ОВОС-ХХХХ/ХХ.ХХ.ХХХХ г.';
 let ref=raw.replace(/^Вх\.\s*№\s*/iu,'').replace(/\s*\/\s*/g,'/').replace(/\s*г\.\s*$/iu,'');
 if(!ref.startsWith('ОВОС-')||!match)return 'Вх. № ОВОС-ХХХХ/ХХ.ХХ.ХХХХ г.';
 return 'Вх. № '+ref+' г.';
}
function newRun(xml,template,value,italic){
 const run=xml.createElementNS(NS,'w:r');
 const oldProps=Array.from(template.childNodes||[]).find(n=>n.nodeType===1&&n.localName==='rPr');
 const props=oldProps?oldProps.cloneNode(true):xml.createElementNS(NS,'w:rPr');
 if(italic&&!nodes(props,'i').length)props.appendChild(xml.createElementNS(NS,'w:i'));
 if(!italic){for(const i of nodes(props,'i'))props.removeChild(i);}
 run.appendChild(props);
 const t=xml.createElementNS(NS,'w:t');t.setAttribute('xml:space','preserve');t.textContent=value;run.appendChild(t);
 return run;
}
function restoreIntro(xml,p,metadata){
 const base=text(p);
 if(!base.includes('чл. 6а, т. 2'))throw Error('KT74: неочаквано правно основание в уводния абзац.');
 const reference=normalizeReference(metadata);
 const start='Във връзка с внесеното уведомление в РИОСВ – Пловдив с '+reference+' за горецитираното инвестиционно предложение, на основание чл. 6а, т. 2 от Наредбата за условията и реда за извършване на оценка за съвместимостта на планове, програми, проекти и инвестиционни предложения с предмета и целите на опазване на защитените зони ';
 const citation='(Наредбата за ОС, обн., ДВ, бр. 73 от 11.09.2007 г., изм. и доп.)';
 const finish=', Ви уведомявам следното:';
 const runs=Array.from(p.childNodes).filter(n=>n.nodeType===1&&n.localName==='r');
 if(!runs.length)throw Error('KT74: липсват Word run елементи в увода.');
 const template=runs[0];for(const r of runs.slice(1))p.removeChild(r);
 const t=nodes(template,'t');if(!t.length)throw Error('KT74: липсва уводен Word текст.');
 t[0].textContent=start;t[0].setAttribute('xml:space','preserve');
 t.slice(1).forEach(x=>x.textContent='');
 p.appendChild(newRun(xml,template,citation,true));
 p.appendChild(newRun(xml,template,finish,false));
 if(text(p)!==start+citation+finish)throw Error('KT74: непълен уводен абзац.');
}
function fixHeadingB(p,metadata){
 const ids=String(metadata?.parcelIds||'').match(/\b\d{5}\.\d+\.\d+\b/g)||[];
 if(ids.length!==1)return;
 const rs=nodes(p,'r');if(rs.length!==4)throw Error('KT74: нарушени четири еталонни сегмента на Относно.');
 const location=nodes(rs[3],'t');
 if(!location.length)throw Error('KT74: липсва местоположение.');
 const t=location.map(x=>x.textContent).join('').replace(/в поземлени имоти с идентификатори/iu,'в поземлен имот с идентификатор');
 location[0].textContent=t;location.slice(1).forEach(x=>x.textContent='');
 if(!text(p).includes(ids[0]))throw Error('KT74: липсва имотът в заглавието.');
}
function correctImpactB(p){
 const value=text(p);
 const changed=value
 .replace(/близко разположената защитена зона/giu,'засегнатата защитена зона')
 .replace(/близко разположени зони/giu,'засегнатата защитена зона');
 if(changed!==value)write(p,changed);
}
async function make(scenario,characterization,metadata,context){
 const blob=await upstream.make(scenario,characterization,metadata,context);
 const which=scenario==='А'||scenario==='A'?'A':scenario==='Б'||scenario==='B'?'B':null;
 if(!which)return blob;
 const zip=root.fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
 const xml=new DOMParser().parseFromString(new TextDecoder().decode(zip['word/document.xml']),'application/xml');
 const p=paras(xml),expected=which==='A'?41:43;
 if(p.length!==expected)throw Error('KT74: изменена еталонна структура '+which);
 restoreIntro(xml,p[16],metadata);
 if(which==='B'){
  fixHeadingB(p[10],metadata);
  for(let i=28;i<=29;i++)correctImpactB(p[i]);
 }
 zip['word/document.xml']=new TextEncoder().encode(new XMLSerializer().serializeToString(xml));
 return new Blob([root.fflate.zipSync(zip,{level:6})],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
root.V26TemplateWord=Object.freeze({...upstream,make});
})(typeof window!=='undefined'?window:globalThis);
