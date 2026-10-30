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
const unifiedSource=fs.readFileSync(path.join(__dirname,'..','v26-unified-context.js'),'utf8');
const unifiedRoot={};
vm.runInNewContext(unifiedSource,{window:unifiedRoot,globalThis:unifiedRoot,Object,Array,Map,Set,String});
assert.ok(unifiedRoot.V26UnifiedContext,'Unified GIS context module must initialize');
const intake={files:[],dossier_documents:[]};
function unified(results,roleMap=roles,pdf1_confirmed=true){
 return unifiedRoot.V26UnifiedContext.build(intake,roleMap,{results,pdf1_confirmed});
}
const geo={type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Polygon',coordinates:[]}}]};
const base={input:'36498.8.101',cadnum:'36498.8.101',status:'Намерен',geojson:geo};
const roles={'36498.8.101':'leading'};
const diagnosis=results=>context.scenarioFromGIS(results,roles);
assert.equal(diagnosis([{...base,verified_zone_intersections:['BG0001493']}]).scenario,'Б');
assert.equal(diagnosis([{...base,archived_zones:[null,{code:'BG0001493'}]}]).scenario,null);
assert.equal(diagnosis([{...base,intersection_verified_outside:true}]).scenario,'А');
assert.equal(diagnosis([base]).scenario,null);
assert.throws(()=>diagnosis([{...base,status:'Ненамерен'}]),/геометрия/);
assert.throws(()=>context.scenarioFromGIS([base],{}),/водещ/);
assert.equal(unified([{...base,verified_zone_intersections:['BG0001493']}]).diagnosis.scenario,'Б');
assert.equal(unified([{...base,archived_zones:[null,{code:'BG0001493'}]}]).diagnosis.scenario,null);
assert.equal(unified([{...base,intersection_verified_outside:true}]).diagnosis.scenario,'А');
assert.equal(unified([base]).readiness.word,false);
assert.equal(unified([{...base,intersection_verified_outside:true}],roles,false).readiness.word,false);
assert.equal(unified([{...base,intersection_verified_outside:true}]).readiness.word,true);
assert.equal(unified([{...base,intersection_verified_outside:true}],{}).readiness.word,false);

(async()=>{
 const z=context.zipWriter();z.file('README_BG.txt','Проверка');z.file('02_Prilozhenie_1_GIS.pdf',new Blob(['%PDF-1.4']));
 const blob=await z.generateAsync();const bytes=new Uint8Array(await blob.arrayBuffer());
 assert.equal(String.fromCharCode(...bytes.slice(0,2)),'PK');
 assert.equal(String.fromCharCode(...bytes.slice(-22,-18)),String.fromCharCode(0x50,0x4b,0x05,0x06));
 const count=bytes[bytes.length-14]+256*bytes[bytes.length-13];assert.equal(count,2);
 console.log('PASS: scenarios A/B/unresolved, leading-role safety, archive-null safety, ZIP container (16 assertions)');
})().catch(e=>{console.error(e);process.exitCode=1});
