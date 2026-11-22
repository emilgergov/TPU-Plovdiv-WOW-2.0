'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const commit='2652e375cf90f03570a77158335ef364d4a48a5f';
const html=fs.readFileSync(path.join(root,'vt03/kt80/KT134_PDF1_ISOLATED_REGRESSION_TEST.html'),'utf8');
const refs=[...html.matchAll(/<(script|link)\b[^>]*?\b(src|href)=["']([^"']+)["']/g)]
 .map(m=>({tag:m[1],ref:m[3]}))
 .filter(x=>!/^https?:\/\//i.test(x.ref)&&!x.ref.startsWith('#')&&(x.tag==='script'||/\.css(?:\?|$)/i.test(x.ref)));
assert.equal(refs.length,91,'Unexpected resource count; update parity manifest after reviewing changes');
const isKt134=x=>x.ref.includes('KT134_')||x.ref.includes('KT134/');
const isPinned=x=>x.ref.includes('KT134_PINNED_');
const productionRefs=refs.filter(x=>!isKt134(x)&&!isPinned(x));
const differences=[];
for(const {ref} of productionRefs){
 const resolved=path.normalize(path.join('vt03/kt80',ref.split(/[?#]/)[0])).replaceAll(path.sep,'/');
 if(resolved.startsWith('..')||path.isAbsolute(resolved))throw Error('Unsafe path '+ref);
 const local=fs.readFileSync(path.join(root,resolved));
 const pinned=cp.spawnSync('git',['show',commit+':'+resolved],{cwd:root,maxBuffer:40*1024*1024,encoding:'buffer'});
 if(pinned.status!==0)throw Error('Cannot inspect pinned production source: '+resolved+
  ' (ensure the pinned commit is fetched and accessible)');
 if(!local.equals(pinned.stdout))differences.push(resolved);
}
assert.deepEqual(differences,[],'Production-pinned resources diverge from integration branch; inspect and pin explicitly: '+
 differences.join(', '));
console.log('KT134: '+productionRefs.length+' of 91 resources byte-identical to general production pin, plus 5 separately pinned scripts and two KT134 additions');
