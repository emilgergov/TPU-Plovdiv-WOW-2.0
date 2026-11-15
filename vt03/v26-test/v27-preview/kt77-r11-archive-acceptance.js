/* KT77 R11 — opt-in UI acceptance only. Activated with ?kt77r11=1.
   Read-only normative & spatial verification. NEVER invokes Word/PDF/AI generation. */
(function(){
'use strict';
if(new URLSearchParams(location.search).get('kt77r11')!=='1')return;
function mount(){
 const host=document.getElementById('v26Annex2Static'),id=document.getElementById('ids');
 if(!host||!id)return;
 const panel=document.createElement('section');panel.id='kt77-r11-acceptance';
 panel.style.cssText='margin-top:7px;padding:9px;border:1px solid #598b72;border-radius:7px;background:#f0f8f3;font-size:12px;display:grid;gap:6px';
 const heading=document.createElement('strong');heading.textContent='КТ77 R11 · контрол на ЗЗТ в нормативния архив';
 const status=document.createElement('div');status.setAttribute('role','status');status.textContent='Готовност: изпълнете справка с тестов имот.';
 const btn=document.createElement('button');btn.type='button';btn.className='secondary';btn.textContent='Провери ЗЗТ · архив + ПИ MASTER';
 const docs=document.createElement('div');docs.style.cssText='display:grid;gap:4px';
 panel.append(heading,status,btn,docs);host.append(panel);
 function source(title,url){
  const a=document.createElement('a');a.target='_blank';a.rel='noopener noreferrer';a.href=url;a.textContent=title;docs.append(a);
 }
 btn.addEventListener('click',async()=>{
  btn.disabled=true;docs.replaceChildren();
  try{
   const reg=window.V26NormativeRegister;
   if(reg?.status!=='ready')throw Error('Основният нормативен регистър още не е готов.');
   const required=['N05','T01','T02'];
   const missing=required.filter(key=>!reg.records.some(x=>x.id===key));
   if(missing.length)throw Error('ЗЗТ не е зареден в основния нормативен архив: '+missing.join(', '));
   for(const key of required){
    const record=reg.records.find(x=>x.id===key);
    if(record.verified!==false||record.reference_only!==true)throw Error('Невалиден статус за '+key);
    source(record.title,record.source);
   }
   const cadnum=String(id.value).trim().split(/\s+/)[0];
   if(!/^\d{5}\.\d+\.\d+$/.test(cadnum))throw Error('Въведете валиден имот, напр. 46989.205.218.');
   const zt=window.KT77R11ZZT;
   if(zt?.status!=='ready')throw Error('Допълнителният ЗЗТ индекс не е готов.');
   const result=await zt.findingsForParcel(cadnum);
   if(result.status!=='FOUND')throw Error('ПИ MASTER не установи такъв имот.');
   const names=result.zt.map(x=>x.category+' „'+x.name+'“').join('; ')||'няма установено пресичане';
   status.textContent='Проверка PASS · '+cadnum+' · ЗЗ: '+result.zz+' · ЗТ: '+names+'. ЗТ е констатация; сценарият и заключението по ЗЗ остават непроменени.';
  }catch(e){status.textContent='Проверка: '+String(e.message||e);}
  finally{btn.disabled=false;}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();