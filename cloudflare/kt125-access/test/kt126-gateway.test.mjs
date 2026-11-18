import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {transform} from 'esbuild';
import {overlayModule} from '../src/kt126/gateway.mjs';
import {registryClientSource} from '../src/kt126/client.mjs';
const paths=['vt03/kt80/KT83_VT02_P1_P6_VISUAL_TEST.html','vt03/kt80/KT83_WORKFLOW_CASE_V591.js','vt03/kt80/KT80_E01_DOSSIER_ORIGINALS_V39.js','vt03/kt80/integration/kt116-expert-approval-handoff.mjs','vt03/kt80/integration/kt117-stage5-document-author.mjs','vt03/kt80/integration/kt119-docx-generator.mjs'];
for(const path of paths){const original=readFileSync('../../'+path,'utf8'),patched=overlayModule(path,original);assert.notEqual(patched,original);if(!path.endsWith('.html'))await transform(patched,{loader:'js',format:'esm'});assert.throws(()=>overlayModule(path,patched),'An already applied overlay cannot silently patch twice');}
assert.equal(overlayModule('untouched.js','const original=1;'),'const original=1;');
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
await window.KT126Registry.beforeProcess({name:'notice.pdf',size:bytes.length,arrayBuffer:async()=>bytes.buffer});
const body=new TextEncoder().encode('<word>accepted body unchanged</word>'),contents={'word/document.xml':body,'[Content_Types].xml':new TextEncoder().encode('<Types></Types>'),'_rels/.rels':new TextEncoder().encode('<Relationships></Relationships>')};
window.KT126Registry.attachDocxMetadata(contents,{caseId:id,version:2});
assert.equal(contents['word/document.xml'],body);const custom=new TextDecoder().decode(contents['docProps/custom.xml']);assert(custom.includes(id));assert(custom.includes('EG-2026-000001'));assert(custom.includes('АБ-12 &amp; 34/2026'));assert.throws(()=>window.KT126Registry.attachDocxMetadata(contents,{caseId:crypto.randomUUID(),version:2}));
console.log('PASS KT126 gateway: exact R6 overlay anchors, syntax, reject duplicate patch, untouched body, case-bound DOCX metadata with XML escaping');
