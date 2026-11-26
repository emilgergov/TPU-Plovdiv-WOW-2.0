/**
 * Send Stage4 only an explicitly labelled source excerpt when the dossier is
 * larger than the deployed isolated EG Worker request limit (100,000 bytes).
 * Keep ALL source identities and evidence metadata. Never pretend that the
 * excerpts are complete original documents.
 */
const encoder=new TextEncoder();
const length=x=>encoder.encode(JSON.stringify(x)).byteLength;
const fail=code=>{const e=new Error(code);e.code=code;throw e};
const cut=(text,max)=> {
 if(text.length<=max)return text;
 const head=Math.ceil(max*0.7);
 const tail=max-head;
 return text.slice(0,head)+'\n[… извадка; средната част не е предоставена на EG …]\n'+text.slice(-tail);
};
export function limitKt134Stage4Payload(original,{maxBytes=96000}={}){
 if(!original||typeof original!=='object')fail('EG_STAGE4_PAYLOAD_INVALID');
 if(length(original)<=maxBytes)return original;
 const detail=original.completeCaseEvidence||{};
 const docs=detail.sourceTexts;
 if(!Array.isArray(docs)||!docs.length)fail('EG_STAGE4_EVIDENCE_TOO_LARGE');
 const base={...original,completeCaseEvidence:{
  ...detail,sourceTexts:docs.map(d=>({...d,text:''})),
  sourceTextTruncated:true,
  sourceTruncationReason:'EG_STAGE4_TRANSPORT_LIMIT',
  completeOriginalDocumentsNotSupplied:true
 }};
 const overhead=length(base);
 // Maintain at least a real attributed excerpt for EVERY dossier file.
 const available=maxBytes-overhead-4000;
 if(available<docs.length*300)fail('EG_STAGE4_EVIDENCE_TOO_LARGE');
 const maxPer=Math.min(12000,Math.floor(available/docs.length/2));
 if(maxPer<300)fail('EG_STAGE4_EVIDENCE_TOO_LARGE');
 const clipped=docs.map(d=>{
  const full=String(d.text||'');
  return {...d,text:cut(full,maxPer),totalChars:
    Number.isSafeInteger(d.totalChars)&&d.totalChars>0?d.totalChars:full.length,
    truncated:d.truncated===true||full.length>maxPer,
    excerptOnly:d.truncated===true||full.length>maxPer
  };
 });
 let result={...base,completeCaseEvidence:{...base.completeCaseEvidence,
  sourceTexts:clipped,
  sourceTruncationNotice:'Налични са само документирани извадки; при необходимост от липсващ откъс посочете точно кой оригинален документ трябва да бъде проверен.'}};
 if(length(result)>maxBytes){
  let remaining=maxBytes-length({...result,completeCaseEvidence:{...result.completeCaseEvidence,
    sourceTexts:clipped.map(d=>({...d,text:''}))}})-1000;
  if(remaining<docs.length*180)fail('EG_STAGE4_EVIDENCE_TOO_LARGE');
  const each=Math.floor(remaining/docs.length/2);
  result={...result,completeCaseEvidence:{...result.completeCaseEvidence,
    sourceTexts:docs.map(d=>({...d,text:cut(String(d.text||''),each),
      truncated:true,excerptOnly:true}))}};
 }
 if(length(result)>maxBytes)fail('EG_STAGE4_EVIDENCE_TOO_LARGE');
 return result;
}
