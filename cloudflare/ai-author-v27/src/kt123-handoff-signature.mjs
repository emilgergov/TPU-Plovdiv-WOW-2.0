// KT123 case-bound integrity token: the expert may edit reasoning, never the
// underlying source-anchored qualification or chosen procedural direction.
// Uses a server-only secret; no credential or raw dossier is returned.
const encoder=new TextEncoder();
const payload=(q,data)=>JSON.stringify({
 version:"KT123_SOURCE_QUALIFICATION_V1",
 caseId:String(data.caseId||""),
 evidenceRevision:String(data.evidenceRevision??""),
 subject:String(data.subject||""),
 scope:String(data.scope||""),
 qualification:q
});
function keyBytes(secret){return encoder.encode("WOW_KT123_HMAC_V1:"+String(secret||""))}
async function key(secret){
 if(typeof secret!=="string"||secret.length<12)throw Error("Missing secure handoff key");
 return crypto.subtle.importKey("raw",keyBytes(secret),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"]);
}
const hex=bytes=>Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,"0")).join("");
const bytes=hexstr=>new Uint8Array(hexstr.match(/.{2}/gu).map(x=>parseInt(x,16)));
export async function signQualification(q,data,secret){
 return hex(await crypto.subtle.sign("HMAC",await key(secret),encoder.encode(payload(q,data))));
}
export async function verifyQualification(q,data,secret,signature){
 if(typeof signature!=="string"||!/^[a-f0-9]{64}$/u.test(signature))return false;
 try{return await crypto.subtle.verify("HMAC",await key(secret),bytes(signature),encoder.encode(payload(q,data)))}catch{return false}
}
