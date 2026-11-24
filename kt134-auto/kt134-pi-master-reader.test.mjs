import test from 'node:test';
import assert from 'node:assert/strict';
import {createKT134PIMasterReader} from './kt134-pi-master-reader.mjs';

const caseId='11111111-1111-4111-8111-111111111111';
const sourceMetadata={schema:'kt77-pi-master-browser-v1',status:'VERIFIED',
 total_unique_parcels:917417,admin_as_of:'2026-05-15'};
const parcel={cadnum:'56784.13.102',settlement:'гр. Пловдив',municipality:'Пловдив',
 province:'Пловдив',area_m2:3434.7131219906,zz:[],zt:[]};
const lookup=async id=>({status:'FOUND',profile:{...parcel,cadnum:id}});
const d=(text,extra)=>({caseId,documents:[{fileId:'Uvedomlenie.pdf',sourceText:text},
 ...(extra?[{fileId:'Uvedomlenie.doc',sourceText:extra}]:[])]});
test('P4 parcel is found once across both notification formats with real historical area and no fictitious verification',async()=>{
 const reader=createKT134PIMasterReader({lookup,sourceMetadata});
 const out=await reader({caseId,context:d('ИП в ПИ 56784.13.102, складове и офиси','ПИ 56784.13.102, офиси и складове')});
 assert.equal(out.parcels.length,1);
 assert.equal(out.parcels[0].area_m2,3434.7131219906);
 assert.deepEqual(out.parcels[0].zz,[]);
 assert.deepEqual(out.parcels[0].zt,[]);
 assert.equal(out.verified,false);
 assert.equal(out.geometryVerified,false);
 assert.equal(out.evidence.length,0);
 assert.equal(out.archiveAdminAsOf,'2026-05-15');
});
test('additional cadastral identifiers are retained, not silently merged with the main PI',async()=>{
 const reader=createKT134PIMasterReader({lookup,sourceMetadata});
 const out=await reader({caseId,context:d('ПИ 56784.13.102 и съседен ПИ 56784.13.103')});
 assert.equal(out.parcels.length,2);
});
test('foreign parcel result fails closed',async()=>{
 const reader=createKT134PIMasterReader({lookup:async()=>({status:'FOUND',profile:parcel}),sourceMetadata});
 await assert.rejects(reader({caseId,context:d('ПИ 56784.13.103')}),/друг имот/);
});
test('absence of a parcel does not mean outside a protected zone',async()=>{
 const reader=createKT134PIMasterReader({lookup:async id=>({status:'NOT_IN_VALIDATED_CADASTRE',cadnum:id}),sourceMetadata});
 await assert.rejects(reader({caseId,context:d('ПИ 56784.13.102')}),/Непълна/);
});
test('unverified source index is never trusted',()=>{
 assert.throws(()=>createKT134PIMasterReader({lookup,sourceMetadata:{...sourceMetadata,status:'UNVERIFIED'}}),/удостоверен/);
});
test('foreign case identity fails before PI MASTER lookup',async()=>{
 let calls=0;
 const reader=createKT134PIMasterReader({lookup:async x=>{calls++;return lookup(x)},sourceMetadata});
 await assert.rejects(reader({caseId:'22222222-2222-4222-8222-222222222222',context:d('ПИ 56784.13.102')}),/текуща преписка/);
 assert.equal(calls,0);
});
test('missing cadastral identifier never produces zero-overlap finding',async()=>{
 const reader=createKT134PIMasterReader({lookup,sourceMetadata});
 await assert.rejects(reader({caseId,context:d('Уведомление за складове и офиси')}),/кадастрален/);
});

test('P4: parcel numbers appearing only in multi-property deed are not treated as subject when notification is classified',async()=>{
 const seen=[];
 const reader=createKT134PIMasterReader({lookup:async id=>{seen.push(id);return lookup(id)},sourceMetadata});
 const context={caseId,documents:[
  {fileId:'Uvedomlenie.pdf',kind:'notification',sourceText:'ИП за ПИ 56784.13.102'},
  {fileId:'Not_Akt.pdf',kind:'ownership_deed',sourceText:'Имот 56784.13.102 и 56784.13.103'}
 ]};
 const out=await reader({caseId,context});
 assert.deepEqual(seen,['56784.13.102']);
 assert.equal(out.scopeBasis,'classified_notice_only');
 assert.equal(out.subjectParcelsVerified,false);
});
