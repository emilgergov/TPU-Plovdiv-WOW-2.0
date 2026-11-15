'use strict';
// KT19.9: ZIP packaging of already-rendered, expert-approved document bytes.
const {deflateRawSync}=require('node:zlib');
const REQUIRED=['GIS_Analysis.pdf','Normative_References.pdf','Classic_Draft.docx','Expert_Draft.docx'];
const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(b){let c=0xffffffff;for(const x of b)c=crcTable[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function makeZip(files){
 const local=[],central=[];let offset=0;
 for(const [name,value] of Object.entries(files)){
  if(!/^[A-Za-z0-9_.-]+$/.test(name))throw Error('Unsafe ZIP entry name');
  const data=Buffer.isBuffer(value)?value:Buffer.from(value);
  if(!data.length||data.length>50*1024*1024)throw Error('Invalid file size');
  const filename=Buffer.from(name),compressed=deflateRawSync(data),crc=crc32(data);
  const head=Buffer.alloc(30);head.writeUInt32LE(0x04034b50);head.writeUInt16LE(20,4);head.writeUInt16LE(0,6);head.writeUInt16LE(8,8);head.writeUInt32LE(crc,14);head.writeUInt32LE(compressed.length,18);head.writeUInt32LE(data.length,22);head.writeUInt16LE(filename.length,26);
  const directory=Buffer.alloc(46);directory.writeUInt32LE(0x02014b50);directory.writeUInt16LE(20,4);directory.writeUInt16LE(20,6);directory.writeUInt16LE(0,8);directory.writeUInt16LE(8,10);directory.writeUInt32LE(crc,16);directory.writeUInt32LE(compressed.length,20);directory.writeUInt32LE(data.length,24);directory.writeUInt16LE(filename.length,28);directory.writeUInt32LE(offset,42);
  local.push(head,filename,compressed);central.push(directory,filename);offset+=head.length+filename.length+compressed.length;
 }
 const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(central.length/2,8);end.writeUInt16LE(central.length/2,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...local,directory,end]);
}
function buildPackage(approvedPayload,rendered){
 if(!approvedPayload||approvedPayload.ready!==true||approvedPayload.schema!=='KT19_7_WORD_PAYLOAD_V1')throw Error('Expert-approved Word payload required');
 const files={};
 for(const name of REQUIRED){const bytes=rendered&&rendered[name];if(!Buffer.isBuffer(bytes)||bytes.length<8)throw Error('Missing rendered file: '+name);files[name]=bytes;}
 for(const name of REQUIRED.slice(0,2))if(files[name].subarray(0,5).toString()!=='%PDF-')throw Error('Invalid PDF: '+name);
 for(const name of REQUIRED.slice(2))if(files[name].subarray(0,2).toString()!=='PK')throw Error('Invalid DOCX: '+name);
 files['README.txt']=Buffer.from('TPU Plovdiv - WOW V26\\nExample dossier: '+approvedPayload.dossierId+'\\nExpert review: '+approvedPayload.approvedBy+'\\nDocuments are drafts for expert verification.\\n','utf8');
 return makeZip(files);
}
module.exports={buildPackage,makeZip,REQUIRED};
