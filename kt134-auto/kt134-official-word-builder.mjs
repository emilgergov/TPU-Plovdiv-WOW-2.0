/**
 * KT134 — server-only connection to the accepted RIOSV Plovdiv Word
 * template generator. No synthetic archive or fake DOCX byte stream.
 */
import {zipSync,unzipSync} from 'fflate';
import {createDraftWordAdapter} from './kt134-auto-word-adapter.mjs';
const codec={zipSync,unzipSync};
export const createKt134OfficialWordBuilder=()=>{
 const adapter=createDraftWordAdapter({
  fflate:codec,
  // The existing original KT120 template requires templateWindow.fflate.
  // This server-only local object provides exactly that dependency.
  templateWindow:{fflate:codec}
 });
 return async draft=>{
  if(draft?.status!=='draft'||draft?.expertApproved!==false||
     draft?.finalDecision!=null)
    throw Error('KT134_UNAUTHORIZED_WORD_FINALIZATION');
  const bytes=await adapter.buildDraft(draft);
  if(!(bytes instanceof Uint8Array)||bytes.length<100||
     bytes[0]!==0x50||bytes[1]!==0x4b)
    throw Error('KT134_OFFICIAL_DOCX_FAILED');
  const archive=unzipSync(bytes);
  if(!archive['word/document.xml']||!archive['word/header1.xml']||
     !archive['word/footer1.xml']||!archive['word/media/crest.png'])
    throw Error('KT134_OFFICIAL_TEMPLATE_INCOMPLETE');
  return bytes;
 };
};
