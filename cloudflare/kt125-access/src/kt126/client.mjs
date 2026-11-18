// The browser program has no external closure: it is served by the authenticated Worker.
export function installRegistryClient(){
 'use strict';
 const root=window,$=id=>document.getElementById(id),CHUNK=256*1024;
 let record=null,requestKey=crypto.randomUUID(),queue=Promise.resolve(),restore=null,timer=null,restoring=false,savedFingerprint='';
 const savedGlobals=['KT80FreeGISResults','KT80IPMasterDraft','KT80DossierAudit','KT80CH2Passport','KT80CH21Draft','KT80KT51Draft','KT80KT52Draft','KT80ParcelsConfirmed','KT80KT53Draft','KT82Location','KT81ContextResult'];
 const fields=['kt80SubjectText','kt80ScopeText','kt80ParcelInput','kt80LegalNotes','kt80Authority','kt80ProcedureSelect','kt80SubjectConfirmation','kt80ScopeConfirmation','kt80ParcelsConfirmation','kt80LawConfirmed','kt80RouteConfirmation'];
 const say=text=>{const n=$('kt126Message');if(n)n.textContent=text};
 const showError=e=>say(e?.message||'Записът не е потвърден.');
 const hash=async buffer=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(x=>x.toString(16).padStart(2,'0')).join('');
 function isCurrent(id){return record?.case_id===id}
 async function api(path,body){const response=await fetch('/kt126/registry'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),credentials:'same-origin',cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error||'Записът не е потвърден.');return data}
 function serial(work){const task=queue.then(work);queue=task.catch(()=>{});return task}
 function display(){
  const name=$('kt126Number');if(name)name.textContent=record?record.internal_number:'Нова преписка — номерът се присвоява при регистриране';
  const ext=$('kt126External');if(ext)ext.textContent=record?.external_status==='confirmed'?'Деловоден № '+record.external_number:record?.external_status==='omitted'?'Без Деловоден №':'Деловоден № — предстои преглед';
  const badge=$('kt80CaseBadge');if(record&&badge)badge.textContent='Преписка '+record.internal_number;
  const who=document.querySelector('#wow-session-banner .wow-session-who');
  if(who){let tag=$('kt126ActiveCase');if(!tag){tag=document.createElement('span');tag.id='kt126ActiveCase';who.append(tag)}tag.textContent=record?'Преписка '+record.internal_number:''}
 }
 async function storeSource(file,id,sourceId='original',sourceHash=record.source_hash){
  const base='/'+id+'/source'+(sourceId==='original'?'':'/'+sourceId);
  const start=await api(base+'/start',{filename:file.name,size:file.size,sha256:sourceHash});if(start.file.complete)return;
  const work=Array.from({length:Math.ceil(file.size/CHUNK)},(_,i)=>i);let next=0;
  await Promise.all(Array.from({length:Math.min(3,work.length)},async()=>{while(next<work.length){const i=work[next++];if(!isCurrent(id))throw Error('Преписката е сменена.');const response=await fetch('/kt126/registry'+base+'/part/'+i,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:await file.slice(i*CHUNK,Math.min(file.size,(i+1)*CHUNK)).arrayBuffer(),credentials:'same-origin'});if(!response.ok)throw Error('Оригиналът не е записан изцяло. Повторете обработката.')}}));
  await api(base+'/finish',{});
 }
 async function beforeProcess(file){
  if(file.size>40*1024*1024)throw Error('Максималният размер на преписката е 40 MB.');
  if(!record){
   say('Регистриране на преписката…');const expected=requestKey,sourceHash=await hash(await file.arrayBuffer());
   const result=await api('/create',{requestKey:expected,sourceName:file.name,sourceHash});
   if(expected!==requestKey)throw Error('Работният цикъл е сменен.');record=result.record;
  }else if(file.name!==record.source_name||await hash(await file.arrayBuffer())!==record.source_hash)throw Error('Този файл е различен от първоначалния оригинал. Добавете го чрез „Документи и история“ към текущата преписка или създайте отделна чрез „Нова преписка“.');
  root.KT80WorkflowState.caseCycleId=record.case_id;
  display();say('Записване на оригинала към '+record.internal_number+'…');await storeSource(file,record.case_id);say('Преписката е регистрирана: '+record.internal_number+'.');
 }
 function evidenceFiles(intake){
  const found=new Map();for(const f of intake?.files||[]){const name=f.filename||f.file||f.name;if(name&&/\.(pdf|png|jpe?g)$/i.test(name))found.set(name,{name,text:''})}
  for(const p of intake?.page_text_index||[]){if(p.page!==1)continue;const name=p.file||p.filename;if(!name)continue;if(!found.has(name))found.set(name,{name,text:''});found.get(name).text=p.text||''}
  return [...found.values()].sort((a,b)=>Number(/уведомлен|uvedomlen|notification/i.test(b.name+' '+b.text))-Number(/уведомлен|uvedomlen|notification/i.test(a.name+' '+a.text)));
 }
 function proposals(text){
  // A proposal only; no exact prefix, stamp position or filename-derived confirmation.
  const lines=String(text||'').split(/[\r\n]+/).map(x=>x.trim()).filter(Boolean),out=[];
  for(let i=0;i<lines.length;i++)if(/(?:вх\.?\s*(?:№|N[oо]?\.?)|деловоден\s*№|рег(?:истрационен)?\.?\s*№)/iu.test(lines[i])){
   const value=lines.slice(i,i+3).join(' ').replace(/^.*?(?:вх\.?\s*(?:№|N[oо]?\.?)|деловоден\s*№|рег(?:истрационен)?\.?\s*№)\s*[:.]*/iu,'').trim();
   if(/[0-9]/.test(value)&&value.length<=180)out.push(value);
  }
  return [...new Set(out)].slice(0,5);
 }
 async function preview(filename,canvas){
  const bytes=await root.KT80DossierOriginals.readBytes(filename);
  if(/\.pdf$/i.test(filename)){
   if(!root.pdfjsLib)throw Error('PDF прегледът не е зареден. Въведете номера ръчно или продължете без него.');
   const doc=await root.pdfjsLib.getDocument({data:new Uint8Array(bytes)}).promise;
   try{const page=await doc.getPage(1),viewport=page.getViewport({scale:1.7});canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height/2);
    await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
    const text=await page.getTextContent(),height=page.view[3]-page.view[1];
    const upper=text.items.filter(x=>x.transform&&x.transform[5]>=height/2).sort((a,b)=>b.transform[5]-a.transform[5]||a.transform[4]-b.transform[4]);
    return upper.map(x=>String(x.str||'')+(x.hasEOL?'\n':' ')).join('');
   }finally{await doc.destroy()}
  }
  const bitmap=await createImageBitmap(new Blob([bytes]));try{canvas.width=bitmap.width;canvas.height=Math.ceil(bitmap.height/2);canvas.getContext('2d').drawImage(bitmap,0,0);return ''}finally{bitmap.close()}
 }
 async function chooseExternal(intake){
  if(!record)throw Error('Липсва регистрирана преписка.');const caseId=record.case_id;
  const dialog=document.createElement('dialog');dialog.id='kt126ExternalDialog';dialog.className='kt126-dialog';
  dialog.innerHTML='<h2>Деловоден № · експертна проверка</h2><p>Прегледайте горната половина на първата страница от Уведомлението. Разчетеният или въведеният номер се използва само след Вашето изрично потвърждение.</p><label>Уведомление <select id="kt126Notice"></select></label><p id="kt126ReadMessage" role="status"></p><div class="kt126-crop"><canvas id="kt126NoticeCanvas" aria-label="Горна половина на първата страница от Уведомлението"></canvas></div><button type="button" id="kt126Zoom">Увеличи изображението</button><button type="button" id="kt126Ocr">Предложи разчитане от изображението</button><label class="kt126-number-label">Деловоден № <input id="kt126ExternalInput" maxlength="240" autocomplete="off"></label><p id="kt126ExternalHint">Не открихме надеждно Деловоден №. Можете да го въведете или да продължите без него.</p><div class="kt126-actions"><button type="button" id="kt126ConfirmExternal" class="kt126-confirm">Потвърди номера и продължи</button><button type="button" id="kt126OmitExternal">Продължи без Деловоден №</button></div>';
  document.body.append(dialog);const selection=$('kt126Notice'),input=$('kt126ExternalInput'),canvas=$('kt126NoticeCanvas'),message=$('kt126ReadMessage');
  const options=evidenceFiles(intake);if(!options.length){const o=document.createElement('option');o.value='';o.textContent='Няма налично Уведомление за преглед';selection.append(o)}
  for(const item of options){const o=document.createElement('option');o.value=item.name;o.textContent=item.name;selection.append(o)}
  const layout=document.createElement('div');layout.className='kt126-evidence-layout';const visual=document.createElement('div'),decision=document.createElement('div');
  visual.append(selection.closest('label'),message,canvas.parentElement,$('kt126Zoom'),$('kt126Ocr'));decision.append(input.closest('label'),$('kt126ExternalHint'),dialog.querySelector('.kt126-actions'));layout.append(visual,decision);dialog.append(layout);
  input.value=record.external_status==='confirmed'?record.external_number:'';let previewGeneration=0;
  const applyProposal=text=>{const list=proposals(text);if(!input.value&&list.length===1)input.value=list[0];$('kt126ExternalHint').textContent=list.length===1?'Предложение от документа — проверете и потвърдете изрично.':list.length>1?'Открити са няколко възможни номера. Въведете правилния от Уведомлението и потвърдете.':'Не открихме надеждно Деловоден №. Можете да го въведете или да продължите без него.'};
  async function refresh(){const generation=++previewGeneration;canvas.width=0;canvas.height=0;if(!selection.value){message.textContent='Можете да въведете номера ръчно или да продължите без него.';return}message.textContent='Подготовка на горната половина на първата страница…';try{const buffer=document.createElement('canvas'),text=await preview(selection.value,buffer);if(generation!==previewGeneration||!dialog.isConnected||!isCurrent(caseId))return;canvas.width=buffer.width;canvas.height=buffer.height;canvas.getContext('2d').drawImage(buffer,0,0);message.textContent='Горна половина · страница 1 · '+selection.value;applyProposal(text)}catch(e){message.textContent=e.message}}
  selection.addEventListener('change',()=>{input.value='';refresh()});$('kt126Zoom').onclick=()=>canvas.classList.toggle('kt126-zoomed');
  $('kt126Ocr').onclick=async()=>{if(!canvas.width)return;const button=$('kt126Ocr');button.disabled=true;let worker;const generation=previewGeneration;message.textContent='Предварително разчитане на изображението…';try{
   if(!root.Tesseract){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';s.onload=resolve;s.onerror=reject;document.head.append(s)})}
   worker=await root.Tesseract.createWorker('bul+eng',1);const result=await worker.recognize(canvas);if(generation!==previewGeneration||!dialog.isConnected||!isCurrent(caseId))return;applyProposal(result.data?.text||'');message.textContent='Разчитането е предложение. Ръкописният номер задължително се проверява от експерта.';
  }catch{message.textContent='Номерът не е разчетен надеждно. Въведете го ръчно или продължете без него.'}finally{button.disabled=false;if(worker)await worker.terminate()}};
  const active=document.activeElement;dialog.showModal();
  return new Promise(resolve=>{
   const commit=async decision=>{if(!isCurrent(caseId)){dialog.close();dialog.remove();resolve();return}if(decision==='confirm'&&!input.value.trim()){input.focus();message.textContent='Въведете Деловоден № или изберете „Продължи без Деловоден №“.';return}
    const buttons=[...dialog.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
    try{await serial(async()=>{const data=await api('/'+caseId+'/external',{revision:record.revision,decision,number:input.value,confirm:true,evidence:{file:selection.value,page:1,area:'top-half',method:'manual'}});if(isCurrent(caseId))record=data.record});display();document.dispatchEvent(new Event('kt126:external-change'));dialog.close();dialog.remove();active?.focus?.();resolve()}
    catch(e){message.textContent=e.message;buttons.forEach(b=>b.disabled=false)}
   };
   $('kt126ConfirmExternal').onclick=()=>commit('confirm');$('kt126OmitExternal').onclick=()=>commit('omit');
   dialog.addEventListener('cancel',event=>{event.preventDefault();message.textContent='Изберете потвърждение или „Продължи без Деловоден №“.'});
   refresh().then(()=>{if(dialog.isConnected&&!input.value&&canvas.width)$('kt126Ocr')?.click()});
  });
 }
 async function afterRead(intake){if(record?.external_status==='pending')await chooseExternal(intake)}
 function attachDocxMetadata(contents,approved){
  if(!record||approved.caseId!==record.case_id)throw Error('Документът е за друга преписка.');
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const ns='http://schemas.openxmlformats.org/officeDocument/2006/custom-properties',vt='http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes';
  const values={WOW_Case_ID:record.case_id,WOW_Case_Number:record.internal_number,WOW_External_Number:record.external_status==='confirmed'?record.external_number:'',WOW_Document_Version:approved.version};
  contents['docProps/custom.xml']=new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><Properties xmlns="'+ns+'" xmlns:vt="'+vt+'">'+Object.entries(values).map(([key,value],i)=>'<property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="'+(i+2)+'" name="'+key+'"><vt:lpwstr>'+escape(value)+'</vt:lpwstr></property>').join('')+'</Properties>');
  const decoder=new TextDecoder(),encoder=new TextEncoder();
  let types=decoder.decode(contents['[Content_Types].xml']);if(!types.includes('PartName="/docProps/custom.xml"'))types=types.replace('</Types>','<Override PartName="/docProps/custom.xml" ContentType="application/vnd.openxmlformats-officedocument.custom-properties+xml"/></Types>');contents['[Content_Types].xml']=encoder.encode(types);
  let rels=decoder.decode(contents['_rels/.rels']);if(!rels.includes('/custom-properties'))rels=rels.replace('</Relationships>','<Relationship Id="rIdKT126Custom" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties" Target="docProps/custom.xml"/></Relationships>');contents['_rels/.rels']=encoder.encode(rels);
 }
 async function saveGeneratedDocument(bytes,filename,approved){
  if(!record||approved.caseId!==record.case_id)throw Error('Документът е за друга преписка.');
  await save();const id=record.case_id,revision=record.revision;
  const response=await fetch('/kt126/registry/'+id+'/artifacts',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/octet-stream','X-Document-Name':encodeURIComponent(filename),'X-Case-Revision':String(revision),'X-Document-Version':String(approved.version)},body:bytes});
  if(!response.ok){const data=await response.json();throw Error(data.error||'Документът не е записан към преписката.')}if(!isCurrent(id))throw Error('Преписката е сменена. Документът остава към първоначалната преписка.');
 }
 // Existing author token remains in the existing caller. Bind every analytic request
 // to the authenticated registry instead of trusting a browser-created identifier.
 const nativeFetch=root.fetch.bind(root);
 root.fetch=async function(input,options){
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.href);
  if(url.origin==='https://tpu-plovdiv-ai-author-v27.emilgergov.workers.dev'&&['/author','/subject-improve','/scope-improve','/stage4-proposal','/stage4-expert-decision','/stage5-document'].includes(url.pathname)&&String(options?.method||'GET').toUpperCase()==='POST'){
   if(!record)throw Error('Първо регистрирайте преписката в Етап 1.');await save();const id=record.case_id,revision=record.revision;
   const body=JSON.parse(options.body);if(body.caseId!==id)throw Error('Анализът е за друга преписка.');
   const headers=new Headers(options.headers);headers.set('X-KT126-Case',id);headers.set('X-KT126-Revision',String(revision));
   return nativeFetch('/kt126/author'+url.pathname,{...options,headers,credentials:'same-origin',cache:'no-store'});
  }
  return nativeFetch(input,options);
 };
 function snapshot(){
  const w=root.KT80WorkflowState||{},values={};for(const id of fields){const n=$(id);if(n)values[id]=n.type==='checkbox'?n.checked:n.value}
  const state={};for(const key of ['step','highest','fileName','intake','subjectConfirmed','parcelsConfirmed','lawConfirmed','routeConfirmed','activeRoute'])state[key]=w[key];
  const globals={};for(const key of savedGlobals)if(root[key]!==undefined)globals[key]=root[key];
  return {format:'KT126-1',values,state,globals,stage4:root.KT116ExpertHandoff?.checkpoint?.()||null,stage5:root.KT117Document?.checkpoint?.()||null};
 }
 function saveSoon(){if(restoring||!record)return;clearTimeout(timer);timer=setTimeout(()=>save().catch(showError),1200)}
 async function pack(state){const text=JSON.stringify(state);if(new TextEncoder().encode(text).length<400000||!root.CompressionStream)return state;const bytes=new Uint8Array(await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return {format:'KT126-GZIP-1',payload:btoa(binary)}}
 async function unpack(state){if(state?.format!=='KT126-GZIP-1')return state;if(!root.DecompressionStream)throw Error('Браузърът не поддържа отваряне на записа. Използвайте актуален Edge, Chrome или Firefox.');const bytes=Uint8Array.from(atob(state.payload),c=>c.charCodeAt(0)),reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();let size=0,parts=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>10000000){await reader.cancel();throw Error('Записът надвишава допустимия размер за отваряне.')}parts.push(value)}return JSON.parse(await new Blob(parts).text())}
 async function save(){if(restore)return;const id=record?.case_id;if(!id)return;const state=snapshot(),fingerprint=JSON.stringify(state);await serial(async()=>{if(!isCurrent(id)||fingerprint===savedFingerprint)return;const packed=await pack(state);if(!isCurrent(id))return;const data=await api('/'+id+'/state',{revision:record.revision,state:packed});if(isCurrent(id)){record=data.record;savedFingerprint=fingerprint;say('Запазена преписка '+record.internal_number+'.')}})}
 async function afterProcess(){
  if(restore?.stage4||restore?.stage5){const deadline=Date.now()+8000;while((restore.stage4&&!root.KT116ExpertHandoff?.restoreCheckpoint||restore.stage5&&!root.KT117Document?.restoreCheckpoint)&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,100));if(restore.stage4&&!root.KT116ExpertHandoff?.restoreCheckpoint||restore.stage5&&!root.KT117Document?.restoreCheckpoint)throw Error('Екраните за запазения анализ още не са заредени. Записът остава в регистъра.');}
  if(restore){const prior=restore;restoring=true;try{
   for(const [id,value] of Object.entries(prior.values||{})){const n=$(id);if(n){if(n.type==='checkbox')n.checked=!!value;else n.value=value}}
   for(const [key,value] of Object.entries(prior.globals||{}))if(savedGlobals.includes(key))root[key]=value;
   const w=root.KT80WorkflowState;for(const key of ['subjectConfirmed','parcelsConfirmed','lawConfirmed','routeConfirmed','activeRoute'])if(prior.state?.[key]!==undefined)w[key]=prior.state[key];
   w.caseCycleId=record.case_id;
   if(prior.stage4&&!root.KT116ExpertHandoff?.restoreCheckpoint?.(prior.stage4))throw Error('Запазеният анализ не съответства на текущите данни. Историята остава в регистъра.');
   if(prior.stage5&&!root.KT117Document?.restoreCheckpoint?.(prior.stage5))throw Error('Запазеният документ не съответства на потвърдения анализ или Деловоден №. Историята остава в регистъра.');
   const step=Math.min(5,Math.max(1,prior.state?.step||1));
   if(step===5&&root.KT116ExpertHandoff?.snapshot?.()?.caseId===record.case_id){w.step=5;document.querySelectorAll('.kt80-stage-panel[data-panel]').forEach(p=>p.hidden=Number(p.dataset.panel)!==5);document.querySelectorAll('.kt80-step').forEach(n=>n.setAttribute('aria-current',n.dataset.step==='5'?'step':'false'));}
   else root.KT80WorkflowGo?.(step);
   if(root.KT80IPMasterDraft)root.KT80IPMaster?.render?.(root.KT80IPMasterDraft);restore=null;
  }finally{restoring=false}}
  display();await save();
 }
 async function selectOriginal(expected){
  const dialog=document.createElement('dialog');dialog.className='kt126-dialog';const h=document.createElement('h2');h.textContent='Продължаване на започнатия запис';const p=document.createElement('p');p.textContent='Изберете същия оригинал: '+expected.source_name+'. Записът ще продължи към '+expected.internal_number+', без нов номер.';const input=document.createElement('input');input.type='file';const message=document.createElement('p'),resume=document.createElement('button'),cancel=document.createElement('button');resume.textContent='Продължи записа';cancel.textContent='Откажи';dialog.append(h,p,input,message,resume,cancel);document.body.append(dialog);dialog.showModal();
  return new Promise(resolve=>{const close=value=>{dialog.close();dialog.remove();resolve(value)};resume.onclick=async()=>{const file=input.files?.[0];if(!file){message.textContent='Изберете оригиналния файл.';return}resume.disabled=true;try{if(file.name!==expected.source_name||await hash(await file.arrayBuffer())!==expected.source_hash)throw Error('Избраният файл не съвпада с оригинала на тази преписка.');close(file)}catch(e){message.textContent=e.message;resume.disabled=false}};cancel.onclick=()=>close(null);dialog.addEventListener('cancel',e=>{e.preventDefault();close(null)})});
 }
 async function openCase(id){
  await queue;if(record)await save();const data=await api('/'+id);let fileInfo;try{fileInfo=await api('/'+id+'/source')}catch{fileInfo={file:null}}const supplied=!fileInfo.file?.complete?await selectOriginal(data.record):null;if(!fileInfo.file?.complete&&!supplied)return;
  if(root.KT80WorkflowState?.intake&&!confirm('Да отворим избраната преписка? Текущата работа е записана.'))return;
  const restored=await unpack(data.state);if(data.evidenceChanged&&restored){restored.stage4=null;restored.stage5=null;for(const key of ['subjectConfirmed','parcelsConfirmed','lawConfirmed','routeConfirmed','activeRoute'])if(restored.state)restored.state[key]=null;if(restored.state)restored.state.step=1;for(const key of ['kt80SubjectConfirmation','kt80ScopeConfirmation','kt80ParcelsConfirmation','kt80LawConfirmed','kt80RouteConfirmation'])if(restored.values)restored.values[key]=false;}restoring=true;root.KT80ResetCurrentCase?.();record=data.record;restore=restored;savedFingerprint='';requestKey=crypto.randomUUID();root.KT80WorkflowState.caseCycleId=id;display();say('Възстановяване на оригиналната преписка…');
  try{let file=supplied;if(!file){const meta=fileInfo.file,parts=new Array(meta.parts);let next=0;
   await Promise.all(Array.from({length:Math.min(3,meta.parts)},async()=>{while(next<meta.parts){const n=next++;const r=await fetch('/kt126/registry/'+id+'/source/part/'+n,{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw Error('Оригиналът временно не е достъпен.');parts[n]=await r.arrayBuffer()}}));
   file=new File(parts,meta.filename);if(await hash(await file.arrayBuffer())!==meta.sha256)throw Error('Проверката на оригинала не съвпада. Обработката е спряна.');}
   const transfer=new DataTransfer();transfer.items.add(file);$('kt80InputFile').files=transfer.files;const name=$('kt80SelectedFileName');if(name)name.textContent=file.name;
   restoring=false;$('kt80ProcessFile').click();
  }catch(e){restoring=false;throw e}
 }
 async function showRegister(){
  const {items}=await api('');const dialog=document.createElement('dialog');dialog.className='kt126-dialog';const title=document.createElement('h2');title.textContent='Моите преписки';dialog.append(title);
  const close=document.createElement('button');close.textContent='Затвори';close.onclick=()=>{dialog.close();dialog.remove()};dialog.append(close);
  if(!items.length){const p=document.createElement('p');p.textContent='Още няма регистрирани преписки.';dialog.append(p)}
  for(const item of items){const row=document.createElement('div');row.className='kt126-register-row';const label=document.createElement('span');label.textContent=item.internal_number+' · '+item.source_name+(item.external_status==='confirmed'?' · Деловоден № '+item.external_number:'');const button=document.createElement('button');button.textContent='Отвори';button.onclick=async()=>{button.disabled=true;try{await openCase(item.case_id);dialog.close();dialog.remove()}catch(e){showError(e);button.disabled=false}};const documents=document.createElement('button');documents.textContent='Документи и история';documents.onclick=()=>showCaseFiles(item.case_id).catch(showError);row.append(label,button,documents);dialog.append(row)}
  document.body.append(dialog);dialog.showModal();
 }
 async function showCaseFiles(id){
  const [sources,artifacts,history]=await Promise.all([api('/'+id+'/attachments'),api('/'+id+'/artifacts'),api('/'+id+'/history')]);
  const dialog=document.createElement('dialog');dialog.className='kt126-dialog';const title=document.createElement('h2');title.textContent='Документи и история на преписката';const close=document.createElement('button');close.textContent='Затвори';close.onclick=()=>{dialog.close();dialog.remove()};dialog.append(title,close);
  const status=document.createElement('p');status.setAttribute('role','status');dialog.append(status);
  const originalHeading=document.createElement('h3');originalHeading.textContent='Оригинални входни документи';dialog.append(originalHeading);
  for(const meta of sources.items){const row=document.createElement('div');row.className='kt126-register-row';const label=document.createElement('span');label.textContent=meta.filename+' · '+(meta.source_id==='original'?'първоначален вход':'допълнение · без автоматичен прочит')+(meta.complete?'':' · записът е непълен');const button=document.createElement('button');button.textContent='Изтегли';button.disabled=!meta.complete;
   button.onclick=async()=>{button.disabled=true;try{const parts=[];for(let i=0;i<meta.parts;i++){const r=await fetch('/kt126/registry/'+id+'/source'+(meta.source_id==='original'?'':'/'+meta.source_id)+'/part/'+i,{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw Error('Документът не е достъпен.');parts.push(await r.arrayBuffer())}const file=new File(parts,meta.filename);if(await hash(await file.arrayBuffer())!==meta.sha256)throw Error('Проверката на оригинала не съвпада.');const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=meta.filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}catch(e){status.textContent=e.message}finally{button.disabled=false}};row.append(label,button);dialog.append(row);
  }
  if(isCurrent(id)){const add=document.createElement('button'),input=document.createElement('input');input.type='file';input.hidden=true;add.textContent='Добави документ към тази преписка';add.onclick=()=>input.click();input.onchange=async()=>{const file=input.files?.[0];if(!file)return;if(file.size>40*1024*1024){status.textContent='Максимален размер: 40 MB.';return}add.disabled=true;try{await storeSource(file,id,crypto.randomUUID(),await hash(await file.arrayBuffer()));if(isCurrent(id)){record=(await api('/'+id)).record;const w=root.KT80WorkflowState;for(const key of ['subjectConfirmed','parcelsConfirmed','lawConfirmed','routeConfirmed','activeRoute'])w[key]=null;for(const key of ['kt80SubjectConfirmation','kt80ScopeConfirmation','kt80ParcelsConfirmation','kt80LawConfirmed','kt80RouteConfirmation'])if($(key))$(key).checked=false;document.dispatchEvent(new Event('kt82:evidence-invalidated'));root.KT80WorkflowGo?.(1);await save();display();}status.textContent='Допълнението е запазено към същата преписка. Не е прочетено автоматично. Предишните потвърждения са свалени. Прегледайте документа, актуализирайте относимите данни и потвърдете отново.'}catch(e){status.textContent=e.message}finally{add.disabled=false}};dialog.append(add,input)}
  const resultsHeading=document.createElement('h3');resultsHeading.textContent='Запазени Word резултати';dialog.append(resultsHeading);
  for(const item of artifacts.items){const p=document.createElement('p'),a=document.createElement('a');a.href='/kt126/registry/'+id+'/artifacts/'+item.artifact_id;a.textContent=item.filename+' · версия '+item.document_version;a.setAttribute('download',item.filename);p.append(a);dialog.append(p)}
  const historyHeading=document.createElement('h3');historyHeading.textContent='История на записите';dialog.append(historyHeading);
  for(const item of history.items){const p=document.createElement('p');let detail='';if(item.external_json){const change=JSON.parse(item.external_json);detail=change.decision==='omit'?' · продължаване без Деловоден №':' · потвърден Деловоден № '+(change.number||'')}p.textContent='Версия '+item.revision+' · '+new Date(item.created_at_ms).toLocaleString('bg-BG',{timeZone:'Europe/Sofia'})+' · '+(item.kind==='state'?'работен запис':'експертно решение за номера')+detail;dialog.append(p)}
  document.body.append(dialog);dialog.showModal();
 }
 async function registerManual(){
  if(record)return say('Вече има регистрирана преписка.');
  const file=new File(['Ръчно въведена преписка. Фактите и документите подлежат на експертна проверка.'],'Ръчно въведена преписка.txt',{type:'text/plain'});
  await beforeProcess(file);const transfer=new DataTransfer();transfer.items.add(file);$('kt80InputFile').files=transfer.files;
  root.KT80WorkflowState.fileName=file.name;await chooseExternal(null);await save();display();
 }
 function init(){
  const stage=document.querySelector('.kt80-stage-panel[data-panel="1"]');if(!stage||!root.KT80WorkflowState)return;
  const style=document.createElement('style');style.textContent='#kt126Registry{border:1px solid #9a8751;border-top:3px solid #d9b771;border-radius:9px;padding:14px 18px;background:#153d2d;margin:12px 0 18px;font:13px/1.6 Verdana,Arial;color:#f5f0de}#kt126Registry strong{color:#f5d588}#kt126Registry .kt126-actions,.kt126-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}.kt126-dialog{color:#f5f0de;background:#123729;border:1px solid #d9b771;border-radius:12px;padding:22px;max-width:min(1100px,94vw);max-height:92vh;overflow:auto;font:14px/1.6 Verdana,Arial}.kt126-dialog::backdrop{background:#00180ed9}.kt126-dialog h2{color:#f5d588}.kt126-dialog button,#kt126Registry button{cursor:pointer;padding:9px 14px;border:1px solid #d9b771;border-radius:6px;background:#d9b771;color:#143729;font:700 12px Verdana,Arial}.kt126-dialog .kt126-confirm{background:#80362e;color:#fff5e1;border-color:#cb8b73}.kt126-dialog input,.kt126-dialog select{font:14px Verdana,Arial;background:#09291f;color:#f5f0de;border:1px solid #73896c;border-radius:6px;padding:9px;max-width:100%}.kt126-number-label{display:block;font-weight:bold;margin-top:14px}.kt126-number-label input{display:block;width:100%;margin-top:6px}.kt126-evidence-layout{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(250px,1fr);gap:24px;align-items:start}@media(max-width:800px){.kt126-evidence-layout{grid-template-columns:1fr}}.kt126-crop{overflow:auto;max-height:60vh;border:1px solid #54725a;background:white}.kt126-crop canvas{display:block;max-width:100%;height:auto}.kt126-crop canvas.kt126-zoomed{max-width:none}.kt126-register-row{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:12px 0;border-bottom:1px solid #54725a}.kt126-register-row span{overflow-wrap:anywhere}';document.head.append(style);
  const box=document.createElement('section');box.id='kt126Registry';box.innerHTML='<strong id="kt126Number">Нова преписка — номерът се присвоява при регистриране</strong><div id="kt126External">Деловоден № — предстои преглед</div><div class="kt126-actions"><button type="button" id="kt126OpenRegister">Моите преписки</button><button type="button" id="kt126Save">Запази преписката</button><button type="button" id="kt126EditExternal">Преглед на Деловоден №</button><button type="button" id="kt126NewCase">Нова преписка</button></div><p id="kt126Message" role="status">Постоянният номер се създава еднократно преди анализа. Деловоден № е незадължителен.</p>';stage.insertBefore(box,stage.firstChild);
  const documents=document.createElement('button');documents.type='button';documents.textContent='Документи и история';documents.onclick=()=>record?showCaseFiles(record.case_id).catch(showError):say('Първо регистрирайте преписката.');box.querySelector('.kt126-actions').append(documents);
  const manual=document.createElement('button');manual.type='button';manual.textContent='Регистрирай без файл';manual.onclick=async()=>{manual.disabled=true;try{await registerManual()}catch(e){showError(e)}finally{manual.disabled=false}};box.querySelector('.kt126-actions').append(manual);
  $('kt126OpenRegister').onclick=()=>showRegister().catch(showError);$('kt126Save').onclick=()=>save().catch(showError);$('kt126EditExternal').onclick=()=>record?chooseExternal(root.KT80WorkflowState.intake).catch(showError):say('Първо регистрирайте преписката чрез „Обработи преписката“.');
  $('kt126NewCase').onclick=async()=>{try{if(record)await save();if(confirm('Да започнем нова преписка? Записаната преписка остава в регистъра.'))root.KT80ResetCurrentCase?.()}catch(e){showError(e)}};
  document.addEventListener('kt80:case-reset',()=>{clearTimeout(timer);record=null;restore=null;requestKey=crypto.randomUUID();display();say('Нова преписка. Предишните записи остават в регистъра.')});
  document.addEventListener('input',e=>{if(fields.includes(e.target.id))saveSoon()});document.addEventListener('change',e=>{if(fields.includes(e.target.id))saveSoon()});
  document.addEventListener('click',e=>{if(!e.target.closest('#kt126Registry,.kt126-dialog,#wow-session-banner'))saveSoon()});
  for(const event of ['kt115:stage4-draft','kt116:stage4-confirmed','kt116:stage5-open'])document.addEventListener(event,saveSoon);
  new MutationObserver(changes=>{if(changes.some(x=>x.target instanceof Element&&x.target.closest('#kt116Editor,#kt117Stage5')))saveSoon()}).observe(document.body,{subtree:true,childList:true,characterData:true});
 }
 root.KT126Registry=Object.freeze({beforeProcess,afterRead,afterProcess,saveSoon,attachDocxMetadata,saveGeneratedDocument,refreshBadge:display,restoredIntake:()=>restore?.state?.intake||null,current:()=>record,confirmedExternal:()=>record?.external_status==='confirmed'?record.external_number:'',caseNumber:()=>record?.internal_number||''});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
}
export const registryClientSource='('+installRegistryClient.toString()+')();';
