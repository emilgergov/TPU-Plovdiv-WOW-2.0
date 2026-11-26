import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeKt126StoredSnapshot as decode} from './kt134-kt126-snapshot-decoder.mjs';
const snapshot={state:{intake:{document_texts:[{source:'original-1.pdf',text:'Документ с реални обстоятелства.'}]}},values:{kt80SubjectText:'Предмет'},globals:{KT80DossierAudit:{filesExpected:1}}};
async function compressed(v){
 const bytes=await new Blob([JSON.stringify(v)]).stream().pipeThrough(new CompressionStream('gzip')).arrayBuffer();
 return {format:'KT126-GZIP-1',payload:btoa(String.fromCharCode(...new Uint8Array(bytes)))};
}
test('KT126-GZIP-1 packed native snapshot restores authentic intake text and values',async()=>{
 const stored=await compressed(snapshot);
 assert.deepEqual(await decode(stored),snapshot);
});
test('unpacked native snapshot remains intact',async()=>assert.equal(await decode(snapshot),snapshot));
test('unsupported or missing GZIP header is blocked',async()=>{
 await assert.rejects(()=>decode({format:'KT126-GZIP-1',payload:btoa('fake-gzip-header')}),/KT126_WORKFLOW_GZIP_HEADER_INVALID/);
});
test('compressed snapshot bomb cannot exceed the maximum decoded size',async()=>{
 const packed=await compressed({state:{intake:{document_texts:[{source:'x.pdf',text:'A'.repeat(50000)}]}}});
 await assert.rejects(()=>decode(packed,{limit:2048}),/KT126_WORKFLOW_DECOMPRESSED_TOO_LARGE/);
});
test('unknown envelope cannot masquerade as confirmed snapshot',async()=>{
 await assert.rejects(()=>decode({format:'KT126-GZIP-1',payload:'garbage'}),/KT126_WORKFLOW_COMPRESSED_PAYLOAD_INVALID/);
});
