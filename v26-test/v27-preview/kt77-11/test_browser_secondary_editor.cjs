/* KT77-11.4: actual browser module on both binary DOCX specimens in Node.
 * Dependencies are test-only (fflate, @xmldom/xmldom); no production dependency changes.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {DOMParser,XMLSerializer}=require('@xmldom/xmldom');
const fflate=require('fflate');
global.window=global;
global.DOMParser=DOMParser;
global.XMLSerializer=XMLSerializer;
global.fflate=fflate;
global.document={baseURI:'https://example.test/v26-test/'};
const dir=path.resolve(__dirname,'../etalon');
const bytes=p=>new Uint8Array(fs.readFileSync(path.join(dir,p)));
global.fetch=async url=>{
 const fn=String(url).split('/').pop();
 if(!['KT35-A.docx','KT39-B.docx'].includes(fn))return {ok:false,status:404};
 const data=bytes(fn);
 return {ok:true,arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)};
};
require('./kt77-11-4-browser-secondary-editor.js');
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const DOC='01_Proekt_na_stanovishte_Klasicheski.docx';
const paras=xml=>{
 const d=new DOMParser().parseFromString(new TextDecoder().decode(xml),'application/xml');
 const body=d.getElementsByTagNameNS(W,'body')[0];
 return {doc:d,ps:Array.from(body.childNodes).filter(x=>x.nodeType===1&&x.namespaceURI===W&&x.localName==='p')};
};
const ts=p=>Array.from(p.getElementsByTagNameNS(W,'t'));
const ptxt=p=>ts(p).map(t=>t.textContent||'').join('');
const cadastral=/\b\d{5}\.\d+\.\d+\b/u;
const toBuffer=u8=>Buffer.from(u8.buffer,u8.byteOffset,u8.byteLength);
const unchanged=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
async function test(mode){
 const source=bytes(mode==='A'?'KT35-A.docx':'KT39-B.docx');
 const original=fflate.unzipSync(source);
 const {doc,ps}=paras(original['word/document.xml']);
 assert.equal(ps.length,mode==='A'?41:43);
 let target=null;
 for(const i of [11,19,20,21,22,23,24,7,8,17]){
  const candidates=ts(ps[i-1]).filter(t=>cadastral.test(t.textContent||''));
  for(const t of candidates){
   const m=(t.textContent||'').match(cadastral);
   if(m&&ptxt(ps[i-1]).split(m[0]).length===2){target={i,t,old:m[0]};break;}
  }
  if(target)break;
 }
 assert.ok(target,'There must be one unique cadastral ID inside an allowed run of the actual original Word');
 const val='99999.888.777';
 target.t.textContent=target.t.textContent.replace(target.old,val);
 const changed=Buffer.from(new XMLSerializer().serializeToString(doc),'utf8');
 const primaryWord=fflate.zipSync({...original,'word/document.xml':changed});
 const other={
  '02_Proekt_na_stanovishte_Eksperten.docx':new Uint8Array([1,2,3]),
  '03_GIS_analiz.pdf':new Uint8Array([4,5,6]),
  '04_Normativni_i_dokumentalni_referencii.pdf':new Uint8Array([7,8,9]),
  'README_BG.txt':new TextEncoder().encode('TEST')
 };
 const primaryZip=fflate.zipSync({[DOC]:primaryWord,...other});
 const allIds=[...new Set(ps.map(ptxt).join(' ').match(/\b\d{5}\.\d+\.\d+\b/g)||[])];
 const quote='Имотът с идентификатор '+val+' се намира в преписката.';
 const patch={paragraph:target.i,kind:'parcel_id',template_literal:target.old,value:val,
  source_file:'source.txt',source_quote:quote};
 const opts={scenario:mode,patches:[patch],evidence:[{source_file:'source.txt',text:quote}]};
 const built=await global.KT7711SecondaryEditor.transform(new Blob([primaryZip]),opts);
 assert.equal(built.report.status,'PASS');
 assert.deepEqual(built.report.changedParagraphs,[target.i]);
 const final=fflate.unzipSync(new Uint8Array(await built.blob.arrayBuffer()));
 for(const [fn,b] of Object.entries(other))assert.ok(unchanged(final[fn],b),'Untouched ZIP member changed: '+fn);
 const outputWord=fflate.unzipSync(final[DOC]),{ps:outp}=paras(outputWord['word/document.xml']);
 assert.equal(outp.length,ps.length);
 assert.equal(ptxt(outp[target.i-1]),ptxt(ps[target.i-1]));
 const orig={ps:original['word/document.xml']};
 const baseline=paras(orig.ps).ps;
 for(let j=0;j<outp.length;j++)if(j!==target.i-1)assert.equal(ptxt(outp[j]),ptxt(baseline[j]));
 for(const k of Object.keys(original))if(k!=='word/document.xml')assert.ok(unchanged(outputWord[k],original[k]),'DOCX resource modified: '+k);
 await assert.rejects(()=>global.KT7711SecondaryEditor.transform(new Blob([primaryZip]),{...opts,evidence:[]}),/доказателства/);
 await assert.rejects(()=>global.KT7711SecondaryEditor.transform(new Blob([primaryZip]),{...opts,patches:[{...patch,kind:'legal_conclusion'}]}),/забранен/);
 console.log('PASS: '+mode+' — real DOCX opened and regenerated with one sourced original-run substitution; 41/43 structure and 4 other ZIP members unchanged');
}
(async()=>{for(const mode of ['A','B'])await test(mode);})().catch(e=>{console.error(e);process.exitCode=1;});
