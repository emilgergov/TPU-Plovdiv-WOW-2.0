import { existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
const required=[
  'WOW_APP.html','wow_tree_cinematic_approved.png','WOW_V12_Cinematic_Transition.wav',
  ...Array.from({length:11},(_,i)=>'scenes/screen_'+String(i+1).padStart(2,'0')+(i<9?'.jpg':'.png')),
  'media/TERA_TPU_PLOVDIV_PANORAMA_3MIN_12_10_2026.mp4',
  'TPU_V64_59_MAIN.pdf','TPU_V64_59_SUMMARY.pdf','TPU_V64_60_PRESENTATION.pdf',
  'TPU_MAP_ATLAS_V25_1.pdf','PHOTO_ARCHIVE/index.html'
];
const checked=required.map(path=>{
  const full=resolve(process.cwd(),path);
  const exists=existsSync(full)&&statSync(full).isFile();
  const bytes=exists?statSync(full).size:0;
  const minimum=path.endsWith('.mp4')?1000000:path.endsWith('.pdf')?1000:1;
  return {path,exists,bytes,ok:exists&&bytes>=minimum};
});
const missing=checked.filter(item=>!item.ok);
mkdirSync('wow-test-results',{recursive:true});
writeFileSync('wow-test-results/assets.json',JSON.stringify({checked,missing},null,2));
console.log('WOW content assets:',checked.length-missing.length,'/',checked.length);
for(const item of missing)console.error('MISSING OR EMPTY',item.path,'bytes:',item.bytes);
if(missing.length)process.exitCode=1;
