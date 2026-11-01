const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync(__dirname+'/v26-draft-package.js','utf8');
const zipCode=src.slice(src.indexOf('function zipWriter(){'),src.indexOf('function scenarioFromGIS('));
const ctx=vm.createContext({TextEncoder,Uint8Array,Uint32Array,Blob,ArrayBuffer,Error,Map,Set,String});
vm.runInContext(zipCode,ctx);
const files=['01_Proekt_na_stanovishte_Klasicheski.docx','02_Proekt_na_stanovishte_Eksperten.docx','03_Prilozhenie_1_GIS_analiz.pdf','04_Prilozhenie_2_Normativni_i_dokumentalni_referencii.pdf','README_BG.txt'];
const crc32=b=>{let c=0xffffffff;for(const x of b){c^=x;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0)}return(c^0xffffffff)>>>0};
function inspectZip(buffer){
 const b=Buffer.from(buffer),read16=o=>b.readUInt16LE(o),read32=o=>b.readUInt32LE(o);
 const eocd=b.length-22;assert.equal(read32(eocd),0x06054b50);
 const count=read16(eocd+10),size=read32(eocd+12),start=read32(eocd+16);
 assert.equal(count,5);assert.equal(start+size,eocd);
 let pos=start;const entries=[];
 for(let i=0;i<count;i++){
  assert.equal(read32(pos),0x02014b50);
  const crc=read32(pos+16),length=read32(pos+20),nameLen=read16(pos+28),extra=read16(pos+30),comment=read16(pos+32),offset=read32(pos+42);
  const name=b.subarray(pos+46,pos+46+nameLen).toString('utf8');
  assert.equal(read32(offset),0x04034b50);
  const dataStart=offset+30+read16(offset+26)+read16(offset+28);
  const data=b.subarray(dataStart,dataStart+length);
  assert.equal(data.length,length);assert.equal(crc32(data),crc,'CRC mismatch: '+name);
  entries.push({name,data});
  pos+=46+nameLen+extra+comment;
 }
 assert.equal(pos,eocd);return entries;
}
(async()=>{
 const z=ctx.zipWriter();
 const docx=Buffer.from('PK\x03\x04DOCX fixture UTF-8 тест');
 const pdf=Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
 for(const name of files)z.file(name,new Blob([name.endsWith('.docx')?docx:name.endsWith('.pdf')?pdf:Buffer.from('РАБОТЕН ПАКЕТ\n')]));
 const blob=await z.generateAsync(),entries=inspectZip(await blob.arrayBuffer());
 assert.deepEqual(entries.map(e=>e.name),files);
 assert.equal(entries.filter(e=>e.name.endsWith('.docx')&&e.data.subarray(0,2).toString()==='PK').length,2);
 assert.equal(entries.filter(e=>e.name.endsWith('.pdf')&&e.data.subarray(0,4).toString()==='%PDF').length,2);
 assert.match(entries[4].data.toString('utf8'),/РАБОТЕН ПАКЕТ/);
 console.log('V27.1 ZIP binary structure: 5 entries, CRC32, PDF/DOCX signatures, UTF-8 PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
