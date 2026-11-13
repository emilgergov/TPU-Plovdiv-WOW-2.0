/**
 * WOW V61.4 — independent ADMINISTRATIVE REVIEW DRAFT, not an official outgoing act.
 * The immutable record and print HTML are exclusively for a separate preview.
 * The approved DOCX letterhead/Classic A+B/Expert generators are untouched.
 */
const trimmed=x=>typeof x==='string'?x.replace(/\s+/gu,' ').trim():'';
const escape=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const normId=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{8,128}$/.test(x);
const allowed=['caseId','generation','subject','proposal','evidenceRevision','recordedAt','recipient','referenceNumber','caseTitle'];
export function createReviewDocument({caseId,generation,subject,proposal,evidenceRevision=null,
 recordedAt=null,recipient=null,referenceNumber=null,caseTitle=null}={}){
 if(!normId(caseId)||!Number.isSafeInteger(generation)||generation<0)
  throw new TypeError('Липсва валиден идентификатор и генерация на преписката');
 if(!trimmed(subject)||!proposal||proposal.schema!=='KT80_STAGE5_INDEPENDENT_DRAFT_V01'||
  !trimmed(proposal.independentText)||trimmed(proposal.subject)!==trimmed(subject))
  throw new TypeError('Липсва мотивирано предложение за текущия потвърден предмет');
 if(proposal.administrativeActIssued!==false||proposal.requiresExpertAuthorization!==true)
  throw new TypeError('Недопустимо издаване на административен акт без експертна приемка');
 if(proposal.readyForFormalDraft!==false||proposal.competentAuthority!==null||
   proposal.tariff!==null||proposal.sourceCoverageComplete!==false)
  throw new TypeError('Неудостоверена правна готовност: забранен е формален изход');
 const record=Object.freeze({
  schema:'KT80_REVIEW_DOCUMENT_V614',
  status:'EXPERT_REVIEW_ONLY',
  caseId,generation,subject:trimmed(subject),
  evidenceRevision,recipient:trimmed(recipient)||'АДРЕСАТ — ЗА ПОПЪЛВАНЕ',
  referenceNumber:trimmed(referenceNumber)||'ВХ. № — ЗА ПОПЪЛВАНЕ',
  caseTitle:trimmed(caseTitle)||'Проект за експертен преглед',
  recordedAt:recordedAt||null,
  body:proposal.independentText,
  institutionalHeader:'РИОСВ – ПЛОВДИВ',
  confidentiality:'РАБОТЕН ПРОЕКТ — НЕ Е ИЗХОДЯЩ АДМИНИСТРАТИВЕН АКТ',
  signatures:Object.freeze([
   Object.freeze({role:'Електронен подпис 1',status:'НЕПОДПИСАНО'}),
   Object.freeze({role:'Електронен подпис 2',status:'НЕПОДПИСАНО'})
  ]),
  logoStatus:'ОФИЦИАЛНО ЛОГО — ПОДАВА СЕ ОТ ПРИЕТАТА БЛАНКА',
  formalIssuanceAllowed:false
 });
 return record;
}
export function renderReviewHTML(record){
 if(!record||record.schema!=='KT80_REVIEW_DOCUMENT_V614'||
  record.formalIssuanceAllowed!==false||record.status!=='EXPERT_REVIEW_ONLY')
  throw new TypeError('Неоторизиран формат на документния проект');
 const sections=record.body.split(/\n+/gu).filter(Boolean).map(text=>'<p>'+escape(text)+'</p>').join('');
 return '<!doctype html><html lang="bg"><head><meta charset="utf-8">'+
  '<title>'+escape(record.caseTitle)+'</title><style>'+
  '@page{size:A4;margin:20mm 18mm 18mm}body{font-family:Verdana,sans-serif;font-size:10pt;line-height:1;color:#171717}'+
  'h1{font-size:12pt;margin:0 0 5mm}p{margin:0 0 3mm}.notice{border:1px solid #555;padding:2mm;font-weight:bold}'+
  '.foot{margin-top:8mm;border-top:1px solid #555;padding-top:3mm;font-size:9pt}.sigs{margin-top:10mm;display:flex;gap:8mm}.sig{flex:1}'+
  '</style></head><body><header><h1>'+escape(record.institutionalHeader)+'</h1>'+
  '<p>'+escape(record.logoStatus)+'</p><p class="notice">'+escape(record.confidentiality)+'</p></header>'+
  '<p><strong>Адресат:</strong> '+escape(record.recipient)+'</p>'+
  '<p><strong>Преписка:</strong> '+escape(record.referenceNumber)+'</p>'+
  '<p><strong>Предмет:</strong> '+escape(record.subject)+'</p><main>'+sections+'</main>'+
  '<div class="sigs">'+record.signatures.map(s=>'<div class="sig">'+escape(s.role)+': '+escape(s.status)+'</div>').join('')+'</div>'+
  '<footer class="foot">'+escape(record.confidentiality)+' · Контролен ИД: '+escape(record.caseId)+'</footer>'+
  '</body></html>';
}
