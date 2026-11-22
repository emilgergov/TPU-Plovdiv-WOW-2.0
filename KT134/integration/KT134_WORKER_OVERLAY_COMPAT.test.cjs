'use strict';
// Mirrors the two known PDF1 substitutions from the private Worker backup;
// no private Worker source or credentials are stored in GitHub.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'KT82_A_PDF1_V600_KT134_CANDIDATE.js'),'utf8');
function replaceExactlyOnce(text,oldText,newText){
 assert.equal(text.split(oldText).length-1,1,'Cloudflare source patch anchor changed');
 return text.replace(oldText,newText);
}
let overlaid=source;
overlaid=replaceExactlyOnce(overlaid,
 "date=new Date().toLocaleDateString('bg-BG')",
 "date=new Date().toLocaleDateString('bg-BG',{day:'2-digit',month:'2-digit',year:'numeric'}).trim()");
overlaid=replaceExactlyOnce(overlaid,
 'root.KT80Display.ekatte(id,p)',
 "(root.KT80Display.ekatte(id,p)!=='НЯМА ДАННИ'?root.KT80Display.ekatte(id,p):id.slice(0,5))");
assert.match(overlaid,/Противоречиви данни за ГИС пресичане/);
assert.match(overlaid,/Преписката е променена/);
assert.match(overlaid,/KT80PDF1Bridge/);
console.log('PASS: Worker overlay patch anchors, candidate guards and PDF bridge');
