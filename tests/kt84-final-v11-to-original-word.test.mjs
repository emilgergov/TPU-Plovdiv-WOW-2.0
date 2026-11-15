/** KT84 FINAL: actual independent V11/competence engines -> safe reviewed DOCX
 * Synthetic dossier facts and SYNTHETIC TEMPLATE in the test only.
 * No legal conclusion or official document is inferred from GIS intersections.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {DOMParser,XMLSerializer} from '@xmldom/xmldom';
import * as fflate from 'fflate';
import {assessStage4} from '../kt80/integration/stage4-independent-legal-engine.mjs';
import {createCaseAssessmentPacket} from '../kt80/integration/kt83-v612-independent-rule-packet.mjs';
import {auditNaturaOsCompetence,COMPETENCE_FACT_IDS} from '../kt80/integration/kt83-p5-competence-audit.mjs';
import {prepareExpertV11Review} from '../kt80/integration/kt83-p5-expert-v11-review.mjs';
import {createCaseReviewStore} from '../kt80/integration/kt83-p3-case-review-provider.mjs';
import {createMasterV11Bridge} from '../kt80/integration/kt83-p3-canonical-v11-master-bridge.mjs';
import {verifiedReference} from '../kt80/integration/v11-trusted-source-registry.mjs';
import {assess as v11Handoff} from '../kt80/integration/kt83-vt01-v11-handoff.js';
import {draftWithCompetenceGate} from '../kt80/integration/kt83-v613-competence-gate.mjs';
import {createReviewDocument} from '../kt80/integration/kt83-v614-review-document.mjs';
import {createUniversalOutSession} from '../kt80/integration/kt83-v617-universal-out-session.mjs';
import {ORIGINAL_BLANK_SHA256} from '../kt80/integration/kt83-v616-original-riosv-blank.mjs';

const enc=x=>new TextEncoder().encode(x);
const dec=x=>new TextDecoder().decode(x);
const context={caseId:'EG-FINAL-V11-WORD-001',generation:4,evidenceRevision:7,
  subject:'Потвърден предмет по Наредбата за ОС',
  scope:'Потвърден обхват и приложени пространствени доказателства',
  subjectConfirmed:true,scopeConfirmed:true};
const legalSource='current-case.pdf';
const authority={name:'Директор на РИОСВ – Пловдив',municipality:'Пловдив',
 registryId:'N_OS_6A',sourceId:legalSource,sourceLocation:'стр. 2',
 reason:'Експертно проверени условия, седем изключения и териториален обхват'};
function casePacket(){
 const ids=Object.keys(COMPETENCE_FACT_IDS);
 return createCaseAssessmentPacket({
  hypotheses:[{id:'os_6a_independent',title:'Самостоятелна проверка по чл. 6а НОС',
   registryId:'N_OS_6A',
   requirements:ids.filter(id=>COMPETENCE_FACT_IDS[id]==='true'),
   exceptions:ids.filter(id=>COMPETENCE_FACT_IDS[id]==='false'),
   exceptionAudit:{status:'listed',sourceId:'N_OS_6A',
    sourceLocation:'чл. 6а, т. 1, букви а–ж',reason:'Всяко изключение е проверено независимо'},
   missingFactProposal:'Предложение: проверете непълните условия.',
   supportedProposal:'Предложение: експертно разгледайте конкретните доказателства.',
   notSupportedProposal:'Предложение: проверете компетентността на друг орган.'}],
  facts:ids.map(factId=>({factId,value:COMPETENCE_FACT_IDS[factId],
   sourceId:legalSource,sourceType:'Преписка',sourceLocation:'стр. 2',
   sourceQuote:'Доказателствен цитат за '+factId,
   reason:'Изрично потвърждение на факт от текущата преписка'}))
 });
}
function reviewChain(){
 const packet=casePacket();
 const stage4=assessStage4({confirmedSubject:context.subject,scopeConfirmed:true,
  evidence:packet.evidence,rules:packet.rules});
 assert.equal(stage4.readyForStage5Draft,true);
 const competence=auditNaturaOsCompetence({context,competence:authority,
  archived:verifiedReference('N_OS_6A'),packet,
  caseDocuments:[{file:legalSource,state:'TEXT_EXTRACTED'}],
  verifySource:fact=>fact.sourceQuote==='Доказателствен цитат за '+fact.factId});
 assert.equal(competence.verified,true,'not enough to cite V11 alone');
 const reviewed=prepareExpertV11Review({context,packet,existingStage4:stage4,
  authority,expertApproved:true,independentCompetenceAudit:competence});
 const current={...context};
 const store=createCaseReviewStore(()=>current);
 assert.equal(store.submit(reviewed).ok,true);
 const bridge=createMasterV11Bridge(store);
 const verified=v11Handoff(current,bridge);
 assert.equal(verified.ok,true);
 assert.equal(verified.competenceVerified,true);
 assert.ok(verified.provisions.some(p=>p.documentId==='N_OS_6A'));
 return {current,bridge,verified,stage4};
}
function template(){
 const texts=Array(39).fill('');
 texts[1]='[TLP-WHITE]';texts[3]='ДО';
 texts[4]='Получател: ХХХХХХХХХХХХХ';texts[5]='Адрес: ХХХХХХХХХХХХХ';
 texts[8]='Относно:';texts[11]='ИМЕ НА ДОКУМЕНТА';texts[36]='С уважение,';
 const xml='<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '+
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>'+
  texts.map((x,i)=>'<w:p>'+(x?'<w:r><w:t>'+x+'</w:t></w:r>':'')+
   (i===37?'<w:r><w:pict/></w:r>':'')+'</w:p>').join('')+
  '<w:sectPr/></w:body></w:document>';
 const parts={'[Content_Types].xml':enc('test'),
  'word/document.xml':enc(xml)};
 for(const f of ['word/header1.xml','word/header2.xml','word/header3.xml',
  'word/footer1.xml','word/footer2.xml','word/footer3.xml'])
  parts[f]=enc('<w:root>ЗАПАЗЕНА БЛАНКА '+f+'</w:root>');
 for(const f of ['word/media/image1.emf','word/media/image2.wmf','word/media/image3.wmf'])
  parts[f]=enc('ORIGINAL '+f);
 return parts;
}
async function syntheticTemplateOnly(cb){
 const priorCrypto=globalThis.crypto,priorParser=globalThis.DOMParser,
  priorSerializer=globalThis.XMLSerializer;
 try{
  Object.defineProperty(globalThis,'crypto',{value:{subtle:{
   digest:async()=>Buffer.from(ORIGINAL_BLANK_SHA256,'hex')
  }},configurable:true});
  globalThis.DOMParser=DOMParser;globalThis.XMLSerializer=XMLSerializer;
  return await cb();
 }finally{
  Object.defineProperty(globalThis,'crypto',{value:priorCrypto,configurable:true});
  globalThis.DOMParser=priorParser;globalThis.XMLSerializer=priorSerializer;
 }
}
function recordFromVerified(chain){
 if(v11Handoff(chain.current,chain.bridge).ok!==true)
  throw new TypeError('Няма актуално, независимо удостоверена оценка V11.');
 // A positive individual V11 review does not authorize a formal outgoing act.
 const proposal=draftWithCompetenceGate({
  stage4:chain.stage4,authorityClaim:authority.name
 });
 return createReviewDocument({caseId:chain.current.caseId,
  generation:chain.current.generation,evidenceRevision:chain.current.evidenceRevision,
  subject:chain.current.subject,proposal,caseTitle:'Работно писмо за експертен преглед',
  recipient:'Тестов адресат',address:'Тестов адрес',referenceNumber:'ОВОС-ТЕСТ'});
}
test('FINAL: independent V11 -> motivated unsigned Word on accepted original structure',async()=>{
 await syntheticTemplateOnly(async()=>{
  const chain=reviewChain(),parts=template();
  const record=recordFromVerified(chain);
  assert.equal(record.status,'EXPERT_REVIEW_ONLY');
  assert.equal(record.formalIssuanceAllowed,false);
  assert.match(record.body,/чл\. 6а/);
  assert.match(record.body,/Предложение за следващо действие/);
  const session=createUniversalOutSession({cryptoAPI:globalThis.crypto,zipEngine:fflate});
  await session.attach(fflate.zipSync(parts),{name:'СИНТЕТИЧНА ТЕСТОВА БЛАНКА'});
  const currentRecord=()=>({
   caseId:chain.current.caseId,generation:chain.current.generation,
   evidenceRevision:chain.current.evidenceRevision,confirmedSubject:chain.current.subject,
   documentSignature:'Работно писмо|Тестов адресат|Тестов адрес|ОВОС-ТЕСТ',
   assessmentCurrent:v11Handoff(chain.current,chain.bridge).ok===true
  });
  const result=await session.render(record,{currentRecord});
  assert.equal(result.status,'EXPERT_REVIEW_ONLY');
  assert.equal(result.signaturesUnsigned,true);
  const output=fflate.unzipSync(result.bytes);
  for(const k of Object.keys(parts).filter(k=>/header|footer|media/.test(k)))
   assert.deepEqual(output[k],parts[k],'original part preserved: '+k);
  const xml=dec(output['word/document.xml']);
  assert.match(xml,/Работно писмо за експертен преглед/);
  assert.match(xml,/НЕПОДПИСАНО/);
  assert.match(xml,/чл\. 6а/);
  assert.doesNotMatch(xml,/ИЗДАДЕН АДМИНИСТРАТИВЕН АКТ/);
  console.log('KT84_FINAL_VERIFIED_V11_TO_UNSIGNED_WORD',JSON.stringify({
   caseId:record.caseId,revision:record.evidenceRevision,
   provisions:chain.verified.provisions.length,
   size:result.bytes.length,originalPartsPreserved:true,formalIssuance:false}));
 });
});
test('FINAL: updated evidence revision invalidates V11 and denies Word creation',()=>{
 const chain=reviewChain();
 chain.current.evidenceRevision++;
 assert.equal(v11Handoff(chain.current,chain.bridge).ok,false);
 assert.throws(()=>recordFromVerified(chain),/Няма актуално/);
});
