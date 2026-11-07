/* KT77-03 R11 — supplementary ZZT factual/documental index only.
   Does not inject legal text into Word, PDF, or AI generators.
   Does not change approved Natura 2000 scenario A/B or legal conclusions. */
(function(scope){
'use strict';
const state={status:'loading',archive:null,error:null};
scope.KT77R11ZZT=state;
const canonical=s=>String(s||'').toLocaleUpperCase('bg-BG').replace(/[„“"']/g,'').replace(/\s+/g,' ').trim();
async function load(){
 try{
  const url=new URL('v27-preview/kt77-r11-zzt-normative-supplement.json',document.baseURI);
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok)throw Error('R11 source archive HTTP '+response.status);
  const archive=await response.json();
  if(archive.schema!=='kt77-r11-zzt-normative-supplement-v1'||!Array.isArray(archive.sources)||
    !archive.policy?.zt_never_automatically_reclassifies_ab||
    !archive.policy?.zt_never_overwrites_zz_expert_conclusion)throw Error('R11 policy validation failed');
  state.status='ready';state.archive=Object.freeze(archive);state.error=null;
  if(scope.V26NormativeRegister)scope.V26NormativeRegister.zztSupplement=state.archive;
  document.dispatchEvent(new CustomEvent('kt77:zzt-supplement-ready',{detail:{sourceCount:archive.sources.length}}));
 }catch(error){
  state.status='error';state.error=String(error.message||error);
  document.dispatchEvent(new CustomEvent('kt77:zzt-supplement-error',{detail:{message:state.error}}));
 }
}
state.findingsForParcel=async function(cadnum){
 if(state.status!=='ready')throw Error('R11 normative source index not ready');
 if(!scope.KT77PiMasterIndex?.create)throw Error('PI MASTER source missing');
 const master=scope.KT77PiMasterIndex.create(new URL('gis-data/pi-master/browser-index/',document.baseURI).href);
 const result=await master.lookup(String(cadnum));
 if(result.status!=='FOUND')return Object.freeze({status:result.status,cadnum,zt:[],zz:[],legalConclusion:null});
 const row=result.profile;
 const sources=state.archive.sources;
 const sites=(row.zt||[]).map(territory=>{
  const name=String(territory.name_bg||territory.name||'');
  const match=sources.find(s=>s.registry_category&&canonical(s.title).includes(canonical(name))&&name);
  return Object.freeze({name,category:String(territory.category||territory.category_bg||''),
   area_m2:territory.intersect_m2??territory.area_m2??null,
   percent:territory.percent??null,
   source_url:match?.url||sources.find(s=>s.id==='R11_EEA_ZT_REGISTER')?.url||null,
   source_verification_required:!match?.source_verified,
   legal_conclusion:null});
 });
 return Object.freeze({status:'FOUND',cadnum,zt:sites,zz:(row.zz||[]).length,
   source:'VERIFIED_PI_MASTER_AND_R11_OFFICIAL_SOURCE_INDEX',legalConclusion:null,
   scenario_override:null,expert_text_change:null});
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})(window);