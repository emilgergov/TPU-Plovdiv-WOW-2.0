/**
 * WOW V61.5: independent, fail-closed DOCX shell adapter.
 * Requires a separately approved blank institutional DOCX with exact markers.
 * Never use Classic A/B/Expert documents as input templates.
 */
const MARKERS=['EG_INDEPENDENT_BLANK_V1','EG_RECIPIENT','EG_REFERENCE','EG_SUBJECT','EG_BODY','EG_SIGNATURE_1','EG_SIGNATURE_2','EG_CONFIDENTIALITY'];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const read=b=>new TextDecoder().decode(b);
const write=s=>new TextEncoder().encode(s);
const error=s=>{throw new TypeError('DOCX V61.5: '+s)};
function replaceMarker(xml,name,value){
 const marker='{{'+name+'}}';
 const matches=[...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].filter(m=>m[1]===marker);
 if(matches.length!==1||xml.split(marker).length!==2)error('невалидно поле '+name);
 const lines=String(value??'').replace(/\r\n?/g,'\n').split('\n').map(esc);
 const rendered='<w:t xml:space="preserve">'+lines.join('</w:t><w:br/><w:t xml:space="preserve">')+'</w:t>';
 return xml.replace(matches[0][0],rendered);
}
export function inspectBlankDOCX(bytes,zipEngine){
 if(!(bytes instanceof Uint8Array)||bytes.length<30||bytes.length>12000000)error('невалиден размер на шаблона');
 if(typeof zipEngine?.unzipSync!=='function'||typeof zipEngine?.zipSync!=='function')
  error('липсва DOCX ZIP библиотека');
 const zip=zipEngine.unzipSync(bytes),paths=Object.keys(zip);
 if(paths.some(x=>x.includes('..')||x.startsWith('/')||/vbaProject|_xmlsignatures/i.test(x)))
  error('недопустим ZIP път, макрос или подпис');
 if(!zip['word/document.xml']||!zip['[Content_Types].xml'])error('липсва документен Word XML');
 const xml=read(zip['word/document.xml']);
 const heads=paths.filter(p=>/^word\/header\d+\.xml$/.test(p));
 const feet=paths.filter(p=>/^word\/footer\d+\.xml$/.test(p));
 const images=paths.filter(p=>/^word\/media\/[^/]+\.(png|jpg|jpeg)$/.test(p));
 if(!heads.length||!feet.length||!images.length)error('липсва хедър, футър или вградено лого');
 if(!heads.some(p=>/<w:(?:drawing|pict)\b/.test(read(zip[p]))))
  error('липсва графично лого в хедъра');
 if(!paths.some(p=>/^word\/_rels\/header\d+\.xml\.rels$/.test(p)))
  error('липсва връзка на логото в хедъра');
 const values=[...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(x=>x[1].trim()).filter(Boolean);
 for(const name of MARKERS){
  const marker='{{'+name+'}}';
  if(values.filter(x=>x===marker).length!==1||xml.split(marker).length!==2)
   error('липсва едно самостоятелно поле '+name);
 }
 const known=new Set([...MARKERS.map(k=>'{{'+k+'}}'),'Адресат:','Относно:','Вх. №:','Проект за експертен преглед']);
 if(values.some(x=>!known.has(x)))error('шаблонът съдържа наследен/неразрешен текст от стар образец');
 return {zip,xml,headerCount:heads.length,footerCount:feet.length,mediaCount:images.length};
}
export function makeReviewDOCX({templateBytes,zipEngine,record}={}){
 if(!record||record.schema!=='KT80_REVIEW_DOCUMENT_V614'||
  record.status!=='EXPERT_REVIEW_ONLY'||record.formalIssuanceAllowed!==false||
  record.signatures?.length!==2||record.signatures.some(x=>x.status!=='НЕПОДПИСАНО'))
  error('неоторизирана чернова');
 const template=inspectBlankDOCX(templateBytes,zipEngine);
 const substitutions={
  EG_INDEPENDENT_BLANK_V1:'',EG_RECIPIENT:record.recipient,
  EG_REFERENCE:record.referenceNumber,EG_SUBJECT:record.subject,EG_BODY:record.body,
  EG_SIGNATURE_1:'НЕПОДПИСАНО',EG_SIGNATURE_2:'НЕПОДПИСАНО',
  EG_CONFIDENTIALITY:record.confidentiality
 };
 let xml=template.xml;
 for(const marker of MARKERS)xml=replaceMarker(xml,marker,substitutions[marker]);
 const parts={...template.zip,'word/document.xml':write(xml)};
 return Object.freeze({
  bytes:zipEngine.zipSync(parts,{level:6}),
  mediaType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  status:'EXPERT_REVIEW_ONLY',unsigned:true,caseId:record.caseId,
  headerPreserved:true,footerPreserved:true,embeddedLogoPreserved:true
 });
}
