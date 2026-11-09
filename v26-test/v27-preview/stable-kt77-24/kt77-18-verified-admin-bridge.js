/* KT77-20: exact-error, evidence-gated cadastral administrative bridge.
 * No template changes. Re-attempt only if original KT77-10 explicitly says
 * primary-document place is incomplete; all other errors propagate unchanged. */
(function(root){'use strict';
const original=root.KT7710LockedClassic;
const reader=root.KT77PiMasterIndex;
if(!original?.fix||!reader?.create){console.error('KT77 admin bridge dependencies missing');return;}
const verified=reader.create('https://emilgergov.github.io/TPU-Plovdiv-WOW-2.0/v26-test/gis-data/pi-master/browser-index/');
const clean=x=>String(x||'').trim();
const bad=x=>!x||/^(?:няма данни|неизвестно|undefined|null|[XХ]+)$/iu.test(x);
async function fix(blob,options={}){
 try {return await original.fix(blob,options);}
 catch(error){
  const msg=String(error?.message||error);
  if(!msg.includes('КТ77-10: липсват потвърдени населено място, община и област от първичната преписка'))throw error;
  const {scenario,parcelIds=[],archivePreview, gisResults=[]}=options;
  if(!['Б','B'].includes(scenario)||parcelIds.length!==1||!Array.isArray(archivePreview?.files))
   throw error;
  const id=clean(parcelIds[0]);
  if(!/^\d{5}\.\d+\.\d+$/.test(id)||!gisResults.some(r=>clean(r.input||r.cadnum)===id))
   throw Error('КТ77-20: кадастралният имот не съвпада с проверения ГИС контекст');
  const files=archivePreview.files.filter(f=>typeof f?.text==='string'&&clean(f.text));
  const notices=files.filter(f=>/уведомлен|notification/i.test(String(f.path||f.file||f.name||'')));
  const selected=notices.length?notices:files;
  if(!selected.length)throw error; // Never create a notification from GIS alone.
  const result=await verified.lookup(id);
  if(result.status!=='FOUND'||!result.profile)throw Error('КТ77-20: липсва проверен ПИ MASTER административен профил');
  const p=result.profile;
  if([p.settlement,p.municipality,p.province].some(bad))throw Error('КТ77-20: непълни административни данни в проверения ПИ MASTER');
  const settlement=clean(p.settlement).replace(/^населено място\s+/iu,'');
  if(!/^(?:с\.|гр\.)\s*[А-Яа-я]/u.test(settlement))throw Error('КТ77-20: непотвърден тип населено място');
  const locality=settlement+', община '+clean(p.municipality)+', област '+clean(p.province)+'.';
  // This synthetic line is clearly attributed to the verified cadastral registry;
  // it supplies only location, never the proposal, legal norms, or impact finding.
  const annotation='\nСправка ПИ MASTER за ПИ '+id+': '+locality;
  const nextFiles=archivePreview.files.map(f=>selected.includes(f)?{...f,text:f.text+annotation}:f);
  const checked={...options,archivePreview:{...archivePreview,files:nextFiles}};
  const passed=await original.fix(blob,checked); // Original KT77-10 runs every guard again.
  console.info('KT77-20: original KT77-10 PASS with verified PI MASTER location',id,locality);
  return passed;
 }
}
root.KT7710LockedClassic=Object.freeze({...original,fix});
})(window);
