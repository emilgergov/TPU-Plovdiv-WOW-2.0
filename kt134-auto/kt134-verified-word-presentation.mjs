/**
 * KT134 final-screen binding: one proposal revision -> one verified Word archive
 * -> one document preview. No generated HTML can silently diverge from DOCX.
 * The verifier is intentionally fail-closed; it does not claim semantic or
 * administrative-law validity of the document.
 */
const str=x=>String(x??'').trim();
const fail=msg=>{throw Error(msg)};
const t=new TextDecoder(),encoder=new TextEncoder();
const unesc=x=>x.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
function paragraphs(xml){
 const out=[];
 for(const match of xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/gu)){
  const pieces=[...match[0].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/gu)]
   .map(m=>unesc(m[1]));
  if(pieces.length)out.push(pieces.join('').replace(/\s+/gu,' ').trim());
 }
 return out;
}
async function digest(input,subtle){
 const hash=new Uint8Array(await subtle.digest('SHA-256',input));
 return [...hash].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export function createVerifiedWordPresentation({unzipSync,subtle=globalThis.crypto?.subtle}={}){
 if(typeof unzipSync!=='function'||!subtle?.digest)fail('Липсва проверка на Word проекта');
 return Object.freeze({async bind({caseId,proposalVersion,proposal,wordBytes}){
  if(!str(caseId)||!str(proposalVersion)||proposal?.caseId!==caseId ||
   proposal.expertConfirmed!==false)fail('Няма валиден неодобрен проект');
  if(!(wordBytes instanceof Uint8Array)||wordBytes.length<4||
   wordBytes[0]!==0x50||wordBytes[1]!==0x4b)fail('Липсва DOCX архив');
  const canonical=str(proposal.documentDraft).replace(/\r\n/g,'\n');
  const lines=canonical.split('\n').map(s=>s.trim()).filter(Boolean);
  if(lines.length<2||!lines[0].startsWith('Относно:'))fail('Липсва пълен текст на проекта');
  const archive=unzipSync(wordBytes);
  const part=archive?.['word/document.xml'];
  if(!(part instanceof Uint8Array)||!part.length)fail('Липсва текст в DOCX');
  const xml=t.decode(part);
  if(/\{\{(?:SUBJECT|BODY_ANCHOR|DOCUMENT_TITLE)\}\}/u.test(xml))
   fail('Бланката съдържа непопълнени полета');
  const actual=paragraphs(xml);
  const title=str(proposal.documentTitle).toLocaleUpperCase('bg-BG');
  if(!actual.includes(title))fail('Видът на документа се различава от проекта');
  // Each canonical paragraph must occur in order. No preview text is
  // invented; it is read back from the generated DOCX.
  const normalized=lines.map(s=>s.replace(/\s+/gu,' '));
  const result=[];
  let next=0;
  for(const l of normalized){
   const idx=actual.findIndex((a,i)=>i>=next&&a===l);
   if(idx<0)fail('Word и одобряваният проект се различават');
   result.push(actual[idx]);next=idx+1;
  }
  const fileSha256=await digest(wordBytes,subtle);
  const contentSha256=await digest(encoder.encode(normalized.join('\n')),subtle);
  const bindingSha256=await digest(encoder.encode(JSON.stringify({
   caseId,proposalVersion,fileSha256,contentSha256})),subtle);
  return Object.freeze({
   caseId,proposalVersion,wordSha256:fileSha256,contentSha256,bindingSha256,
   title,previewParagraphs:Object.freeze(result),status:'unapproved',
   wordReady:true,expertConfirmed:false
  });
 }});
}
