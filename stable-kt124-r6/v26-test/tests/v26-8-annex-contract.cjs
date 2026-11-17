'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('v26-test/v26-draft-package.js','utf8');
const injected=source.replace('window.V26DraftPackage=Object.freeze({make,standalonePDF});','window.__annexQA={gisPdf,normativePdf,verifiedPlaceLabel};window.V26DraftPackage=Object.freeze({make,standalonePDF});');
assert.notEqual(injected,source,'Annex QA entrypoint must exist');
const ctx={window:{V26SubjectContext:null}};vm.runInNewContext(injected,ctx);
const {gisPdf,normativePdf,verifiedPlaceLabel}=ctx.window.__annexQA;
const id='36676.129.457',geojson={features:[{geometry:{type:'Polygon',coordinates:[[[1,1],[2,1],[2,2],[1,2],[1,1]]]}}]};
const base={input:id,status:'Намерен',geojson,area_m2_source:450,archived_zones:['BG0002057']};
const textOf=d=>JSON.stringify(d.content);
const loc={location:'община Родопи',settlement:'с. Марково',landArea:'землище Марково'};
const a=gisPdf([{...base,intersection_verified_outside:true}],{verifiedCaseMetadata:loc});
assert.match(textOf(a),/Няма пресечена защитена зона/);
assert.doesNotMatch(textOf(a),/Архивни сведения \(непотвърдено пресичане\)/);
assert.match(textOf(a),/с\. Марково/);
assert.match(textOf(a),/Землище/);
const unknown=gisPdf([base],{verifiedCaseMetadata:{settlement:'Марково'}});
assert.match(textOf(unknown),/Архивни сведения \(непотвърдено пресичане\)/);
assert.doesNotMatch(textOf(unknown),/Населено място/);
assert.equal(verifiedPlaceLabel('гр. Пловдив'),'гр. Пловдив');
assert.equal(verifiedPlaceLabel('Марково'),'');
const b=normativePdf([{...base,verified_zone_intersections:['BG0002057']}],{verifiedCaseMetadata:loc,records:[
 {id:'R1',title:'Закон за биологичното разнообразие',source:'https://example.org/legal-1'},
 {id:'R2',title:'Закон за биологичното разнообразие',source:'https://example.org/legal-2'},
 ...Array.from({length:6},(_,i)=>({id:'Z'+i,title:'Заповед за защитена зона BG0002057 №'+i,zone_code:'BG0002057',source:'https://example.org/zone-'+i}))
]});
const body=textOf(b);
assert.match(body,/с\. Марково/);
assert(body.includes('https://example.org/legal-1'));
assert(body.includes('https://example.org/legal-2'));
for(let i=0;i<6;i++)assert(body.includes('https://example.org/zone-'+i),'Documentary reference omitted: '+i);
console.log('PASS: GIS verified-vs-archival zone, city/village labels, land area and all PDF2 sources');
