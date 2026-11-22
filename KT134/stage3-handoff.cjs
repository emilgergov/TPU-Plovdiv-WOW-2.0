/* KT134 — pure routing adapter, not injected into the KT133 Worker.
   No storage, no network, no AI calls, no changes to Stage 1/2/4/5.
   Consumes confirmed route and verified evidence only. */
'use strict';
const contract = require('./gis-evidence-contract.cjs');
function buildHandoff(input) {
  if (!input || typeof input !== 'object') return {ok:false, errors:['Липсва вход']};
  const caseId=typeof input.caseId === 'string'?input.caseId.trim():'';
  if(!caseId) return {ok:false,errors:['Липсва вътрешен ИД']};
  if(input.route==='without-gis') {
    if(input.gisEvidence != null) return {ok:false,errors:['ГИС данни са подадени за маршрут без ГИС']};
    if(input.routeConfirmed!==true) return {ok:false,errors:['Липсва експертно потвърждение на маршрута']};
    return {ok:true,caseId,mode:'context-only',stage3Required:false,gisEvidence:null,
      note:'Етап 3 — контекстен режим; ГИС/PDF1 не се изисква'};
  }
  if(input.route!=='with-gis') return {ok:false,errors:['Непознат маршрут на преписката']};
  if(input.routeConfirmed!==true) return {ok:false,errors:['Липсва експертно потвърждение на маршрута']};
  if(!input.gisEvidence || input.gisEvidence.caseId!==caseId)
    return {ok:false,errors:['Липсват данни или идентификаторът на ГИС доказателствата не съвпада с преписката']};
  const checked=contract.validatePackage(input.gisEvidence);
  if(!checked.ok)return {ok:false,errors:checked.errors};
  if(checked.spatialStatus==='НЯМА ДАННИ')
    return {ok:false,errors:['Непълни ГИС доказателства: не се допуска категоричен извод']};
  // No automatic legal procedure or Stage 4/5 decision.
  // Clone the *accepted* evidence so callers cannot mutate the source after handoff.
  const safe=JSON.parse(JSON.stringify(input.gisEvidence));
  return {ok:true,caseId,mode:'gis-evidence',stage3Required:true,
    gisEvidence:safe,spatialStatus:checked.spatialStatus,
    note:'Пространствени доказателства — не представляват правно заключение'};
}
module.exports=Object.freeze({buildHandoff});
