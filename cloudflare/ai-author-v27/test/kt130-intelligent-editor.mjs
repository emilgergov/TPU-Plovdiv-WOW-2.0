import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {textHash} from '../src/kt130-intelligent-editor.mjs';
const text='Относно: „Контролен обект“.\n\nВъв връзка с постъпилата документация Ви уведомявам следното:\n\nНа основание чл. 2, ал. 2 следва да се издаде писмо с констатация, че не се налага провеждане на процедура по оценка за съвместимост.';
const edited=text.replace('следва да се издаде писмо с констатация, че','Ви уведомявам, че');
const direction='ИЗБРАН ПАНЕЛ: 01 — Писмо по чл. 2, ал. 2 от Наредбата за ОС';
const body={task:'draft_stage5_document',editorialOnly:true,caseId:'editor-case',evidenceRevision:3,requestId:'editor-request',stage4Version:2,projectOnly:true,expertConfirmed:true,confirmedStage4Text:direction,selectedPanelLine:direction,documentTitle:'Писмо по чл. 2, ал. 2 от Наредбата за ОС',subject:'Контролен обект',scope:'Контролна дейност',documentVersion:1,baseTextHash:await textHash(text),currentText:text};
const env={OPENAI_API_KEY:'test',AI_AUTHOR_ACCESS_TOKEN:'test-access'};
const request=(body,token='test-access')=>new Request('https://example.invalid/stage5-document',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
const saved=globalThis.fetch;let calls=0;globalThis.fetch=async(_url,options)=>{calls++;const p=JSON.parse(options.body);assert.deepEqual(JSON.parse(p.input[1].content),{text});return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:JSON.stringify({text:edited,notes:[]})}]}]}));};
try{
 assert.equal((await worker.fetch(request(body,'wrong'),env)).status,401);
 assert.equal((await worker.fetch(request(body),env)).status,422);assert.equal(calls,0,'Unsigned approval cannot use optional editor');
 const result=await worker.fetch(request(body),{...env,KT123_TEST_LEGACY_MODE:'true'});assert.equal(result.status,200);assert.equal(calls,1);assert.equal((await result.json()).editorialOnly,true);
 assert.equal((await worker.fetch(request({...body,sourcePreviewOnly:true}),{...env,KT123_TEST_LEGACY_MODE:'true'})).status,400);assert.equal(calls,1);
 console.log('PASS actual Stage5 endpoint: bearer and signed approval enforced before editor, one text-only call, source-preview mode isolated');
}finally{globalThis.fetch=saved}
