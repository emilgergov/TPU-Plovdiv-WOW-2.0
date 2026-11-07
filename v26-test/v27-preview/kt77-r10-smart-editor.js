/* KT77-03 R10. Input validation before the existing lookup. NO modification of R09 GIS,
   PI MASTER, PDF, DOCX, expert conclusions or the original parcel editor. */
(function(scope){
'use strict';
const byId=id=>document.getElementById(id);
const MAX_INPUT=100,MAX_CANDIDATES=18;
function segments(raw){
 const chunks=String(raw||'').replace(/[\u00a0\u200b\u200c\u200d\ufeff]/g,' ')
  .replace(/[；;]/g,'\n').replace(/[\r\n]+/g,'\n').split('\n');
 const out=[];
 for(const line of chunks){
  const pieces=line.trim().split(/\s+(?=\d{5}(?=[.\s,，．。]|\d{5,}))/);
  for(let piece of pieces){
   piece=piece.trim();if(!piece)continue;
   // Commas between two independently complete parcel IDs separate records.
   // Commas inside one 5.x.x cadastral number are retained for normalization.
   if(/^\d{5}[.,，．。]\d{1,3}[.,，．。]\d{1,4}(?:\s*,\s*\d{5}[.,，．。]\d{1,3}[.,，．。]\d{1,4})+$/.test(piece)){
    out.push(...piece.split(/\s*,\s*(?=\d{5}[.,，．。])/));
   }else if(/,\s*(?=\d{5}\.)/.test(piece)){
    out.push(...piece.split(/,\s*(?=\d{5}\.)/));
   }else out.push(piece);
  }
 }
 return out;
}
function proposals(source){
 const raw=String(source).trim(),clean=raw.replace(/[，．。]/g,'.').replace(/\s*[.,]\s*/g,'.')
  .replace(/\.{2,}/g,'.').replace(/^\.+|\.+$/g,'').trim();
 const result=new Map();
 function add(value,confidence){
  const p=value.split('.');
  if(p.length<3||p.length>5||!/^\d{5}$/.test(p[0])||!/^\d{1,3}$/.test(p[1])||!/^\d{1,4}$/.test(p[2])||p.slice(3).some((v,i)=>!/^\d{1,4}$/.test(v)||(i===1&&v.length>3)))return;
  const parcel=p.slice(0,3).join('.');
  if(!result.has(parcel))result.set(parcel,{parcel,full:value,confidence,original:raw});
 }
 // Standard and typo-corrected punctuation, with optional building/unit suffix.
 if(/^\d{5}(?:\.\d+){2,4}$/.test(clean))add(clean,'format');
 // Missing separators between valid decimal components.
 if(/^\d{5}(?:\s+\d+){2,4}$/.test(raw))add(raw.replace(/\s+/g,'.'),'format');
 // Missing all delimiters: generate only boundaries supported by cadastre.
 const compact=raw.replace(/[\s.,，．。]/g,'');
 if(/^\d{9,13}$/.test(compact)&&raw===compact){
  for(let a=1;a<=3;a++)for(let b=1;b<=4;b++){
   if(5+a+b!==compact.length)continue;
   add(compact.slice(0,5)+'.'+compact.slice(5,5+a)+'.'+compact.slice(5+a),'ambiguous');
  }
 }
 return [...result.values()].slice(0,MAX_CANDIDATES);
}
function createIndex(){
 if(!scope.KT77PiMasterIndex?.create)throw Error('ПИ MASTER не е достъпен.');
 return scope.KT77PiMasterIndex.create(new URL('gis-data/pi-master/browser-index/',document.baseURI).href);
}
async function validate(raw,index){
 const inputs=segments(raw);
 if(!inputs.length)throw Error('Въведете поне един кадастрален идентификатор.');
 if(inputs.length>MAX_INPUT)throw Error('Максимум 100 имота.');
 const records=[],errors=[],warnings=[];
 for(const input of inputs){
  const possibilities=proposals(input),matches=[];
  for(const item of possibilities){
   const result=await index.lookup(item.parcel);
   if(result?.status==='FOUND')matches.push(item);
  }
  if(!matches.length){
   errors.push({input,message:possibilities.length?'Няма съвпадение в проверения ПИ MASTER.':'Непълен или невалиден идентификатор.'});
   continue;
  }
  // A uniquely matched delimiter-free input still requires approval:
  // matching the archive cannot establish the author intended that specific parcel.
  const needConfirmation=matches.length!==1||matches[0].confidence==='ambiguous';
  records.push({input,matches,chosen:needConfirmation?null:matches[0],needConfirmation});
  if(needConfirmation)warnings.push(input);
 }
 return {records,errors,warnings};
}
scope.KT77R10Core=Object.freeze({segments,proposals,validate});
function install(){
 const run=byId('run'),input=byId('ids');if(!run||!input||!scope.KT77PiMasterIndex)return;
 const holder=document.createElement('section');holder.id='kt77-r10-review';holder.className='kt77-r10-review';
 holder.hidden=true;holder.setAttribute('role','status');holder.setAttribute('aria-live','polite');
 run.insertAdjacentElement('afterend',holder);
 let released=false,busy=false,latest=null,signature='';
 function close(){holder.hidden=true;holder.replaceChildren();}
 function line(text,kind='normal'){
  const p=document.createElement('div');p.className='kt77-r10-'+kind;p.textContent=text;holder.appendChild(p);return p;
 }
 function render(result){
  close();holder.hidden=false;
  line('ПИ MASTER · проверка на въведените имоти','heading');
  for(const err of result.errors)line(err.input+' — '+err.message,'error');
  for(const record of result.records){
   if(!record.needConfirmation)continue;
   const wrapper=document.createElement('div');wrapper.className='kt77-r10-choice';
   const label=document.createElement('label');label.textContent='Проверете: '+record.input;wrapper.appendChild(label);
   const select=document.createElement('select');select.setAttribute('aria-label','Потвърдете имот за '+record.input);
   const empty=document.createElement('option');empty.value='';empty.textContent='Изберете потвърдения ПИ';select.appendChild(empty);
   for(const c of record.matches){const o=document.createElement('option');o.value=c.parcel;o.textContent=c.parcel;select.appendChild(o);}
   select.addEventListener('change',()=>{record.chosen=record.matches.find(c=>c.parcel===select.value)||null;});
   wrapper.appendChild(select);holder.appendChild(wrapper);
  }
  if(result.records.some(r=>r.needConfirmation)){
   line('При непълни или нееднозначни записи не се попълват липсващи цифри автоматично.','hint');
  }
  if(result.records.length&&!result.errors.length){
   const proceed=document.createElement('button');proceed.type='button';proceed.className='secondary';
   proceed.textContent='Потвърди проверените имоти';
   proceed.addEventListener('click',()=>{
    if(signature!==input.value){line('Входът е променен. Стартирайте нова проверка.','error');return;}
    if(result.records.some(r=>!r.chosen)){line('Потвърдете всички предложени имоти.','error');return;}
    const ids=[...new Set(result.records.map(r=>r.chosen.parcel))];
    const changed=result.records.filter(r=>r.input!==r.chosen.full);
    if(changed.length)line('Коригирани записи: '+changed.map(r=>r.input+' → '+r.chosen.full).join('; '),'hint');
    input.value=ids.join('\n');
    input.dispatchEvent(new Event('input',{bubbles:true}));
    close();released=true;run.click();
   });
   holder.appendChild(proceed);
  }
 }
 run.addEventListener('click',async event=>{
  if(released){released=false;return;}
  event.preventDefault();event.stopImmediatePropagation();
  if(busy)return;
  busy=true;run.disabled=true;close();holder.hidden=false;
  line('ПИ MASTER · проверка на въведените имоти…','hint');
  signature=input.value;
  try{
   const index=createIndex();
   const result=await validate(signature,index);
   if(input.value!==signature){close();return;}
   latest=result;
   // A blank or unresolved candidate blocks the original lookup, including partial results.
   if(result.errors.length||result.warnings.length){render(result);return;}
   const ids=[...new Set(result.records.map(r=>r.chosen.parcel))];
   const differences=result.records.filter(r=>r.input!==r.chosen.full);
   input.value=ids.join('\n');
   input.dispatchEvent(new Event('input',{bubbles:true}));
   close();
   if(differences.length){
    holder.hidden=false;
    line('Проверени в ПИ MASTER · коригирани: '+differences.map(r=>r.input+' → '+r.chosen.full).join('; '),'hint');
   }
   released=true;run.disabled=false;run.click();
  }catch(e){
   close();holder.hidden=false;
   line('Проверката е прекратена: '+String(e.message||e)+'. Няма автоматично избран имот.','error');
  }finally{busy=false;run.disabled=false;}
 },true);
 input.addEventListener('input',()=>{if(!busy){close();latest=null;}});
 scope.KT77R10Editor=Object.freeze({segments,proposals,validate});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})(window);