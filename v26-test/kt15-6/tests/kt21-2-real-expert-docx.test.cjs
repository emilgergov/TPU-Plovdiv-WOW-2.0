'use strict';
// KT21.2: actual expert Word export in Chromium with embedded overview map.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:8765/v26-test/kt15-6/index.html',{waitUntil:'domcontentloaded'});
  await page.addScriptTag({path:path.join(path.dirname(require.resolve('fflate')),'../umd/index.js')});
  const result=await page.evaluate(async()=>{
   try{
    if(!window.V26ExpertWord?.make)throw Error('Expert Word renderer missing');
    const draft={
     schema:'KT13_EXPERT_DRAFT_V1',scenario:'А',zones:[],
     metadata:{recipient:'Примерен възложител',address:'гр. Пловдив',subject:'Изграждане на складове и офиси',incomingReference:'ОВОС-9999 / 99.99.9999',salutation:'Уважаеми господине',location:'гр. Пловдив, община Пловдив, област Пловдив',legalParagraphs:['Правна проверка 1','Правна проверка 2','Правна проверка 3','Правна проверка 4','Правна проверка 5'],procedureFinding:'Процедурна проверка',impactFindings:['Въздействие 1','Въздействие 2','Въздействие 3','Въздействие 4','Въздействие 5']},
     parcels:[{id:'56784.13.102',role:'leading'}],
     characterization:['Строителни дейности','Електроснабдяване','Водоснабдяване','Отпадъчни води'],
     authoredText:'Първи авторски абзац.\n\nВтори авторски абзац.',
     evidence:{findingsCount:1,warningsCount:0}
    };
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="400" height="200" fill="white"/><path d="M30 30 L300 30 L300 150 L30 150 Z" fill="#d6e8dc" stroke="#276747"/></svg>';
    const blob=await window.V26ExpertWord.make(draft,svg);
    const bytes=new Uint8Array(await blob.arrayBuffer());
    const entries=window.fflate.unzipSync(bytes);
    const dec=new TextDecoder(),xml=dec.decode(entries['word/document.xml']||new Uint8Array());
    const rels=dec.decode(entries['word/_rels/document.xml.rels']||new Uint8Array());
    const map=entries['word/media/v26-gis-overview.png'];
    const xmlDoc=new DOMParser().parseFromString(xml,'application/xml');
    return {ok:true,size:bytes.length,zip:bytes[0]===80&&bytes[1]===75,
      validXml:!xmlDoc.getElementsByTagName('parsererror').length,
      mapPng:!!map&&map.length>1000&&map[0]===137&&map[1]===80,
      mapLinked:rels.includes('rIdV26Map')&&xml.includes('rIdV26Map'),
      header:Object.keys(entries).some(k=>/^word\\/header/.test(k)),
      footer:Object.keys(entries).some(k=>/^word\\/footer/.test(k)),
      signatures:(xml.match(/Място за електронен подпис/g)||[]).length===2,
      authorParagraphs:xml.includes('Първи авторски абзац.')&&xml.includes('Втори авторски абзац.'),
      gisCaption:xml.includes('Фигура 1. Пространствено положение'),
      source:xml.includes('Източник: ГИС анализ'),
      subject:xml.includes('56784.13.102')};
   }catch(e){return {ok:false,error:String(e.stack||e)}}
  });
  assert(result.ok,JSON.stringify(result));
  for(const key of ['zip','validXml','mapPng','mapLinked','header','footer','signatures','authorParagraphs','gisCaption','source','subject'])assert(result[key],key+': '+JSON.stringify(result));
  console.log('PASS KT21.2: real expert DOCX with GIS PNG, institutional shell and signature slots',result.size);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
