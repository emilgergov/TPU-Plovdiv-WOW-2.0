/* WOW KT83 — local case boundary v1. Does not authenticate users or persist dossiers.
 * This is an additional fail-closed guard for asynchronous case-specific work.
 * Private case data stays outside localStorage and GitHub Pages.
 */
(function(root){
'use strict';
const STAGES=new Set([1,2,3,4,5]);
let serial=0;
let revision=0;
let lastIdentity=null;
let alive=new Map();
const state=()=>root.KT80WorkflowState||null;
const validUUID=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
function current(){
 const s=state();
 if(!s||!validUUID(s.caseCycleId)||!Number.isSafeInteger(s.generation))return null;
 return Object.freeze({caseId:s.caseCycleId,generation:s.generation,revision});
}
function expire(){
 ++revision;
 alive.clear();
 lastIdentity=null;
}
function assure(){
 const c=current();
 if(!c)throw new Error('КТ83: липсва надежден уникален идентификатор на преписката.');
 const signature=c.caseId+':'+c.generation;
 if(lastIdentity!==null&&lastIdentity!==signature){
  expire();
 }
 lastIdentity=signature;
 return current();
}
function begin(stage){
 if(!STAGES.has(stage))throw new Error('КТ83: невалиден етап.');
 const c=assure();
 if(!root.crypto||typeof root.crypto.randomUUID!=='function')throw new Error('КТ83: липсва надежден генератор на идентификатори.');
 const requestId=root.crypto.randomUUID();
 const token=Object.freeze({...c,stage,requestId,serial:++serial});
 alive.set(requestId,token);
 return token;
}
function matches(token){
 if(!token||!validUUID(token.requestId))return false;
 const saved=alive.get(token.requestId);
 if(!saved||saved!==token)return false;
 const c=current();
 return !!c&&c.caseId===token.caseId&&c.generation===token.generation&&c.revision===token.revision;
}
function finish(token){
 const valid=matches(token);
 if(token&&validUUID(token.requestId))alive.delete(token.requestId);
 return valid;
}
function cancel(token){if(token&&validUUID(token.requestId))alive.delete(token.requestId);}
function invalidate(){expire();}
function details(){
 const c=assure();
 return Object.freeze({caseId:c.caseId,generation:c.generation,revision:c.revision,pendingRequests:alive.size});
}
// Central lifecycle boundary: after a reset, old results never apply.
root.document?.addEventListener('kt80:case-reset',invalidate);
// If processing a new dossier within a page, the old dossier is no longer active.
root.document?.addEventListener('kt80:case-change',invalidate);
root.KT83CaseBoundary=Object.freeze({current:details,begin,matches,finish,cancel,invalidate});
// The session key is NOT an expert identity, and never enters this module.
})(window);
