'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:8765/v26-test/kt15-6/index.html');
  // GitHub Pages can load the ZIP UMD dependency separately; reproduce that in Chromium.
  await page.addScriptTag({path:path.join(path.dirname(require.resolve('fflate')),'../umd/index.js')});
  const outcome=await page.evaluate(async()=>{
   const id='99999.999.9999';
   const result={input:id,status:'Намерен',intersection_verified_outside:true,verified_zone_intersections:[],geojson:{features:[{geometry:{type:'Polygon',coordinates:[[[24,42],[25,42],[25,43],[24,42]]]}}]}};
   const register={mapSvg:'<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400"><rect width="640" height="400" fill="#fff"/><path d="M100 80 L530 80 L460 310 L100 80" fill="#d9e9d8" stroke="#176b37" stroke-width="5"/></svg>',includeAnnex2:true,unifiedContext:{commonEvidence:{findings:[],warnings:[]}},verifiedCharacterizationParagraphs:['С реализацията на инвестиционното предложение се предвижда обект.','Електроснабдяването е от мрежата.','Водоснабдяването е от мрежата.','Отпадъчните води се събират.'],verifiedCaseMetadata:{subject:'Примерен обект',recipient:'Примерен възложител',address:'гр. Пловдив',incomingReference:'ОВОС-9999 / 99.99.9999',salutation:'Уважаеми господине',location:'гр. Пловдив',legalParagraphs:['Правна проверка 1','Правна проверка 2','Правна проверка 3','Правна проверка 4','Правна проверка 5'],procedureFinding:'Процедурна проверка',impactFindings:['Въздействие 1','Въздействие 2','Въздействие 3','Въздействие 4','Въздействие 5']}};
   try{const zip=await window.V26DraftPackage.make([result],{[id]:'leading'},register);return {ok:true,size:zip.size,bytes:Array.from(new Uint8Array(await zip.arrayBuffer()))}}catch(e){return {ok:false,error:String(e)}}
  });
  assert(outcome.ok,JSON.stringify(outcome).slice(0,500));
  const bytes=Buffer.from(outcome.bytes);assert(bytes.length>5000);assert.equal(bytes.toString('ascii',0,2),'PK');
  for(const name of ['01_Proekt_na_stanovishte_Klasicheski.docx','02_Proekt_na_stanovishte_Eksperten.docx','03_Prilozhenie_1_GIS_analiz.pdf','04_Prilozhenie_2_Normativni_i_dokumentalni_referencii.pdf','README_BG.txt'])assert(bytes.includes(Buffer.from(name)),name);
  console.log('PASS KT21.4 full browser package',bytes.length);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
