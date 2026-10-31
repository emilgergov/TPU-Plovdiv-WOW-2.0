'use strict';
// KT21.1: actual Chromium generation of the institutional Classic DOCX.
// No synthetic document renderer, no AI service, no user interaction.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:8765/v26-test/kt15-6/index.html',{waitUntil:'domcontentloaded'});
  await page.addScriptTag({path:require.resolve('fflate/umd')});
  const result=await page.evaluate(async()=>{
   const paragraphs=['Изграждане на складове и офиси.','Електрозахранване от мрежата.','Водоснабдяване от обществената мрежа.','Отпадъчни води към водоплътно съоръжение.'];
   try{
    const blob=await window.V26TemplateWord.make('A',paragraphs,{subject:'Изграждане на складове и офиси',recipient:'Примерен възложител',address:'гр. Пловдив',incomingReference:'ОВОС-9999 / 99.99.9999',salutation:'Уважаеми господине'});
    const bytes=new Uint8Array(await blob.arrayBuffer());
    const entries=window.fflate.unzipSync(bytes);
    const xml=new TextDecoder().decode(entries['word/document.xml']||new Uint8Array());
    return {ok:true,size:bytes.length,zip:bytes[0]===80&&bytes[1]===75,document:!!entries['word/document.xml'],header:Object.keys(entries).some(k=>/^word\\/header/.test(k)),footer:Object.keys(entries).some(k=>/^word\\/footer/.test(k)),hasContent:paragraphs.some(p=>xml.includes(p))};
   }catch(e){return {ok:false,error:String(e.message||e)}}
  });
  assert(result.ok,JSON.stringify(result));
  assert(result.size>1000&&result.zip&&result.document&&result.header&&result.footer&&result.hasContent,JSON.stringify(result));
  console.log('PASS KT21.1: real original-template Classic DOCX generated in Chromium',result.size);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
