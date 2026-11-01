const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync(__dirname+'/v27-case-evidence.js','utf8');
const context={};vm.runInNewContext(code,context);
const api=context.V27CaseEvidence;
const reg=api.create({documents:[
 {file:'notification.txt',text:'Водоснабдяване от съществуваща мрежа.',facts:[{kind:'water_supply',value:'Водоснабдяване от съществуваща мрежа.',quote:'Водоснабдяване от съществуваща мрежа.'}]},
 {file:'plan.txt',text:'Водоснабдяване от сондаж.',facts:[{kind:'water_supply',value:'Водоснабдяване от сондаж.',quote:'Водоснабдяване от сондаж.'}]},
 {file:'bad.pdf',error:'unreadable',facts:[{kind:'procedure',value:'ОВОС'}]}
]});
assert.equal(reg.documents.length,3);
assert.equal(reg.facts.length,3);
assert.equal(reg.conflicts.length,1);
assert.equal(reg.facts[2].status,'unverified');
assert.equal(reg.warnings.length,2);
const ai=api.forAI(reg);
assert.equal(ai.facts.length,2);
assert.ok(ai.facts[0].quote.includes('Водоснабдяване'));
assert.throws(()=>api.forAI(reg,{maxCharacters:10}),/split into batches/);
assert.equal(api.create({documents:[{file:'a',text:'abc',facts:[{kind:'other',value:'not in text',quote:'no'}]}]}).facts[0].status,'unverified');
console.log('V27.1 P2 evidence registry: PASS');
