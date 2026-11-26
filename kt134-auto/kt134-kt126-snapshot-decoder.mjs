/**
 * Decode the exact KT126 native browser snapshot compression format.
 * Original persisted workflow data is never rewritten or logged.
 * Guard against decompression bombs and malformed state envelopes.
 */
const MAX_BYTES=10_000_000;
const fail=code=>{const e=new Error(code);e.code=code;throw e;};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
export async function decodeKt126StoredSnapshot(saved,{limit=MAX_BYTES}={}){
 if(!object(saved))fail('KT126_WORKFLOW_SNAPSHOT_MISSING');
 if(saved.format!=='KT126-GZIP-1')return saved;
 if(typeof saved.payload!=='string'||saved.payload.length>12_000_000||
    saved.payload.length%4!==0||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(saved.payload))
   fail('KT126_WORKFLOW_COMPRESSED_PAYLOAD_INVALID');
 let bytes;
 try{bytes=Uint8Array.from(atob(saved.payload),c=>c.charCodeAt(0))}
 catch{fail('KT126_WORKFLOW_COMPRESSED_PAYLOAD_INVALID')}
 if(bytes.length<18||bytes[0]!==0x1f||bytes[1]!==0x8b)
   fail('KT126_WORKFLOW_GZIP_HEADER_INVALID');
 if(typeof DecompressionStream!=='function')
   fail('KT126_WORKFLOW_DECOMPRESSION_UNAVAILABLE');
 let decompressed;
 try{
  const reader=new Blob([bytes]).stream().pipeThrough(
   new DecompressionStream('gzip')).getReader();
  const parts=[];let total=0;
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   total+=value.byteLength;
   if(total>limit){await reader.cancel();fail('KT126_WORKFLOW_DECOMPRESSED_TOO_LARGE')}
   parts.push(value);
  }
  const combined=new Uint8Array(total);let offset=0;
  for(const part of parts){combined.set(part,offset);offset+=part.length}
  decompressed=new TextDecoder('utf-8',{fatal:true}).decode(combined);
 }catch(e){
  if(e?.code)throw e;
  fail('KT126_WORKFLOW_DECOMPRESSION_FAILED');
 }
 let result;
 try{result=JSON.parse(decompressed)}catch{fail('KT126_WORKFLOW_JSON_INVALID')}
 if(!object(result)||!object(result.state))
   fail('KT126_WORKFLOW_SNAPSHOT_INVALID');
 return result;
}
