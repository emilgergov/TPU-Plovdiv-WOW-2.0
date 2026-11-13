/**
 * WOW KT83 V61.7 — ONE original institutional blank per working session.
 * The source DOCX remains in browser memory only: no GitHub upload, persistence,
 * analytics, global fixture, cross-tab storage or background transfer.
 * Each OUT document must be built from its own current case-bound review record.
 */
import {makeOriginalBlankReviewDOCX,ORIGINAL_BLANK_SHA256} from './kt83-v616-original-riosv-blank.mjs';
const fail=why=>{throw new TypeError('Единна бланка В61.7: '+why)};
const allowed=new Set(['EXPERT_REVIEW_ONLY']);
const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
const clone=b=>new Uint8Array(b);
async function sha(b,cryptoAPI){
 if(!cryptoAPI?.subtle)fail('липсва SHA-256');
 return hex(new Uint8Array(await cryptoAPI.subtle.digest('SHA-256',b)));
}
export function createUniversalOutSession({cryptoAPI=globalThis.crypto,zipEngine}={}){
 let original=null,identity=null,round=0;
 const status=()=>Object.freeze({
  hasOriginal:!!original,source:'LOCAL_ONLY',fingerprint:original?ORIGINAL_BLANK_SHA256:null,
  revision:round,retainedAcrossCases:!!original,originalNeverUploaded:true
 });
 async function attach(bytes,{name=''}={}){
  const startedAt=round;
  if(!(bytes instanceof Uint8Array)||bytes.length<1000||bytes.length>5000000)
   fail('невалиден размер на оригиналния DOCX');
  const input=clone(bytes);
  const fingerprint=await sha(input,cryptoAPI);
  if(fingerprint!==ORIGINAL_BLANK_SHA256)
   fail('този файл не е приетата „БЛАНКА РИОСВ ПЛОВДИВ.docx“');
  if(round!==startedAt)fail('сесията или изборът на бланка се промени по време на проверката');
  original=input;identity=String(name||'БЛАНКА РИОСВ ПЛОВДИВ.docx');round++;
  return status();
 }
 async function render(record,{currentRecord=null}={}){
  if(!original)fail('изберете веднъж оригиналната бланка за работната сесия');
  if(!record||!allowed.has(record.status)||record.schema!=='KT80_REVIEW_DOCUMENT_V614'||
     record.formalIssuanceAllowed!==false)fail('допустим е само документ за експертен преглед');
  if(typeof currentRecord!=='function')fail('необходима е независима проверка на текущата преписка');
  const stamp=round,source=original;
  const scope=()=>currentRecord();
  const before=scope();
  if(!before||before.caseId!==record.caseId||before.generation!==record.generation||
     before.evidenceRevision!==record.evidenceRevision||before.confirmedSubject!==record.subject||
     before.assessmentCurrent!==true)
   fail('документът не принадлежи на актуалния работен цикъл');
  const result=await makeOriginalBlankReviewDOCX({
   templateBytes:source,zipEngine,record
  });
  const after=scope();
  if(round!==stamp||original!==source||!after||
     after.caseId!==before.caseId||after.generation!==before.generation||
     after.evidenceRevision!==before.evidenceRevision||
     after.confirmedSubject!==before.confirmedSubject||
     after.assessmentCurrent!==true)
   fail('преписката или оригиналната бланка е променена при генерирането');
  return Object.freeze({...result,sessionTemplateRevision:stamp});
 }
 function clear(){original=null;identity=null;round++;}
 return Object.freeze({attach,render,status,clear});
}
