'use strict';
// KT21.3: protect the production browser ZIP assembly contract, not a simulated renderer.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../v26-draft-package.js'),'utf8');
const expected=[
 '01_Proekt_na_stanovishte_Klasicheski.docx',
 '02_Proekt_na_stanovishte_Eksperten.docx',
 '03_Prilozhenie_1_GIS_analiz.pdf',
 '04_Prilozhenie_2_Normativni_i_dokumentalni_referencii.pdf',
 'README_BG.txt'
];
for(const name of expected)assert(source.includes("z.file('"+name+"'"),'Missing actual browser ZIP entry '+name);
assert.match(source,/const expertWord=await window\.V26ExpertWord\.make\(/,'Expert DOCX must come from real renderer');
assert.match(source,/const classicWord=await window\.V26TemplateWord\.make\(/,'Classic DOCX must come from institutional template');
assert.match(source,/const pdf1=await pdfBlob\(gisPdf\(results,register\)\)/,'GIS PDF must be generated');
assert.match(source,/if\(includeAnnex2\)\{const pdf2=await pdfBlob\(normativePdf\(results,register\)\)/,'Normative PDF remains optional');
assert.match(source,/register\?\.approvedAuthorPayload\|\|null/,'AI payload remains optional and invisible');
assert.match(source,/authored\.ready!==true/,'Unapproved AI payload must be rejected');
assert.match(source,/if\(!determination\.scenario\)throw/,'Unverified GIS must not generate final package');
assert.match(source,/const packageBlob=await z\.generateAsync/,'ZIP must contain real rendered bytes');
assert(!/z\.file\([^\n]*\.html['"]/.test(source),'Do not replace final documents with HTML placeholders');
console.log('PASS KT21.3: production ZIP includes two actual renderer DOCX, GIS PDF, optional references PDF and README; guarded approval and GIS');
