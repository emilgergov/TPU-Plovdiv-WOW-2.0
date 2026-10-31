'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:8765/v26-test/kt15-6/index.html');
  const outcome=await page.evaluate(async()=>{
   const id='99999.999.9999';
   const result={input:id,status:'Намерен',intersection_verified_outside:true,verified_zone_intersections:[],geojson:{features:[{geometry:{type:'Polygon',coordinates:[[[24,42],[25,42],[25,43],[24,42]]]}}]}};
   const register={includeAnnex2:true,unifiedContext:{commonEvidence:{findings:[],warnings:[]}},verifiedCharacterizationParagraphs:['С реализацията на инвестиционното предложение се предвижда обект.','Електроснабдяването е от мрежата.','Водоснабдяването е от мрежата.','Отпадъчните води се събират.'],verifiedCaseMetadata:{subject:'Примерен обект',recipient:'Примерен възложител',location:'гр. Пловдив'}};
   try{const zip=await window.V26DraftPackage.make([result],{[id]:'leading'},register);return {ok:true,size:zip.size,bytes:Array.from(new Uint8Array(await zip.arrayBuffer()))}}catch(e){return {ok:false,error:String(e)}}
  });
  assert(outcome.ok,JSON.stringify(outcome).slice(0,500));
  const bytes=Buffer.from(outcome.bytes);assert(bytes.length>5000);assert.equal(bytes.toString('ascii',0,2),'PK');
  for(const name of ['01_Proekt_na_stanovishte_Klasicheski.docx','02_Proekt_na_stanovishte_Eksperten.docx','03_Prilozhenie_1_GIS_analiz.pdf','04_Prilozhenie_2_Normativni_i_dokumentalni_referencii.pdf','README_BG.txt'])assert(bytes.includes(Buffer.from(name)),name);
  console.log('PASS KT21.4 full browser package',bytes.length);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
