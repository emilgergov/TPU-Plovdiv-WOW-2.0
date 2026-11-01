const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync(__dirname+'/v26-draft-package.js','utf8');
assert.ok(src.includes('if(includeAnnex2){const pdf2='),'existing optional PDF2 behavior must remain');
assert.ok(src.includes('const actualFiles=z.names()'),'ZIP manifest must be inspected');
assert.ok(src.includes('actualFiles.length!==packageFiles.length'),'ZIP must reject missing or extra files');
const code=src.slice(src.indexOf('function zipWriter(){'),src.indexOf('function scenarioFromGIS('));
const ctx=vm.createContext({TextEncoder,Uint8Array,Uint32Array,Blob,ArrayBuffer,Error,Map,Set,String});
vm.runInContext(code,ctx);
(async()=>{
 const files=['01_Proekt_na_stanovishte_Klasicheski.docx','02_Proekt_na_stanovishte_Eksperten.docx','03_Prilozhenie_1_GIS_analiz.pdf','04_Prilozhenie_2_Normativni_i_dokumentalni_referencii.pdf','README_BG.txt'];
 const z=ctx.zipWriter();for(const name of files)z.file(name,new Blob(['TEST']));
 assert.equal(z.names().length,5);
 assert.equal((await z.generateAsync()).type,'application/zip');
 const invalid=ctx.zipWriter();for(const name of files)invalid.file(name,new Blob(['TEST']));invalid.file('extra.txt','x');
 assert.equal(invalid.names().length,6);
 console.log('V27.1 P9 ZIP manifest regression: PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
