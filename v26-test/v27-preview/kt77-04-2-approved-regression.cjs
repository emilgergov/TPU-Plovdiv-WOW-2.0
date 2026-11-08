#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=n=>fs.readFileSync(path.join(__dirname,n),'utf8');
const prev=read('V27_27_KT77_04_1_PDF1_PI_MASTER_ZT_PREVIEW.html');
const curr=read('V27_27_KT77_04_2_PDF1_APPROVED_EDITS_HIRES_PREVIEW.html');
const oldScript='v27-preview/kt77-04-1-pdf1-pi-master-zt-preview.js?v=kt77-041-preview-1';
const newScript='v27-preview/kt77-04-2-pdf1-approved-10-edits-preview.js?v=kt77-042-1';
const oldPdf='v26-offline-pdf.js?v=kt22-header-8418d93';
const newPdf='v27-preview/kt77-04-2-offline-pdf-hires.js?v=kt77-042-1';
assert.equal(curr.replace(newScript,oldScript).replace(newPdf,oldPdf),prev,'Approved HTML unchanged except new isolated PDF generator/render source');
assert(!prev.includes(newScript)&&!prev.includes(newPdf));
const r3=read('V27_27_KT77_04_2_R3_PDF1_FOUR_PARCELS_CACHE_SAFE.html');
assert.equal(r3
 .replace('v27-preview/kt77-04-2-offline-pdf-hires.js?v=kt77-042-3-pi-bold',newPdf)
 .replace('v27-preview/kt77-04-2-pdf1-approved-10-edits-preview.js?v=kt77-042-3-area-inline',newScript),curr,
 'Fresh four-parcel HTML should ONLY cache-bust the 2 PDF1 assets');

const generator=read('kt77-04-2-pdf1-approved-10-edits-preview.js');
const baseline=read('kt77-04-1-pdf1-pi-master-zt-preview.js');
new vm.Script(generator,{filename:'PDF1'});
new vm.Script(read('kt77-04-2-offline-pdf-hires.js'),{filename:'OfflinePDF'});
assert(generator.includes("const bgDate=new Intl.DateTimeFormat('bg-BG'"));
assert(generator.includes(".replace(/\\s*г\\.\\s*$/u,'')"),'Bulgarian date must not repeat the year suffix');
assert(!generator.includes('02.10.2026 г.'));
assert(generator.includes("title==='ГИС анализ'?content"));
assert(generator.includes('Пространствено положение на поземлените имоти спрямо защитените зони и защитените територии'));
assert(generator.includes('Картата представя пространственото положение'));
assert(generator.includes('Административна принадлежност на поземлените имоти'));
assert(!generator.includes("content.push({text:'Населено място: '+verifiedSettlement})"),'Standalone settlement line must not duplicate the PI MASTER administrative description');
assert(!generator.includes("content.push({text:'Местоположение на имотите: '+verifiedLocation})"),'Standalone location line must not duplicate the PI MASTER administrative description');
assert(generator.includes("content.push({text:parcelLabel(f)+'. Площ на имота: '+fmt(area)+' кв. м'"),'Each property must show PI MASTER area inline after its administrative description');
assert(generator.includes("!Number.isFinite(area)||area<=0"),'Missing PI MASTER area must fail closed');

assert(generator.includes('nearest_verified_zone||r.nearestZoneVerified'));
assert(generator.includes('if(f.zones.length)continue'));
assert(generator.includes('А. Защитени зони от мрежата „Натура 2000“ (ЗБР)'));
assert(generator.includes('Б. Защитени територии (ЗЗТ)'));
assert(generator.includes('minimumFractionDigits:2,maximumFractionDigits:2'));
assert(generator.includes('Забележка: Посочените площи'));
assert(!generator.includes('ГИС данни по имоти — обща таблица'));
assert(!generator.includes('Карта на анализираните имоти'));
assert(!generator.includes('Картата възпроизвежда видимите слоеве в браузъра'));
assert(!generator.includes('Имот 36676.129.457 попада изцяло'));
const off=read('kt77-04-2-offline-pdf-hires.js');
const origOffline=fs.readFileSync(path.join(__dirname,'../v26-offline-pdf.js'),'utf8');
assert.equal(off.includes('PIXEL_SCALE=2,IMG_W=W*PIXEL_SCALE,IMG_H=H*PIXEL_SCALE'),true);
assert(off.includes("image/jpeg',0.97"));
assert(off.includes("Стр. '+(pages.length+1)"));

assert(off.includes("РИОСВ – Пловдив · ГИС анализ"),'PDF1 title must use RIOSV');
assert(off.includes("РИОСВ – Пловдив · ГИС справка"),'PDF1 footer must use RIOSV');
assert(off.includes("normativePdf?'ТПУ Пловдив · Нормативни референции'"),'PDF2 title must remain unchanged');
assert(off.includes('function drawGISStrongText(line,x,baseline)'),'PDF1 bold-identifier renderer missing');
assert(off.includes("drawGISStrongText(line,M+c*cellW+7"),'PDF1 table identifiers must be bold');
assert(off.includes("else drawGISStrongText(line,M,y+LINE)"),'PDF1 narrative identifiers and note must be bold');
assert(off.includes("Забележка:"),'Bold note prefix missing');
const idRegex=/(?:Забележка:|\b\d{5}\.\d+\.\d+\b|\bBG\d{7}\b)/g;
assert.deepEqual('ПИ 46989.205.218: BG0001031 — Забележка:'.match(idRegex),['46989.205.218','BG0001031','Забележка:'],'Bold-ID pattern must match sample parcel, Natura code and note');

assert(origOffline.includes("image/jpeg',0.90"),'original PDF renderer changed');
const cut=s=>s.slice(s.indexOf('async function make('),s.indexOf('async function standalonePDF('));
assert.equal(cut(generator).replace('const kt77041ZtFindings=await kt77041Findings(results);\n const pdf1=await pdfBlob(gisPdf(results,{...register,kt77041ZtFindings}))','const kt77041ZtFindings=await kt77041Findings(results);\n const pdf1=await pdfBlob(gisPdf(results,{...register,kt77041ZtFindings}))'),cut(baseline),'Word and PDF2 package logic changed');
const normativePart=x=>x.slice(x.indexOf('function normativePdf('),x.indexOf('async function make('));
assert.equal(normativePart(generator),normativePart(baseline),'PDF2 normative generator changed');
console.log('PASS KT77-04.2: isolated HTML and renderer, source/date, approved headings, parcel administration, ZZ and ZT tables, nearest A-only, 2-digit values, Word/PDF2 generator untouched');
