import {overlayReader} from '../src/kt126/reader.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {transform} from 'esbuild';
import {overlayModule} from '../src/kt126/gateway.mjs';
import {registryClientSource} from '../src/kt126/client.mjs';
const paths=['vt03/kt80/KT83_VT02_P1_P6_VISUAL_TEST.html','vt03/kt80/KT83_WORKFLOW_CASE_V591.js','vt03/kt80/KT80_E01_DOSSIER_ORIGINALS_V39.js','vt03/kt80/integration/kt116-expert-approval-handoff.mjs','vt03/kt80/integration/kt117-stage5-document-author.mjs','vt03/kt80/integration/kt119-docx-generator.mjs'];
for(const path of paths){const original=readFileSync('../../'+path,'utf8'),patched=overlayModule(path,original);assert.notEqual(patched,original);if(!path.endsWith('.html'))await transform(patched,{loader:'js',format:'esm'});assert.throws(()=>overlayModule(path,patched),'An already applied overlay cannot silently patch twice');}
assert.equal(overlayModule('untouched.js','const original=1;'),'const original=1;');
const workflowSource=overlayModule('vt03/kt80/KT83_WORKFLOW_CASE_V591.js',readFileSync('../../vt03/kt80/KT83_WORKFLOW_CASE_V591.js','utf8'));
const processSource=workflowSource.slice(workflowSource.indexOf('async function process(){'),workflowSource.indexOf('\nfunction confirmSubject'));
const events=[],flowState={generation:0,abort:null,caseCycleId:crypto.randomUUID()},flowNodes=new Map();
const flowRoot={V26LocalIntake:{process:async()=>{events.push('read');return {files:[]}}},KT126Registry:{beforeProcess:async()=>{},current:()=>({external_status:'pending'}),afterProcess:async()=>events.push('saved'),afterRead:()=>{events.push('number-review');return new Promise(()=>{})}},KT80Busy:{start:()=>1,finish:()=>{}}};
const complete=vm.runInNewContext(processSource+'\nprocess()',{root:flowRoot,state:flowState,currentFileRef:null,$:id=>{if(!flowNodes.has(id))flowNodes.set(id,{files:[{name:'notice.pdf'}]});return flowNodes.get(id)},newCaseCycleId:()=>crypto.randomUUID(),document:{dispatchEvent(){}},Event,AbortController,setBadge(){},say(){},intakeResults:()=>events.push('analysis')});
await Promise.race([complete,new Promise((_,reject)=>setTimeout(()=>reject(Error('Registry-number review blocked the independent case analysis')),1000))]);
assert.deepEqual(events,['read','analysis','saved','number-review'],'Main read, analysis and save finish before the isolated number review; an unanswered review cannot block them');

const id=crypto.randomUUID(),bytes=new TextEncoder().encode('original'),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
let record={case_id:id,internal_number:'EG-2026-000001',source_name:'notice.pdf',source_hash:hash,external_status:'confirmed',external_number:'АБ-12 & 34/2026',revision:0};
const styles=[];
const document={readyState:'loading',addEventListener(){},getElementById(){return null},querySelector(){return null},createElement:tag=>({tagName:tag.toUpperCase()}),head:{append:node=>styles.push(node)}};
const window={KT80WorkflowState:{caseCycleId:id},fetch:async(path,options)=>{
 const data=String(path).endsWith('/create')?{record}:String(path).endsWith('/source/start')?{file:{complete:true}}:{record};return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
}};
vm.runInNewContext(registryClientSource,{window,document,crypto,TextEncoder,TextDecoder,URL,location:{href:'https://native.invalid/module/'},fetch:(...args)=>window.fetch(...args),Headers,Response,Request,setTimeout,clearTimeout,queueMicrotask,Event});
assert.equal(styles[0].id,'kt126Styles','Brand styles load independently of the workflow initialization');
assert(styles[0].textContent.includes('background:#123729!important'));
const deferredListeners={},deferredWindow={fetch:window.fetch};
vm.runInNewContext(registryClientSource,{window:deferredWindow,document:{...document,readyState:'interactive',addEventListener:(name,listener)=>deferredListeners[name]=listener},crypto,TextEncoder,TextDecoder,URL,location:{href:'https://native.invalid/module/'},fetch:(...args)=>deferredWindow.fetch(...args),Headers,Response,Request,setTimeout,clearTimeout,queueMicrotask,Event});
assert.equal(typeof deferredListeners.DOMContentLoaded,'function','Deferred script must wait for the workflow DOMContentLoaded listener instead of abandoning initialization');
const reference=window.KT126Registry;
const parts=reference.referenceParts('ОВОС-2466-3/30.09.2026 г.');
assert.equal(parts.prefix,'ОВОС');assert.equal(parts.number,'2466');assert.equal(parts.suffix,'3');assert.equal(parts.date,'30.09.2026');assert.equal(reference.composeReference(parts),'ОВОС-2466-3/30.09.2026 г.');
assert.equal(reference.composeReference({prefix:'РД',number:'12',suffix:'',date:''}),'РД-12');
assert.equal(reference.referenceParts('Специален регистър 12/А').structured,false,'Unusual official references remain freely editable');
assert.equal(reference.validReferenceDate('29.02.2024'),true);assert.equal(reference.validReferenceDate('29.02.2025'),false);assert.equal(reference.validReferenceDate('31.04.2026'),false);assert.equal(reference.validReferenceDate(''),true,'Date remains optional');
assert.equal(reference.filenameReferences('339-Izdavane-pismo-za-opred-n_OVOS-2466_30_09_2026_1 (1).pdf')[0],'ОВОС-2466/30.09.2026 г.','Filename copy suffix is not a registry supplement');
assert.equal(reference.filenameReferences('notification_ОВОС-2159-3_12_10_2026.pdf')[0],'ОВОС-2159-3/12.10.2026 г.');
assert.equal(reference.filenameReferences('РД-12_31_02_2026.pdf').length,0,'Reject impossible filename dates');
assert.equal(reference.filenameReferences('notification.pdf').length,0,'Do not invent absent numbers');
await window.KT126Registry.beforeProcess({name:'notice.pdf',size:bytes.length,arrayBuffer:async()=>bytes.buffer});
const body=new TextEncoder().encode('<word>accepted body unchanged</word>'),contents={'word/document.xml':body,'[Content_Types].xml':new TextEncoder().encode('<Types></Types>'),'_rels/.rels':new TextEncoder().encode('<Relationships></Relationships>')};
window.KT126Registry.attachDocxMetadata(contents,{caseId:id,version:2});
assert.equal(contents['word/document.xml'],body);const custom=new TextDecoder().decode(contents['docProps/custom.xml']);assert(custom.includes(id));assert(custom.includes('EG-2026-000001'));assert(custom.includes('АБ-12 &amp; 34/2026'));assert.throws(()=>window.KT126Registry.attachDocxMetadata(contents,{caseId:crypto.randomUUID(),version:2}));
console.log('PASS KT126 gateway: exact R6 overlay anchors, syntax, reject duplicate patch, untouched body, case-bound DOCX metadata with XML escaping');

const readerSource=readFileSync('../../vt03/kt80/KT82_E01_SAFE_ZIP_INTAKE_V35.js','utf8');
async function readScannedFixture(source){
 let destroyed=false,recognized=0;
 const printed='УВЕДОМЛЕНИЕ за инвестиционно предложение. Уведомяваме Ви, че имаме следното инвестиционно предложение: Строителство на жилищна сграда. Поземлен имот с идентификатор 56784.13.102.';
 const worker={recognize:async()=>{await new Promise(resolve=>setTimeout(resolve,12));recognized++;return {data:{text:printed}}},terminate:async()=>{}};
 const page={getViewport:()=>({width:400,height:600}),getTextContent:async()=>({items:[]}),render:()=>({promise:Promise.resolve(),cancel(){}})};
 const pdf={numPages:13,getPage:async()=>page,destroy:async()=>{destroyed=true}};
 const root={pdfjsLib:{GlobalWorkerOptions:{},getDocument:()=>({promise:Promise.resolve(pdf)})},Tesseract:{createWorker:async()=>worker}};
 vm.runInNewContext(source,{window:root,document:{createElement:()=>({getContext:()=>({})})},File,Blob,TextEncoder,TextDecoder,DataView,Uint8Array,ArrayBuffer,performance,URL,console,setTimeout:(callback,ms)=>setTimeout(callback,ms/1000),clearTimeout});
 const data=await root.V26LocalIntake.process(new File(['synthetic scanned PDF'],'Уведомление.pdf',{type:'application/pdf'}));
 return {data,destroyed,recognized};
}
const oldRead=await readScannedFixture(readerSource);
assert(oldRead.data.files[0].status.includes('90 сек.'),'Reproduce the recorded original 90-second document deadline failure');
const fixedRead=await readScannedFixture(overlayReader(readerSource));
assert.equal(fixedRead.recognized,13);assert.equal(fixedRead.data.page_text_index.length,13);assert.equal(fixedRead.data.document_texts.length,1);assert(fixedRead.data.document_texts[0].text.includes('Строителство на жилищна сграда'));assert.equal(fixedRead.destroyed,true);
assert(!fixedRead.data.files[0].status.includes('НЕПРОЧЕТЕН'));assert.equal(fixedRead.data.reader_version,'KT126_PDF_PAGE_BOUNDS_V1');
console.log('PASS KT126 isolated reader: reproduce the real 90-second failure, preserve all 13 scanned pages with page-local bounds, release PDF resources; number review cannot block or replace the main analysis');
