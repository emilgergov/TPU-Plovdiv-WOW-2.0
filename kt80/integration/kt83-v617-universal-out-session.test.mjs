import {createUniversalOutSession} from './kt83-v617-universal-out-session.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {DOMParser,XMLSerializer} from '@xmldom/xmldom';
import * as fflate from 'fflate';
import {makeOriginalBlankReviewDOCX,ORIGINAL_BLANK_SHA256} from './kt83-v616-original-riosv-blank.mjs';
import {createReviewDocument} from './kt83-v614-review-document.mjs';
import {assessStage4} from './stage4-independent-legal-engine.mjs';
import {draftWithCompetenceGate} from './kt83-v613-competence-gate.mjs';
const encoded=s=>new TextEncoder().encode(s),decoded=b=>new TextDecoder().decode(b);
const texts=Array(39).fill('');
texts[1]='[TLP-WHITE]';texts[3]='ДО';
texts[4]='Получател: ХХХХХХХХХХХХХ';texts[5]='Адрес: ХХХХХХХХХХХХХ';
texts[8]='Относно:';texts[11]='ИМЕ НА ДОКУМЕНТА';texts[36]='С уважение,';
function xml(){
 return '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '+
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>'+
  texts.map((v,i)=>'<w:p>'+(v?'<w:r><w:t>'+v+'</w:t></w:r>':'')+
    (i===37?'<w:r><w:pict/></w:r>':'')+'</w:p>').join('')+'<w:sectPr/></w:body></w:document>';
}
function pack(){
 const zip={'[Content_Types].xml':encoded('test'),'word/document.xml':encoded(xml())};
 for(const p of ['word/header1.xml','word/header2.xml','word/header3.xml',
  'word/footer1.xml','word/footer2.xml','word/footer3.xml'])
  zip[p]=encoded('<w:root>НЕПРОМЕНЯЕМО '+p+'</w:root>');
 for(const p of ['word/media/image1.emf','word/media/image2.wmf','word/media/image3.wmf'])
  zip[p]=encoded('IMAGE '+p);
 return zip;
}
function record(){
 const a=assessStage4({confirmedSubject:'Тестов предмет',scopeConfirmed:true,evidence:[],rules:[]});
 return createReviewDocument({caseId:'test-case-616',generation:2,subject:'Тестов предмет',
  proposal:draftWithCompetenceGate({stage4:a}),recipient:'Тестов получател',referenceNumber:'X/616'});
}
async function withSyntheticFingerprint(cb){
 const previousCrypto=globalThis.crypto,previousDOM=globalThis.DOMParser,previousXML=globalThis.XMLSerializer;
 try{
  Object.defineProperty(globalThis,'crypto',{value:{subtle:{digest:async()=>Buffer.from(ORIGINAL_BLANK_SHA256,'hex')}},configurable:true});
  globalThis.DOMParser=DOMParser;globalThis.XMLSerializer=XMLSerializer;
  return await cb();
 }finally{
  Object.defineProperty(globalThis,'crypto',{value:previousCrypto,configurable:true});
  globalThis.DOMParser=previousDOM;globalThis.XMLSerializer=previousXML;
 }
}
test('real sha256 rejects arbitrary documents before reading Zip',async()=>{
 const previous=globalThis.crypto;
 Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});
 try{
  await assert.rejects(makeOriginalBlankReviewDOCX({templateBytes:fflate.zipSync(pack()),zipEngine:fflate,record:record()}),/не съвпада/);
 }finally{Object.defineProperty(globalThis,'crypto',{value:previous,configurable:true})}
});
test('actual compressed OOXML preserves original headers, footers and WMF/EMF media',async()=>{
 await withSyntheticFingerprint(async()=>{
  const input=pack(),originalZip=fflate.zipSync(input);
  const result=await makeOriginalBlankReviewDOCX({templateBytes:originalZip,zipEngine:fflate,record:record()});
  const output=fflate.unzipSync(result.bytes);
  for(const p of Object.keys(input).filter(p=>/header|footer|media/.test(p)))
   assert.deepEqual(output[p],input[p],p);
  const out=decoded(output['word/document.xml']);
  assert.match(out,/Тестов предмет/);
  assert.match(out,/Тестов получател/);
  assert.match(out,/Първи електронен подпис: НЕПОДПИСАНО/);
  assert.match(out,/Втори електронен подпис: НЕПОДПИСАНО/);
  assert.match(out,/РАБОТЕН ПРОЕКТ/);
  assert.doesNotMatch(out,/ИМЕ НА ДОКУМЕНТА|EG_INDEPENDENT_BLANK_V1/);
  assert.equal(result.status,'EXPERT_REVIEW_ONLY');
 });
});
test('changed original structural anchors or old-content template fail closed',async()=>{
 await withSyntheticFingerprint(async()=>{
  const p=pack(),old=decoded(p['word/document.xml']);
  p['word/document.xml']=encoded(old.replace('ИМЕ НА ДОКУМЕНТА','ПИСМО ПО ЧЛ.2'));
  await assert.rejects(makeOriginalBlankReviewDOCX({templateBytes:fflate.zipSync(p),zipEngine:fflate,record:record()}),/нееднозначно/);
 });
});
test('refuse synthetic original missing protected signature illustration',async()=>{
 await withSyntheticFingerprint(async()=>{
  const p=pack();p['word/document.xml']=encoded(decoded(p['word/document.xml']).replace('<w:pict/>',''));
  await assert.rejects(makeOriginalBlankReviewDOCX({templateBytes:fflate.zipSync(p),zipEngine:fflate,record:record()}),/подписен ред/);
 });
});

test('one original blank serves two consecutive OUT review documents in same session',async()=>{
 await withSyntheticFingerprint(async()=>{
  const out=createUniversalOutSession({cryptoAPI:globalThis.crypto,zipEngine:fflate});
  const template=fflate.zipSync(pack());
  await out.attach(template,{name:'БЛАНКА РИОСВ ПЛОВДИВ.docx'});
  let caseId='test-case-616',generation=2;
  const currentRecord=()=>({caseId,generation,evidenceRevision:null,confirmedSubject:'Тестов предмет',assessmentCurrent:true});
  const one=await out.render(record(),{currentRecord});
  const two=await out.render(record(),{currentRecord});
  assert.equal(out.status().hasOriginal,true);
  assert.equal(out.status().revision,1);
  assert.equal(one.status,'EXPERT_REVIEW_ONLY');
  assert.equal(two.caseId,one.caseId);
  assert.equal(fflate.unzipSync(two.bytes)['word/media/image3.wmf'].length,pack()['word/media/image3.wmf'].length);
 });
});
test('document from different case cannot reuse cached legal assessment',async()=>{
 await withSyntheticFingerprint(async()=>{
  const out=createUniversalOutSession({cryptoAPI:globalThis.crypto,zipEngine:fflate});
  await out.attach(fflate.zipSync(pack()));
  const currentRecord=()=>({caseId:'different-case',generation:2,evidenceRevision:null,confirmedSubject:'Тестов предмет',assessmentCurrent:true});
  await assert.rejects(out.render(record(),{currentRecord}),/не принадлежи/);
 });
});
test('post-render case switch aborts download even if case matched initially',async()=>{
 await withSyntheticFingerprint(async()=>{
  let caseId='test-case-616',count=0;
  const codec={...fflate,zipSync:(parts,opts)=>{
   count++;caseId='new-case-616';
   return fflate.zipSync(parts,opts);
  }};
  const out=createUniversalOutSession({cryptoAPI:globalThis.crypto,zipEngine:codec});
  await out.attach(fflate.zipSync(pack()));
  const currentRecord=()=>({caseId,generation:2,evidenceRevision:null,confirmedSubject:'Тестов предмет',assessmentCurrent:true});
  await assert.rejects(out.render(record(),{currentRecord}),/променена/);
  assert.equal(count,1);
 });
});
test('release purges cached original, no further DOCX until reattached',async()=>{
 await withSyntheticFingerprint(async()=>{
  const out=createUniversalOutSession({cryptoAPI:globalThis.crypto,zipEngine:fflate});
  await out.attach(fflate.zipSync(pack()));
  out.clear();
  assert.equal(out.status().hasOriginal,false);
  const currentRecord=()=>({caseId:'test-case-616',generation:2,evidenceRevision:null,confirmedSubject:'Тестов предмет',assessmentCurrent:true});
  await assert.rejects(out.render(record(),{currentRecord}),/изберете веднъж/);
 });
});

test('delayed SHA verification cannot restore an original cleared while attachment was pending',async()=>{
 await withSyntheticFingerprint(async()=>{
  let release;
  const delayed=new Promise(resolve=>release=resolve);
  const cryptoAPI={subtle:{digest:async()=>{await delayed;return Buffer.from(ORIGINAL_BLANK_SHA256,'hex')}}};
  const out=createUniversalOutSession({cryptoAPI,zipEngine:fflate});
  const pending=out.attach(fflate.zipSync(pack()));
  out.clear();
  release();
  await assert.rejects(pending,/се промени по време на проверката/);
  assert.equal(out.status().hasOriginal,false);
 });
});
