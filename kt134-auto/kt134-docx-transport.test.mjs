import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeKt134Docx} from './kt134-docx-transport.mjs';
test('KT134 preserves large DOCX binary exactly across chunk boundaries',()=>{
  for(const n of [100,8190,8191,8192,16381,16383,16384,99873,257041]){
    const bytes=Uint8Array.from({length:n},(_,i)=>(i*37+i%11)%256);
    const text=encodeKt134Docx(bytes);
    const restored=Uint8Array.from(atob(text),c=>c.charCodeAt(0));
    assert.deepEqual(restored,bytes,'binary length '+n);
    assert.equal(text,Buffer.from(bytes).toString('base64'));
  }
});
test('KT134 refuses empty or ungenerated Word',()=>{
 assert.throws(()=>encodeKt134Docx(new Uint8Array(99)),/KT134_WORD_NOT_GENERATED/);
 assert.throws(()=>encodeKt134Docx(null),/KT134_WORD_NOT_GENERATED/);
});
