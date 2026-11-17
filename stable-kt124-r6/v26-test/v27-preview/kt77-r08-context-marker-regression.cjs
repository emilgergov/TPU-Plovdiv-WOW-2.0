#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const dir=__dirname;
const base=fs.readFileSync(path.join(dir,'V27_27_KT77_03_PI_MASTER_FULL_R07_COMPACT.html'),'utf8');
const next=fs.readFileSync(path.join(dir,'V27_27_KT77_03_PI_MASTER_R08_CONTEXT_MARKER.html'),'utf8');
const match=next.match(/\n<style id="kt77-r08-context-marker-style">[\s\S]*?<\/script>/);
function check(x,msg){if(!x)throw Error('KT77 R08 BLOCKED: '+msg);}
check(match,'missing visual extension');
check(next.replace(match[0],'')===base,'unexpected R13/R07/GIS/MASTER/document generator change');
check(match[0].includes('parent.appendChild(marker)'),'locator must be outside SVG map');
check(match[0].includes('getScreenCTM()'),'locator must track real parcel screen position');
check(match[0].includes('getBBox()'),'locator must use real parcel geometry');
check(match[0].includes('aria-label')&&match[0].includes('Избери имот '),'locator must match selected cadastral path');
check(match[0].includes('width:24px;height:24px'),'stable screen size missing');
check(match[0].includes('pointer-events:none'),'locator must not intercept clicks');
check(match[0].includes('new MutationObserver(schedule).observe(map'),'zoom/pan tracking missing');
check(match[0].includes('ResizeObserver'),'resize tracking missing');
check(match[0].includes('active=true'),'context activation missing');
check(match[0].includes('function deactivate()'),'return to non-context mode missing');
check(!match[0].includes('innerHTML'),'unsafe DOM writing');
console.log('PASS R08: unchanged R07 base, visual-only external SVG locator, on-screen fixed size, context-only, responsive, source geometry remains unchanged.');
