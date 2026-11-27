/**
 * KT134 — server-only connection to the accepted RIOSV Plovdiv Word
 * template generator. No synthetic archive or fake DOCX byte stream.
 */
import {zipSync,unzipSync} from 'fflate';
import {DOMParser,XMLSerializer} from '@xmldom/xmldom';
import {renderInstitutionalWord} from '../vt03/kt80/integration/kt119-institutional-word.mjs';
import {makeAutomaticTemplate} from '../vt03/kt80/integration/kt120-embedded-word-template.mjs';
const codec={zipSync,unzipSync};
export const createKt134OfficialWordBuilder=()=>{

 return async draft=>{
  if(draft?.status!=='draft'||draft?.expertApproved!==false||
     draft?.finalDecision!=null)
    throw Error('KT134_UNAUTHORIZED_WORD_FINALIZATION');
  if(!Number.isInteger(draft.panelId)||draft.panelId<1||draft.panelId>22||
     typeof draft.content!=='string'||!draft.content.split('\n').slice(1).some(line=>line.trim()))
    throw Error('KT134_INVALID_WORD_DRAFT');
  const owned=Object.prototype.hasOwnProperty.call(globalThis,'window');
  const previous=globalThis.window;
  let templateBytes;
  try{
   globalThis.window={fflate:codec};
   templateBytes=makeAutomaticTemplate();
  }finally{
   if(owned)globalThis.window=previous;
   else delete globalThis.window;
  }
  const contents=renderInstitutionalWord({
   templateBytes,codec,text:draft.content.trim(),title:draft.documentTitle,
   parseXml:xml=>new DOMParser().parseFromString(xml,'application/xml'),
   serializeXml:dom=>new XMLSerializer().serializeToString(dom)
  });
  const bytes=zipSync(contents,{level:6});
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
