/* WOW KT83 P3 — adapter wires only independently provided LOCAL V11 records.
 * No in-page dummy facts, invented statutes or procedure selection.
 */
(function(root){'use strict';
 function connect(){
  root.KT83NormativeArchiveV11=null;
  const factory=root.KT83P3NormativeVerifierFactory;
  // The providers are injected by a trusted archival integration. If missing,
  // the P1 fail-closed route and its concrete evidence proposal stay active.
  const archive=root.KT83LocalV11Archive,review=root.KT83LocalV11CaseReview;
  if(!factory?.create||!archive||!review||
     (typeof archive.status==='function'&&!(archive.status()?.count>0)))return false;
  const verifier=factory.create({archive,review});
  if(verifier.available!==true)return false;
  root.KT83NormativeArchiveV11=verifier;
  return true;
 }
 root.KT83P3V11Connector=Object.freeze({connect,getStatus:()=>(
  root.KT83NormativeArchiveV11?.available===true?'АРХИВЪТ Е СВЪРЗАН':'НЕОБХОДИМ Е ПРОВЕРЕН ЛОКАЛЕН АРХИВ V11'
 )});
 connect();
})(window);
