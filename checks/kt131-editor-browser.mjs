import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {editorWordChanges,installPreparedTextEditor} from '../cloudflare/kt125-access/src/kt126/prepared-text-editor.mjs';
const {chromium}=await import(process.env.KT131_BROWSER_PACKAGE?pathToFileURL(process.env.KT131_BROWSER_PACKAGE+'/index.mjs'): 'playwright');
const server=createServer((_req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html lang="bg"><head><meta charset="utf-8"></head><body><main id="kt117Stage5"></main></body></html>')});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.KT131_BROWSER_EXECUTABLE||undefined,headless:true});
 const page=await browser.newPage({viewport:{width:1200,height:850}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.addScriptTag({content:'const editorWordChanges='+editorWordChanges.toString()+';const installPreparedTextEditor='+installPreparedTextEditor.toString()+';'});
 const result=await page.evaluate(async()=>{
  const make=(tag,text)=>{const n=document.createElement(tag);n.textContent=text||'';return n};
  const names=['reviewActions','preview','textarea','edit','confirm','generate','sourceCheck','word','note'];const nodes=Object.fromEntries(names.map(x=>[x,make(x==='textarea'?'textarea':x==='reviewActions'?'div':x==='note'?'p':'button',x)]));
  document.querySelector('main').append(...Object.values(nodes));nodes.textarea.hidden=true;nodes.reviewActions.className='kt117-actions';nodes.reviewActions.append(nodes.edit,nodes.confirm);
  const original='Относно: „Контролен обект“.\n\nВъв връзка с документацията Ви уведомявам следното:\n\nНа основание чл. 2 следва да се издаде писмо с констатация, че не се налага провеждане на процедура по оценка за съвместимост.';
  const revised=original.replace('следва да се издаде писмо с констатация, че','Ви уведомявам, че');
  const source={caseId:'synthetic-browser-case',evidenceRevision:1,version:1,text:'ИЗБРАН ПАНЕЛ: 01 — Контролен документ'};
  const state={source,versions:[{version:1,text:original}],confirmed:null,busy:false};let mode='quota',started=0,finished=0;
  window.KT80WorkflowState={subjectConfirmed:{text:'Контролен обект',scope:'Контролен обхват'}};
  window.KT119TemplateReady=()=>true;window.KT80Busy={start:()=>++started,finish:()=>finished++};
  window.KT80EGSession={hasAccess:()=>true,request:async(_url,body)=>{
   const p=JSON.parse(body);if(mode==='quota')return Response.json({transportFailure:true,message:'Изчерпан кредит. Текущият текст е запазен.'},{status:503});
   return Response.json({caseId:p.caseId,requestId:p.requestId,evidenceRevision:1,stage4Version:1,documentVersion:p.documentVersion,baseTextHash:p.baseTextHash,text:mode==='whitespace'?original.replace('следва да','следва  да'):revised,editorialOnly:true,expertReviewRequired:true,editStatus:mode==='partial'?'partial':'changed',notes:['Синтетичен тест, без реална преписка.']});
  }};
  const api={...nodes,make,endpoint:'https://example.invalid/stage5-document',state:()=>state,sync(){},live:()=>source,evidence:()=>({parcelIds:[]}),label:()=>'',reference:()=>'',busy:value=>state.busy=value,apply:(text,kind,metadata)=>state.versions.push({version:state.versions.length+1,text,kind,...metadata})};
  const editor=installPreparedTextEditor(api);editor.refresh();const smart=document.querySelector('#kt130IntelligentEditor');
  const check=(value,message)=>{if(!value)throw Error(message)};
  await smart.onclick();check(state.versions.length===1&&!state.busy&&!smart.disabled&&started===finished,'Failure must retain draft and release controls');check(document.querySelector('#kt130EditorStatus').textContent.includes('Изчерпан кредит'),'Actionable failure shown');
  mode='whitespace';await smart.onclick();check(state.versions.length===1,'Whitespace must not create version');
  mode='partial';await smart.onclick();check(state.versions.length===2&&state.confirmed===null,'Edited draft remains unconfirmed');check(document.querySelector('#kt130EditorStatus').textContent.includes('частична'),'Partial status');check(document.querySelectorAll('#kt130EditorHistory mark').length>0&&document.querySelectorAll('#kt130EditorHistory del').length>0,'Word differences rendered');
  check(![...document.querySelectorAll('#kt130EditorHistory del')].some(n=>n.textContent.includes('чл. 2')),'Unchanged legal reference not crossed out');
  const restore=[...document.querySelectorAll('button')].find(n=>n.textContent==='Върни предишния вариант');restore.click();check(state.versions.at(-1).text===original&&state.confirmed===null,'Undo retains expert confirmation requirement');
  check(started===finished&&!state.busy,'No stuck indicator');return {started,finished,versions:state.versions.length};
 });
 assert.deepEqual(errors,[]);await mkdir('kt131-browser-qa',{recursive:true});await page.screenshot({path:'kt131-browser-qa/editor.png',fullPage:true});await writeFile('kt131-browser-qa/result.json',JSON.stringify(result,null,2));console.log('PASS browser synthetic editor: quota feedback, control release, whitespace no-op, partial word differences and undo.');
}finally{await browser?.close();await new Promise(r=>server.close(r))}
