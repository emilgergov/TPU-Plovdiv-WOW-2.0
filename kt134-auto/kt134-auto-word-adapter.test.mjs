import test from 'node:test';
import assert from 'node:assert/strict';
import {createDraftWordAdapter} from './kt134-auto-word-adapter.mjs';

function make(){
 const original={
  'word/document.xml':new TextEncoder().encode(
   '<w:document><w:body><w:p>Електронен подпис:</w:p><w:p>Електронен подпис:</w:p>'+
   '<w:p><w:r>{{SUBJECT}}</w:r></w:p>'+
   '<w:p><w:r>{{DOCUMENT_TITLE}}</w:r></w:p>'+
   '<w:p><w:r>{{BODY_ANCHOR}}</w:r></w:p></w:body></w:document>'),
  'word/header1.xml':new TextEncoder().encode('<header>РИОСВ Пловдив</header>'),
  'word/footer1.xml':new TextEncoder().encode('<footer>Реквизити</footer>')};
 let archive=null;
 const fflate={
  unzipSync:()=>structuredClone(original),
  zipSync:(files)=>{archive=files;return new Uint8Array([80,75,3,4,5]);}
 };
 const adapter=createDraftWordAdapter({fflate,createTemplate:()=>new Uint8Array([80,75,3,4]),templateWindow:{fflate}});
 const view=()=>new TextDecoder().decode(archive['word/document.xml']);
 return {adapter,view,archive:()=>archive};
}
const draft=()=>({status:'draft',panelId:17,documentTitle:'Отговор по жалба',
 content:'Относно: „Промяна на инвестиционно предложение“ в ПИ 12345\nНа основание чл. 31, ал. 1 се разглежда възражението.\nПредлагаме мотивиран отговор.'});
test('draft DOCX uses institutional template and approved basic typography',async()=>{
 const x=make();
 const bytes=await x.adapter.buildDraft(draft());
 assert.ok(bytes instanceof Uint8Array && bytes.length>0);
 const xml=x.view();
 assert.match(xml,/ОТГОВОР ПО ЖАЛБА/u);
 assert.match(xml,/Относно:/u);
 assert.match(xml,/<w:i\/>/u);
 assert.match(xml,/<w:b\/>/u);
 assert.match(xml,/w:firstLine="567"/u);
 assert.match(xml,/w:val="both"/u);
 assert.match(xml,/чл\./u);
 assert.ok(!xml.includes('{{BODY_ANCHOR}}'));
 assert.ok(x.archive()['word/header1.xml']);
 assert.ok(x.archive()['word/footer1.xml']);
});
test('XML metacharacters remain escaped within project text',async()=>{
 const x=make();
 await x.adapter.buildDraft({...draft(),content:'Относно: <Тест & проверка>\nТекст с <обект> и & знак'});
 assert.match(x.view(),/&lt;Тест &amp; проверка&gt;/u);
 assert.match(x.view(),/&lt;обект&gt;/u);
});
test('automatic DOCX cannot masquerade as signed or approved version',async()=>{
 const x=make();
 await assert.rejects(x.adapter.buildDraft({...draft(),status:'approved'}),/само проект/);
});
test('a missing or ambiguous administrative document type is rejected',async()=>{
 const x=make();
 await assert.rejects(x.adapter.buildDraft({...draft(),documentTitle:''}),/вид на административния документ/);
});
test('document with a single line is not a complete administrative project',async()=>{
 const x=make();
 await assert.rejects(x.adapter.buildDraft({...draft(),content:'Относно: Недостатъчно'}),/Не е представен текст/);
});
test('invalid missing template fields cannot produce fake DOCX',async()=>{
 const x=make();
 const fflate={zipSync:()=>new Uint8Array([80,75]),unzipSync:()=>({'word/document.xml':new TextEncoder().encode('<w:p>Текст</w:p>')})};
 const adapter=createDraftWordAdapter({fflate,createTemplate:()=>new Uint8Array([80,75]),templateWindow:{fflate}});
 await assert.rejects(adapter.buildDraft(draft()),/два подписа/);
});
