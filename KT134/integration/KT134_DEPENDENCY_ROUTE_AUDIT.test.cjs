'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const htmlPath='vt03/kt80/KT134_PDF1_ISOLATED_REGRESSION_TEST.html';
const html=fs.readFileSync(path.join(root,htmlPath),'utf8');
const basedir=path.dirname(htmlPath);
const referenced=[...html.matchAll(/<(script|link)\b[^>]*?\b(src|href)=["']([^"']+)["']/g)]
 .map(m=>({kind:m[1],uri:m[3]}))
 .filter(x=>!/^https?:\/\//i.test(x.uri)&&!x.uri.startsWith('#'))
 .filter(x=>x.kind==='script'||/\.(?:css)(?:\?|$)/i.test(x.uri));
const missing=[];
for(const {kind,uri} of referenced){
 const clean=uri.split(/[?#]/)[0];
 const target=path.resolve(root,basedir,clean);
 if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile())missing.push({kind,uri});
}
assert.deepEqual(missing,[],'Missing local script/CSS resources for isolated E1-E5 HTML');
const count=referenced.filter(x=>x.kind==='script').length;
assert(count>=80,'Expected full E1-E5 script chain, got '+count);
assert(referenced.some(x=>x.uri.includes('KT82_A_FREE_GIS_V603.js')),'V27.35 GIS parity retained');
assert(referenced.some(x=>x.uri.includes('KT82_A_PDF1_V600_KT134_CANDIDATE.js')),'KT134 PDF1 candidate loaded');
assert(referenced.some(x=>x.uri.includes('KT134_PANEL15_REAL_GIS.css')),'Real panel15 scoped style loaded');
assert.equal((html.match(/KT82_A_PDF1_V600_KT134_CANDIDATE\.js/g)||[]).length,1,'PDF1 candidate must load only once');
assert(!/99999\.999\.999/.test(html),'Demo cadastral number must not appear in live HTML');
console.log('KT134: validated '+count+' scripts and '+(referenced.length-count)+' styles, no missing local dependencies');
