'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const fflate=require('fflate');
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<!doctype html><html><body></body></html>');
const root=dom.window;root.fflate=fflate;
const fetchTemplate=async path=>({ok:true,arrayBuffer:async()=>fs.readFileSync('expert-v26/'+path)});
vm.runInNewContext(fs.readFileSync('expert-v26/v26-template-word.js','utf8'),{
 window:root,document:root.document,fetch:fetchTemplate,DOMParser:root.DOMParser,
 XMLSerializer:root.XMLSerializer,TextDecoder,TextEncoder,Blob,Uint8Array
},{filename:'v26-template-word.js'});
const id='99999.999.9999';
const metadata={recipient:'Тестов адресат',address:'Тестов адрес',subject:'Тестов предмет на ИП',incomingReference:'Тестов входящ номер',salutation:'Уважаеми госпожи и господа',parcelIds:id,legalParagraphs:Array(7).fill('ЗА ЕКСПЕРТНА ПРОВЕРКА — тестова констатация'),procedureFinding:'ЗА ЕКСПЕРТНА ПРОВЕРКА — тестова процедура',impactFindings:Array(5).fill('ЗА ЕКСПЕРТНА ПРОВЕРКА — тестово въздействие')};
const paragraphs=['С реализацията на тестовото ИП','Електроснабдяването — тест','Водоснабдяването — тест','Отпадъчните води — тест'];
(async()=>{for(const scenario of ['A','B']){
 const blob=await root.V26TemplateWord.make(scenario,paragraphs,metadata);
 const archive=fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
 assert(archive['word/document.xml'],'Missing DOCX XML');
 const xml=new TextDecoder().decode(archive['word/document.xml']);
 assert(xml.includes(id),'Confirmed parcel missing');
 assert(xml.includes(metadata.subject),'Confirmed subject missing');
 assert(!xml.includes('Относно: Относно:'),'Duplicate subject prefix');
 console.log('PASS: real original template '+scenario+' generated and contains confirmed subject and parcel');
 }} )().catch(e=>{console.error('FAIL real DOCX template smoke:',e.message);process.exitCode=1});
