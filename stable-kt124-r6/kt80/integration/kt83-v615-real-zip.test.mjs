// Synthetic OOXML fixture: tests actual compressed ZIP handling, NOT an approved logo or letterhead.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as fflate from 'fflate';
import {makeReviewDOCX} from './kt83-v615-independent-docx-adapter.mjs';
import {createReviewDocument} from './kt83-v614-review-document.mjs';
import {assessStage4} from './stage4-independent-legal-engine.mjs';
import {draftWithCompetenceGate} from './kt83-v613-competence-gate.mjs';
const bytes=s=>new TextEncoder().encode(s),text=b=>new TextDecoder().decode(b);
const markers=['EG_INDEPENDENT_BLANK_V1','EG_RECIPIENT','EG_REFERENCE','EG_SUBJECT','EG_BODY','EG_SIGNATURE_1','EG_SIGNATURE_2','EG_CONFIDENTIALITY'];
function sampleParts(){
 const body=markers.map(x=>'<w:p><w:r><w:t>{{'+x+'}}</w:t></w:r></w:p>').join('');
 return {
  '[Content_Types].xml':bytes('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),
  '_rels/.rels':bytes('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdRoot" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'),
  'word/document.xml':bytes('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>'+body+'<w:sectPr><w:headerReference r:id="rIdHdr"/><w:footerReference r:id="rIdFtr"/></w:sectPr></w:body></w:document>'),
  'word/_rels/document.xml.rels':bytes('<Relationships><Relationship Id="rIdHdr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rIdFtr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>'),
  'word/header1.xml':bytes('<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:drawing><a:blip r:embed="rIdLogo"/></w:drawing></w:hdr>'),
  'word/_rels/header1.xml.rels':bytes('<Relationships><Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/></Relationships>'),
  'word/footer1.xml':bytes('<w:ftr>СИНТЕТИЧЕН ТЕСТОВ ФУТЪР</w:ftr>'),
  'word/media/logo.png':new Uint8Array([137,80,78,71,13,10,26,10])
 };
}
const record=()=>{
 const stage4=assessStage4({confirmedSubject:'Тестов предмет',scopeConfirmed:true,evidence:[],rules:[]});
 return createReviewDocument({caseId:'case-615-zip-a',generation:1,subject:'Тестов предмет',
  proposal:draftWithCompetenceGate({stage4}),recipient:'Получател',referenceNumber:'X/1'});
};
test('actual compressed DOCX ZIP is readable after guarded generation',()=>{
 const original=sampleParts(),template=fflate.zipSync(original);
 const docx=makeReviewDOCX({templateBytes:template,zipEngine:fflate,record:record()});
 const parts=fflate.unzipSync(docx.bytes);
 assert.equal(docx.bytes[0],80);assert.equal(docx.bytes[1],75);
 assert.equal(text(parts['word/footer1.xml']),text(original['word/footer1.xml']));
 assert.deepEqual(parts['word/media/logo.png'],original['word/media/logo.png']);
 const xml=text(parts['word/document.xml']);
 assert.ok(xml.includes('НЕПОДПИСАНО'));
 assert.ok(xml.includes('Тестов предмет'));
 assert.ok(!xml.includes('{{EG_BODY}}'));
 assert.ok(!xml.includes('{{EG_SIGNATURE_1}}'));
 assert.equal(docx.status,'EXPERT_REVIEW_ONLY');
});
test('real ZIP containing an external relationship is rejected',()=>{
 const parts=sampleParts();
 parts['word/_rels/document.xml.rels']=bytes(text(parts['word/_rels/document.xml.rels']).replace('Target="header1.xml"','Target="https://external.invalid/header" TargetMode="External"'));
 assert.throws(()=>makeReviewDOCX({templateBytes:fflate.zipSync(parts),zipEngine:fflate,record:record()}),/външни отношения/);
});
