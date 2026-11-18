import {scrypt,timingSafeEqual,randomBytes} from 'node:crypto';
// OWASP's 32 MiB scrypt configuration. Fixed parameters prevent work-factor
// injection from a damaged database. No fall-back to a fast password hash.
const N=32768,r=8,p=3,maxmem=64*1024*1024;
let busy=false;
async function derive(password,salt){
 if(busy)throw Error('PASSWORD_SERVICE_BUSY');busy=true;
 try{return await new Promise((resolve,reject)=>scrypt(password,salt,32,{N,r,p,maxmem},(e,key)=>e?reject(e):resolve(key)))}finally{busy=false}
}
export const passwordValid=pw=>typeof pw==='string'&&pw.length>=12&&pw.length<=128&&!pw.includes('\0');
export async function hashPassword(password){
 if(!passwordValid(password))throw Error('INVALID_PASSWORD');
 const salt=randomBytes(16).toString('hex');const key=await derive(password,salt);
 return `scrypt$32768$8$3$${salt}$${key.toString('hex')}`;
}
export async function verifyPassword(password,encoded){
 if(typeof password!=='string'||password.length>128)return false;
 const match=/^scrypt\$32768\$8\$3\$([a-f0-9]{32})\$([a-f0-9]{64})$/.exec(encoded||'');
 // Unknown users take the same KDF path; this dummy digest grants nothing.
 const salt=match?.[1]||'00000000000000000000000000000000';
 const actual=await derive(password,salt);
 const expected=Uint8Array.from((match?.[2]||'0'.repeat(64)).match(/../g),h=>parseInt(h,16));
 return timingSafeEqual(actual,expected)&&Boolean(match);
}
