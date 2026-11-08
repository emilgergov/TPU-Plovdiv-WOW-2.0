/* KT77-05.1: read-only PDF2 order preflight; makes absent archive references explicit. */
(function(){
 'use strict';
 const canon=s=>String(s||'').toLocaleLowerCase('bg-BG').replace(/[„“"']/g,'').replace(/\s+/g,' ').trim();
 async function inspect(){
  const inp=document.getElementById('ids');
  const ids=[...new Set((inp?.value||'').match(/\b\d{5}\.\d+\.\d+\b/g)||[])];
  if(!ids.length)throw Error('Въведете кадастрален идентификатор.');
  if(!window.KT77PiMasterIndex?.create)throw Error('ПИ MASTER не е зареден.');
  const idx=window.KT77PiMasterIndex.create(new URL('gis-data/pi-master/browser-index/',document.baseURI).href);
  const archive=window.KT77R11ZZT?.archive?.sources||[];
  const regs=window.V26NormativeRegister?.records||[];
  const out=[];
  for(const id of ids){
   const result=await idx.lookup(id);
   if(result.status!=='FOUND')throw Error('Няма запис в ПИ MASTER за '+id);
   const p=result.profile;
   out.push('ПИ '+id+' | ЗЗ: '+p.zz.length+' | ЗТ: '+p.zt.length);
   for(const z of p.zz){
    const code=z.code;
    const direct=window.KT77049ZoneOrders?.[code];
    const rec=regs.find(r=>String(r.title||'').includes(code)&&/Заповед\s*(?:№\s*)?РД[-– ]?\d+/i.test(r.title||'')&&/ДВ\s*\d+\/\d{4}/i.test(r.title||''));
    out.push('ЗЗ '+code+' '+(z.name||'')+' → '+(direct?.declaration||rec?.title||'ЛИПСВА ОБВЪРЗАНА ЗАПОВЕД В PDF2'));
   }
   for(const z of p.zt){
    const doc=archive.find(x=>x.kind==='protected_territory_site'&&x.source_verified===true&&canon(x.title).includes(canon(z.name))&&canon(z.name));
    out.push('ЗТ '+z.name+' → '+(doc?.declaration_order||'ЛИПСВА ОБВЪРЗАНА ЗАПОВЕД В PDF2'));
   }
  }
  return out.join('\n');
 }
 function mount(){
  const host=document.getElementById('v26Annex2Static')||document.getElementById('v26LocalIndexMount')||document.getElementById('roleReview');
  if(!host||document.getElementById('kt77051panel'))return;
  const panel=document.createElement('section');panel.id='kt77051panel';
  panel.style.cssText='padding:12px;margin:10px 0;border:1px solid #acc4b8;border-radius:9px;background:#f7faf7';
  const label=document.createElement('strong');label.textContent='КТ77-05.1 · Проверка на заповедите преди PDF2';
  const btn=document.createElement('button');btn.type='button';btn.textContent='Провери ЗЗ/ЗТ и заповедите';btn.style.margin='8px 0';
  const output=document.createElement('pre');output.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px';
  btn.addEventListener('click',async()=>{btn.disabled=true;output.textContent='Проверяват се данните…';try{output.textContent=await inspect()}catch(e){output.textContent='Грешка: '+String(e.message||e)}finally{btn.disabled=false}});
  panel.append(label,document.createElement('div'),btn,output);host.appendChild(panel);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();