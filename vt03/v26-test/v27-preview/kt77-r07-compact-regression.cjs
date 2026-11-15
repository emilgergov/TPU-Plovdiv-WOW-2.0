#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
const base=read('V27_27_KT77_03_PI_MASTER_FULL_R06.html');
const compact=read('V27_27_KT77_03_PI_MASTER_FULL_R07_COMPACT.html');
const style=compact.match(/<style id="kt77-03-r07-compact-panel">[\s\S]*?<\/style>\n/);
if(!style)throw Error('R07 compact CSS is absent');
if(compact.replace(style[0],'')!==base)throw Error('R07 changed something outside isolated CSS: GIS/map/PI MASTER/Word/PDF/AI baseline not preserved');
if(!style[0].includes('grid-template-columns: repeat(6,minmax(0,1fr))'))throw Error('R07 three-column administrative layout missing');
if(!style[0].includes('.kt77-pm-hit {')||!style[0].includes('grid-column: span 3;'))throw Error('Two-column ZZ/ZT compact layout missing');
if(!style[0].includes('@media (max-width: 760px)')||!style[0].includes('@media (max-width: 460px)'))throw Error('Responsive layout missing');
console.log('PASS R07: exact original R06 HTML/JS/source script dependencies preserved, compact CSS only, responsive spatial panels');
