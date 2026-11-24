import test from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,unzipSync} from 'fflate';
import {createDraftWordAdapter} from './kt134-auto-word-adapter.mjs';

// Only a synthetic document. KT120 is the existing, read-only approved template.
test('real Word ZIP retains the approved institutional header, footer and logo',async()=>{
 const fflate={zipSync,unzipSync};
 globalThis.window={fflate};
 const word=createDraftWordAdapter({fflate,templateWindow:globalThis.window});
 const bytes=await word.buildDraft({
  caseId:'EG-TEST-000001',status:'draft',panelId:17,
  documentTitle:'Отговор по жалба',
  content:'Относно: „Разглеждане на възражение“ в ПИ 12345\nУведомяваме Ви, че на основание чл. 31, ал. 1 се предлага мотивиран проект.\nВъзражението се разглежда в пределите на приложимия ред.'
 });
 assert.equal(bytes[0],80);assert.equal(bytes[1],75);
 const pack=unzipSync(bytes);
 for(const path of ['word/document.xml','word/header1.xml','word/footer1.xml',
   'word/media/crest.png','word/media/eco.png','word/styles.xml','word/_rels/document.xml.rels']){
  assert.ok(pack[path]&&pack[path].length>0,'Missing institutional DOCX part: '+path);
 }
 const xml=new TextDecoder().decode(pack['word/document.xml']);
 const header=new TextDecoder().decode(pack['word/header1.xml']);
 const footer=new TextDecoder().decode(pack['word/footer1.xml']);
 assert.match(header,/Регионална инспекция по околната среда и водите/u);
 assert.match(footer,/4000, гр. Пловдив/u);
 assert.match(xml,/ОТГОВОР ПО ЖАЛБА/u);
 assert.match(xml,/Разглеждане на възражение/u);
 assert.equal((xml.match(/Електронен подпис:/gu)||[]).length,2);
 assert.equal((xml.match(/w:firstLine="567"/gu)||[]).length,3);
 assert.doesNotMatch(xml,/\{\{(?:SUBJECT|DOCUMENT_TITLE|BODY_ANCHOR)\}\}/u);
 assert.match(xml,/<w:b\/>/u);assert.match(xml,/<w:i\/>/u);
});
