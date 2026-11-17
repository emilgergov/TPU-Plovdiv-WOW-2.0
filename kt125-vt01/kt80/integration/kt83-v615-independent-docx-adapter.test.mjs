import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectBlankDOCX,makeReviewDOCX} from './kt83-v615-independent-docx-adapter.mjs';
import {createReviewDocument} from './kt83-v614-review-document.mjs';
import {assessStage4} from './stage4-independent-legal-engine.mjs';
import {draftWithCompetenceGate} from './kt83-v613-competence-gate.mjs';
const markers=['EG_INDEPENDENT_BLANK_V1','EG_RECIPIENT','EG_REFERENCE','EG_SUBJECT','EG_BODY',
 'EG_SIGNATURE_1','EG_SIGNATURE_2','EG_CONFIDENTIALITY'];
const toBytes=s=>new TextEncoder().encode(s);
const fromBytes=b=>new TextDecoder().decode(b);
function zipParts(extra=''){
 const xml='<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+
  markers.map(m=>'<w:p><w:r><w:t>{{'+m+'}}</w:t></w:r></w:p>').join('')+
  extra+'<w:sectPr><w:headerReference r:id="rIdHdr"/><w:footerReference r:id="rIdFtr"/></w:sectPr></w:body></w:document>';
 return {'[Content_Types].xml':toBytes('test'),
  'word/document.xml':toBytes(xml),
  'word/header1.xml':toBytes('<w:hdr><w:drawing><a:blip r:embed="rIdLogo"/></w:drawing></w:hdr>'),
  'word/footer1.xml':toBytes('<w:ftr>Официален футър</w:ftr>'),
  'word/_rels/header1.xml.rels':toBytes('<Relationships><Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/></Relationships>'),
  'word/_rels/document.xml.rels':toBytes('<Relationships><Relationship Id="rIdHdr" Target="header1.xml"/><Relationship Id="rIdFtr" Target="footer1.xml"/></Relationships>'),
  'word/media/logo.png':new Uint8Array([1,2,3,4])};
}
const codec={
 unzipSync:()=>zipParts(),
 zipSync:parts=>{codec.last=parts;return toBytes('test zipped representation with good size')}
};
const caseRecord=()=>{
 const s4=assessStage4({confirmedSubject:'Предмет за проверка',scopeConfirmed:true,evidence:[],rules:[]});
 const p=draftWithCompetenceGate({stage4:s4});
 return createReviewDocument({caseId:'case-615-alpha',generation:1,subject:'Предмет за проверка',
 proposal:p,recipient:'<script>А Б</script>',referenceNumber:'ВХ-TEST'});
};
test('strictly empty independent DOCX shell passes and preserves header, footer and logo bytes',()=>{
 const original=zipParts();
 const codec2={unzipSync:()=>original,zipSync:parts=>{codec2.parts=parts;return new Uint8Array([80,75,3,4])}};
 const out=makeReviewDOCX({templateBytes:toBytes('large enough binary placeholder'),zipEngine:codec2,record:caseRecord()});
 assert.equal(out.unsigned,true);assert.equal(out.status,'EXPERT_REVIEW_ONLY');
 for(const f of ['word/header1.xml','word/footer1.xml','word/media/logo.png'])
  assert.equal(codec2.parts[f],original[f]);
 const xml=fromBytes(codec2.parts['word/document.xml']);
 assert.doesNotMatch(xml,/EG_INDEPENDENT_BLANK_V1|EG_BODY/);
 assert.match(xml,/НЕПОДПИСАНО/);
 assert.match(xml,/&lt;script&gt;/);
 assert.doesNotMatch(xml,/<script>А Б<\/script>/);
});
test('Classic-shaped DOCX with content outside markers is rejected',()=>{
 const c={...codec,unzipSync:()=>zipParts('<w:p><w:r><w:t>Предварително решение: не се изисква процедура</w:t></w:r></w:p>')};
 assert.throws(()=>inspectBlankDOCX(toBytes('large enough fake template zip'),c),/наследен/);
});
test('missing logo, footers, broken signature slots and macros fail closed',()=>{
 const base=zipParts();
 for(const modified of [
  Object.fromEntries(Object.entries(base).filter(([k])=>k!=='word/media/logo.png')),
  Object.fromEntries(Object.entries(base).filter(([k])=>k!=='word/footer1.xml')),
  {...base,'word/vbaProject.bin':toBytes('macro')},
  {...base,'word/_rels/header1.xml.rels':toBytes('<Relationships><Relationship Id="rIdLogo" Target="https://external.invalid/logo.png" TargetMode="External"/></Relationships>')},
  {...base,'word/document.xml':toBytes(fromBytes(base['word/document.xml']).replace('{{EG_SIGNATURE_2}}','НЕПОДПИСАНО'))}
 ]){
  const c={...codec,unzipSync:()=>modified};
  assert.throws(()=>inspectBlankDOCX(toBytes('large enough fake template zip'),c));
 }
});
test('unapproved or signed record cannot be converted to DOCX',()=>{
 const c={...codec,unzipSync:()=>zipParts()};
 const signed={...caseRecord(),status:'OFFICIAL'};
 assert.throws(()=>makeReviewDOCX({templateBytes:toBytes('large enough fake template zip'),zipEngine:c,record:signed}),/неоторизирана/);
});
