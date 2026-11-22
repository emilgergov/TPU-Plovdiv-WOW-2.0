/* Детерминистични проверки на чистия контракт; без Worker, данни или мрежа.
   Изпълнение: node KT134/tests/gis-contract.test.cjs */
const assert=require('node:assert/strict');
const {validatePackage}=require('../gis-evidence-contract.cjs');
const parcel=(identifier='56784.13.102',intersectionStatus='none')=>({identifier,areaSqM:1000,source:'ТЕСТОВ ЕТАЛОН — НЕОФИЦИАЛНИ ДАННИ',intersectionStatus,intersections:[]});
const p=(parcels)=>({caseId:'EG-TEST-134',parcels});
let x=validatePackage(p([parcel()]));assert.equal(x.ok,true);assert.equal(x.spatialStatus,'НЯМА ПРЕСИЧАНЕ');
x=validatePackage(p([parcel('56784.13.102','unknown')]));assert.equal(x.spatialStatus,'НЯМА ДАННИ');assert.equal(x.canStateNoIntersection,false);
x=validatePackage(p([parcel(),parcel('56784.13.102')]));assert.equal(x.ok,false);assert.match(x.errors.join('|'),/Дублиран/);
x=validatePackage(p([]));assert.equal(x.ok,false);assert.equal(x.canStateNoIntersection,false);
const intersect=parcel('36676.129.457','intersects');
intersect.intersections=[{type:'ZZ',code:'BG0000194',areaSqM:120}];
x=validatePackage(p([intersect]));assert.equal(x.ok,true);assert.equal(x.spatialStatus,'ИМА ПРЕСИЧАНЕ');
intersect.intersections=[{type:'ZZ',code:'BG0000194',areaSqM:2000}];
assert.equal(validatePackage(p([intersect])).ok,false);
const invalid=parcel('99999.999.999');invalid.source='';assert.equal(validatePackage(p([invalid])).ok,false);
const contradictory=parcel('56784.13.102','none');
contradictory.intersections=[{type:'ZZ',code:'BG0000194',areaSqM:120}];
x=validatePackage(p([contradictory]));assert.equal(x.ok,false);assert.equal(x.canStateNoIntersection,false);
const contradictoryUnknown=parcel('56784.13.102','unknown');
contradictoryUnknown.intersections=[{type:'ZZ',code:'BG0000194',areaSqM:120}];
assert.equal(validatePackage(p([contradictoryUnknown])).ok,false);
console.log('KT134 GIS contract smoke tests: 9 PASS');
