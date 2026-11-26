/**
 * KT134 — server-only connection to the accepted RIOSV Plovdiv Word
 * template generator. No synthetic archive or fake DOCX byte stream.
 */
import {zipSync,unzipSync} from 'fflate';
import {createDraftWordAdapter} from './kt134-auto-word-adapter.mjs';
import {makeAutomaticTemplate} from '../vt03/kt80/integration/kt120-embedded-word-template.mjs';
const codec={zipSync,unzipSync};
export const createKt134OfficialWordBuilder=()=>{
 const adapter=createDraftWordAdapter({
  fflate:codec,
  // The existing original KT120 template requires templateWindow.fflate.
  // This server-only local object provides exactly that dependency.
  templateWindow:{fflate:codec},
  // KT120's original template refers to a browser global named 'window'.
  // Supply that dependency synchronously, then restore the original state.
  // Do not modify the accepted template source or use a synthetic DOCX.
  createTemplate:()=>{
   const owned=Object.prototype.hasOwnProperty.call(globalThis,'window');
   const previous=globalThis.window;
   try{
    globalThis.window={fflate:codec};
    return makeAutomaticTemplate();
   }finally{
    if(owned)globalThis.window=previous;
    else delete globalThis.window;
   }
  }
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
