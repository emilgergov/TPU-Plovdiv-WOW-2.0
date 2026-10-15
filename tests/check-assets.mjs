import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const required=['WOW_APP.html','wow_tree_cinematic_approved.png','WOW_V12_Cinematic_Transition.wav',...Array.from({length:11},(_,i)=>'scenes/screen_'+String(i+1).padStart(2,'0')+(i<9?'.jpg':'.png')),'media/TERA_TPU_PLOVDIV_PANORAMA_3MIN_12_10_2026.mp4'];
const missing=required.filter(x=>!existsSync(resolve(process.cwd(),x)));
mkdirSync('wow-test-results',{recursive:true});writeFileSync('wow-test-results/assets.json',JSON.stringify({required,missing},null,2));
console.log('WOW media assets:',required.length-missing.length,'/',required.length);
for(const file of missing)console.error('MISSING',file);
if(missing.length)process.exitCode=1;
