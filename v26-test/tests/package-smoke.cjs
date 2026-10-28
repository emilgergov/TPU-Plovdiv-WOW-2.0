/* Automated, dependency-free V26.5 package logic regression tests. Run: node v26-test/tests/package-smoke.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','v26-draft-package.js'),'utf8');
function extract(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a,'Missing production function '+start);return source.slice(a,b)}
const code=extract('function zipWriter(){','function scenarioFromGIS(')+'\n'+extract('function scenarioFromGIS(','function normativePdf(');
const context=vm.createContext({TextEncoder,Uint8Array,Uint32Array,Blob,ArrayBuffer,Error,Map,Set,String});
vm.runInContext(code,context);
const geo={type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Polygon',coordinates:[]}}]};
const base={input:'36498.8.101',cadnum:'36498.8.101',status:'Намерен',geojson:geo};
const roles={'36498.8.101':'leading'};
const diagnosis=results=>context.scenarioFromGIS(results,roles);
assert.equal(diagnosis([{...base,verified_zone_intersections:['BG0001493']}]).scenario,'Б');
assert.equal(diagnosis([{...base,archived_zones:[null,{code:'BG0001493'}]}]).scenario,'Б');
assert.equal(diagnosis([{...base,intersection_verified_outside:true}]).scenario,'А');
assert.equal(diagnosis([base]).scenario,null);
assert.throws(()=>diagnosis([{...base,status:'Ненамерен'}]),/геометрия/);
assert.throws(()=>context.scenarioFromGIS([base],{}),/водещ/);
(async()=>{
 const z=context.zipWriter();z.file('README_BG.txt','Проверка');z.file('02_Prilozhenie_1_GIS.pdf',new Blob(['%PDF-1.4']));
 const blob=await z.generateAsync();const bytes=new Uint8Array(await blob.arrayBuffer());
 assert.equal(String.fromCharCode(...bytes.slice(0,2)),'PK');
 assert.equal(String.fromCharCode(...bytes.slice(-22,-18)),'PK\\u0005\\u0006'.replace('\\u0005','\\x05').replace('\\u0006','\\x06'));
 const count=bytes[bytes.length-14]+256*bytes[bytes.length-13];assert.equal(count,2);
 console.log('PASS: scenarios A/B/unresolved, leading-role safety, archive-null safety, ZIP container (8 assertions)');
})().catch(e=>{console.error(e);process.exitCode=1});
