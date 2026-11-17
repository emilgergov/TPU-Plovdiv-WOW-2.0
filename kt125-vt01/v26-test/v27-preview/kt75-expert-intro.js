/* KT75: Expert Word introductory paragraph fidelity for scenarios A/B.
 * Scoped to body paragraph 18 (index 17). All other approved Expert text,
 * paragraph order, formatting, signatures, headers and embedded media remain.
 * The Classic A/B generators and GIS/PDF components are not modified.
 */
(function(root){'use strict';
const prior=root.V26ExpertWord;
if(!prior?.make)throw Error('KT75: липсва експертният Word генератор.');
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const all=(n,k)=>Array.from(n.getElementsByTagNameNS(NS,k));
const read=p=>all(p,'t').map(n=>n.textContent||'').join('');
function ref(m){
 let raw=String(m?.incomingReference||'').replace(/\s+/g,' ').trim();
 if(!raw||/\[ЗА ЕКСПЕРТНА ПРОВЕРКА|НЯМА ДАННИ|ДАТА-99.99/u.test(raw))
   return 'Вх. № ОВОС-ХХХХ/ХХ.ХХ.ХХХХ г.';
 raw=raw.replace(/^Вх\.\s*№\s*/iu,'').replace(/\s*\/\s*/g,'/').replace(/\s*г\.\s*$/iu,'');
 if(!/^ОВОС-[\wА-Яа-яХх-]+\s*\/\s*[\dХх.]+$/u.test(raw))
   return 'Вх. № ОВОС-ХХХХ/ХХ.ХХ.ХХХХ г.';
 return 'Вх. № '+raw+' г.';
}
function run(xml,model,value,italic){
 const n=xml.createElementNS(NS,'w:r');
 const old=Array.from(model.childNodes).find(c=>c.nodeType===1&&c.localName==='rPr');
 const props=old?old.cloneNode(true):xml.createElementNS(NS,'w:rPr');
 for(const i of [...all(props,'i'),...all(props,'iCs')])i.parentNode.removeChild(i);
 if(italic)props.appendChild(xml.createElementNS(NS,'w:i'));
 n.appendChild(props);
 const t=xml.createElementNS(NS,'w:t');t.setAttribute('xml:space','preserve');t.textContent=value;n.appendChild(t);
 return n;
}
function patch(xml,p,metadata){
 if(!/чл\.\s*6а,\s*т\.\s*2/u.test(read(p)))throw Error('KT75: неочакван експертен увод.');
 const beginning='Във връзка с внесеното уведомление в РИОСВ – Пловдив с '+ref(metadata)+' за горецитираното инвестиционно предложение, на основание чл. 6а, т. 2 от Наредбата за условията и реда за извършване на оценка за съвместимостта на планове, програми, проекти и инвестиционни предложения с предмета и целите на опазване на защитените зони ';
 const citation='(Наредбата за ОС, обн., ДВ, бр. 73 от 11.09.2007 г., изм. и доп.)';
 const ending=' е изготвен настоящият експертен проект.';
 const runs=Array.from(p.childNodes).filter(n=>n.nodeType===1&&n.localName==='r');
 const first=runs.find(r=>all(r,'t').length);
 if(!first)throw Error('KT75: липсва Word текст в експертния увод.');
 for(const r of runs)if(r!==first)p.removeChild(r);
 const texts=all(first,'t');texts[0].textContent=beginning;texts[0].setAttribute('xml:space','preserve');texts.slice(1).forEach(t=>t.textContent='');
 for(const pr of all(first,'rPr'))for(const i of [...all(pr,'i'),...all(pr,'iCs')])i.parentNode.removeChild(i);
 p.appendChild(run(xml,first,citation,true));
 p.appendChild(run(xml,first,ending,false));
 if(read(p)!==beginning+citation+ending)throw Error('KT75: непълен експертен увод.');
}
async function make(draft,options){
 const blob=await prior.make(draft,options);
 if(!['А','A','Б','B'].includes(draft?.scenario))return blob;
 const z=root.fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
 const bytes=z['word/document.xml'];if(!bytes)throw Error('KT75: липсва документният XML.');
 const xml=new DOMParser().parseFromString(new TextDecoder().decode(bytes),'application/xml');
 if(xml.getElementsByTagName('parsererror').length)throw Error('KT75: невалиден XML.');
 const ps=Array.from(all(xml,'body')[0].children).filter(n=>n.localName==='p');
 if(ps.length!==49)throw Error('KT75: променена експертна структура.');
 patch(xml,ps[17],draft.metadata);
 z['word/document.xml']=new TextEncoder().encode(new XMLSerializer().serializeToString(xml));
 return new Blob([root.fflate.zipSync(z,{level:6})],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
root.V26ExpertWord=Object.freeze({...prior,make});
})(typeof window!=='undefined'?window:globalThis);
