import assert from 'node:assert/strict';
import {test} from 'node:test';
import {buildKt134CompleteStage4Request} from './kt134-complete-dossier-stage4.mjs';
import {createKt134EgStage45Bridge} from './kt134-eg-stage45-live-bridge.mjs';
const example=()=>({
 caseId:'EG-2026-000004',registryNumber:'ТЕСТ-0004',
 subject:'Реконструкция на съществуващо складово помещение',
 scope:'Вътрешно преустройство на сграда в съществуващ имот, съгласно предоставения тестов документ.',
 gisMode:'required',
 documents:[{sourceId:'uploaded-1',fileName:'test-notice.pdf',type:'уведомление',text:'СИНТЕТИЧНО уведомление за реконструкция в имот; данните са само тестови.'}],
 parcels:[{identifier:'99999.999.999',settlement:'Тестово село',municipality:'Тестова община',areaSqm:1500,sourceId:'pi-master-1'}],
 gis:{sourceId:'gis-1',pdf1Ref:'test-pdf1',projection:'WGS_1984_UTM_Zone_35N',
 protectedZones:[{name:'Тестова ЗЗ',intersects:false,distanceMeters:1200,sourceId:'gis-1',order:'синтетичен реквизит'}],
 protectedAreas:[{name:'Тестова ЗТ',intersects:true,intersectionAreaSqm:100,sourceId:'gis-1'}]},
 piMaster:{sourceId:'pi-master-1',verified:true},pdf2Ref:'test-pdf2',
 normativeArchive:{name:'V11 MASTER',sha256:'a'.repeat(64),verifiedReferences:[]}
});
test('complete E1-E3 factual context enters real Stage4 request',()=>{
 const x=buildKt134CompleteStage4Request({caseId:'EG-2026-000004',revision:'rev4',bundle:example()});
 assert.equal(x.evidenceRevision,'rev4');assert.equal(x.completeCaseEvidence.sourceTexts.length,1);
 assert.deepEqual(x.parcelIds,['99999.999.999']);
 assert.equal(x.completeCaseEvidence.gis.protectedZones.length,1);
 assert.equal(x.completeCaseEvidence.gis.protectedAreas.length,1);
 assert.equal(x.completeCaseEvidence.pdf1Ref,'test-pdf1');
 assert.equal(x.completeCaseEvidence.pdf2Ref,'test-pdf2');
 assert.equal(x.completeCaseEvidence.parcels[0].municipality,'Тестова община');
 assert.ok(x.evidence.some(x=>x.value.includes('отстояние 1200 m')));
 assert.ok(x.evidence.some(x=>x.value.includes('площ на пресичане 100 кв. м')));
});
test('never fabricate GIS conclusions when PDF1 absent',()=>{
 const b=example();delete b.gis.pdf1Ref;
 assert.throws(()=>buildKt134CompleteStage4Request({caseId:b.caseId,revision:'rev4',bundle:b}),/KT134_GIS_PDF1_MISSING/);
});
test('contextual GIS skip is represented explicitly',()=>{
 const b=example();b.gisMode='contextual_skip';b.gis=null;b.gisSkipReason='Жалба: пространствено положение не е предмет на възражението';
 const x=buildKt134CompleteStage4Request({caseId:b.caseId,revision:'rev4',bundle:b});
 assert.equal(x.completeCaseEvidence.gis.analysisMode,'contextual_skip');
 assert.equal(x.evidence.some(x=>x.factId.startsWith('GIS_')),false);
});
test('do not permit empty dossier or missing location source',()=>{
 const b=example();b.documents=[];assert.throws(()=>buildKt134CompleteStage4Request({caseId:b.caseId,revision:'rev4',bundle:b}),/KT134_DOSSIER_DOCUMENTS_MISSING/);
 const c=example();c.parcels[0].sourceId=null;
 const q=buildKt134CompleteStage4Request({caseId:c.caseId,revision:'rev4',bundle:c});
 assert.equal(q.evidence.some(x=>x.factId==='PARCEL_1'),false);
});
test('EG bridge directly accepts E1-E3 bundle without a second hardcoded factory',async()=>{
 const b=example();let body;
 const bridge=createKt134EgStage45Bridge({workerBase:'https://example.invalid',accessToken:'synthetic',
 fetchImpl:async(_,req)=>{body=JSON.parse(req.body);return {ok:true,json:async()=>({
 caseId:b.caseId,evidenceRevision:'rev4',
 authorDraft:'ИЗБРАН ПАНЕЛ: 17 — Жалби и възражения\n'+ 'A'.repeat(140),
 draft:'ИЗБРАН ПАНЕЛ: 17 — Жалби и възражения\n'+ 'A'.repeat(140)
 })}}});
 const result=await bridge.invokeAuthor({caseId:b.caseId,revision:'rev4',subject:b.subject,evidence:b});
 assert.equal(result.panelId,17);assert.equal(body.completeCaseEvidence.gis.protectedAreas.length,1);
 assert.equal(body.completeCaseEvidence.registryNumber,'ТЕСТ-0004');
 assert.equal(body.kt134AutomaticInterim,true);
});
