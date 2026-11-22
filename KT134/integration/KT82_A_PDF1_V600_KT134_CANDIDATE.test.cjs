'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const filename=require('node:path').join(__dirname,'KT82_A_PDF1_V600_KT134_CANDIDATE.js');
const code=fs.readFileSync(filename,'utf8');
const start=code.indexOf('function verified(checked){');
const end=code.indexOf('\nfunction svgFromMap(){',start);
assert(start>=0&&end>start,'PDF1 guard boundary is unchanged');
const sandbox={};vm.runInNewContext(code.slice(start,end)+';this.check=verified;',sandbox);
const check=sandbox.check,ok=(zones,outside)=>({cadnum:'99999.999.999',verified_zone_intersections:zones,intersection_verified_outside:outside});
const passes=[
 ()=>assert.doesNotThrow(()=>check([ok([],true)])),
 ()=>assert.doesNotThrow(()=>check([ok(['BG0000001'],false)])),
 ()=>assert.doesNotThrow(()=>check([ok([{sitecode:'BG0000001'}],false)])),
 ()=>assert.throws(()=>check([])),
 ()=>assert.throws(()=>check([ok([],false)])),
 ()=>assert.throws(()=>check([ok(['BG0000001'],true)])),
 ()=>assert.throws(()=>check([ok(['BG0000001','BG0000001'],false)])),
 ()=>assert.throws(()=>check([ok([' '],false)])),
 ()=>assert.throws(()=>check([ok([{}],false)])),
 ()=>assert.throws(()=>check([{cadnum:'99999.999.999',verified_zone_intersections:[],intersection_verified_outside:null}])),
 ()=>assert.doesNotThrow(()=>check([ok([],true),ok(['BG0000002'],false)])),
 ()=>assert.throws(()=>check([ok([],true),ok([],false)]))
];passes.forEach((fn,i)=>{fn();console.log('PASS',i+1)});console.log('KT134: 12/12 guard regression checks');
