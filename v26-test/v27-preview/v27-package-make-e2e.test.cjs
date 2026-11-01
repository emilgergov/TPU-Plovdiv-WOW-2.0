const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync(__dirname+'/v26-draft-package.js','utf8');
const zip=src.slice(src.indexOf('function zipWriter(){'),src.indexOf('function scenarioFromGIS('));
const make=src.slice(src.indexOf('async function make(results,roles,register){'),src.indexOf('async function standalonePDF('));
const ids=['56784.13.102','56784.13.105','56784.13.106'];
const results=ids.map((id,i)=>({input:id,cadnum:id,status:'Намерен',intersection_verified_outside:true,geojson:{features:[{geometry:{type:'Polygon',coordinates:[[[i,0],[i+0.5,0],[i+0.5,0.5],[i,0.5],[i,0]]]}}]}}));
const roles=Object.fromEntries(ids.map((id,i)=>[id,i?'ancillary':'leading']));
const calls={classic:0,expert:0,pdf1:0,pdf2:0};
const pdf=()=>new Blob([Buffer.from('%PDF-1.4\n'),Buffer.alloc(120,32),Buffer.from('\n%%EOF')]);
const doc=()=>new Blob([Buffer.from([0x50,0x4b,0x03,0x04]),Buffer.alloc(120,65)]);
const window={
 V26TemplateWord:{make:async()=>{calls.classic++;return doc()}},
 V26ExpertWord:{make:async(_draft,options)=>{calls.expert++;assert.match(options.mapSvg,/56784.13.106/);return doc()}},
 V26ExpertDraft:{build:()=>({scenario:'А',characterization:['С реализацията тест','Електроснабдяването тест','Водоснабдяването тест','Отпадъчните води тест'],metadata:{}})},
 V27MultiParcelMap:{build:rs=>'<svg>'+rs.map(r=>r.input).join(',')+'</svg>'}
};
const ctx=vm.createContext({window,TextEncoder,TextDecoder,Uint8Array,Uint32Array,Blob,ArrayBuffer,Error,Map,Set,String,URL,Buffer,
 scenarioFromGIS:()=>({scenario:'А',zones:[]}),
 verifiedPlaceLabel:()=>true,
 ensurePDF:async()=>{},
 gisPdf:()=>{calls.pdf1++;return{}},
 normativePdf:()=>{calls.pdf2++;return{}},
 pdfBlob:async()=>pdf()});
vm.runInContext(zip+make,ctx);
(async()=>{
 const blob=await ctx.make(results,roles,{v27Package:true,unifiedContext:{commonEvidence:{findings:[],warnings:[]}},verifiedCharacterizationParagraphs:['С реализацията тест','Електроснабдяването тест','Водоснабдяването тест','Отпадъчните води тест']});
 assert.ok(blob.size>300);
 assert.deepEqual(calls,{classic:1,expert:1,pdf1:1,pdf2:1});
 const bytes=Buffer.from(await blob.arrayBuffer()),names=ids.map(id=>Buffer.from(id));
 assert.equal(bytes.readUInt32LE(bytes.length-22),0x06054b50);
 assert.equal(bytes.readUInt16LE(bytes.length-12),5);
 for(const filename of ['01_Proekt_na_stanovishte_Klasicheski.docx','02_Proekt_na_stanovishte_Eksperten.docx','03_Prilozhenie_1_GIS_analiz.pdf','04_Prilozhenie_2_Normativni_i_dokumentalni_referencii.pdf','README_BG.txt'])assert.ok(bytes.includes(Buffer.from(filename)),filename);
 console.log('V27.1 P10 make() integration: 3 parcels, 2 Word, 2 PDF, README, ZIP PASS (mock document renderers)');
})().catch(e=>{console.error(e);process.exitCode=1});
