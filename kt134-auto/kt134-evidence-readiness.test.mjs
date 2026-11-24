import test from 'node:test';
import assert from 'node:assert/strict';
import {assessKT134EvidenceReadiness} from './kt134-evidence-readiness.mjs';
const id='11111111-1111-4111-8111-111111111111';
const good=type=>({caseId:id,verified:true,evidence:[{sourceType:type,
  sourceId:'MASTER-CURRENT',sourceLocation:'Номер на карта / раздел',verification:'verified'}]});
test('P4 remains provisional when GIS and normative master have not run',()=>{
 const r=assessKT134EvidenceReadiness({caseId:id,spatial:null,normative:null});
 assert.equal(r.proposalStatus,'provisional_unverified');
 assert.equal(r.proceduralConclusionVerified,false);
 assert.equal(r.missing.length,2);
});
test('only authentic separately verified case-specific GIS and legal receipts make procedure verification-ready',()=>{
 const r=assessKT134EvidenceReadiness({caseId:id,spatial:good('gis'),normative:good('legal')});
 assert.equal(r.proceduralConclusionVerified,true);
 assert.equal(r.missing.length,0);
});
test('a cross-case receipt is never valid evidence for this dossier',()=>{
 const r=assessKT134EvidenceReadiness({caseId:id,spatial:{...good('gis'),caseId:'other'},normative:good('legal')});
 assert.equal(r.proceduralConclusionVerified,false);
});
test('claimed success without sourced evidence cannot confirm procedure',()=>{
 const r=assessKT134EvidenceReadiness({caseId:id,spatial:{caseId:id,verified:true,evidence:[]},normative:good('legal')});
 assert.equal(r.spatialVerified,false);
});
test('unverified or source-free legal allegation cannot count as normative confirmation',()=>{
 const r=assessKT134EvidenceReadiness({caseId:id,spatial:good('gis'),normative:{caseId:id,verified:true,evidence:[{sourceType:'legal',sourceLocation:'чл. 31',sourceId:'',verification:'verified'}]}});
 assert.equal(r.normativeVerified,false);
});
test('GIS evidence cannot masquerade as normative verification',()=>{
 const r=assessKT134EvidenceReadiness({caseId:id,spatial:good('gis'),normative:good('gis')});
 assert.equal(r.proceduralConclusionVerified,false);
});
