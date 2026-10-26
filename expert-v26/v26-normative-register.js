/* V26: read existing 26.10 normative register from the public site's own data directory. */
(()=>{'use strict';
let generation=0;
const state={status:'loading',records:[],error:null};
window.V26NormativeRegister=state;
async function load(){
 const token=++generation;
 try{
  const response=await fetch(new URL('data/normative-archive-register.json',document.currentScript?.src||location.href),{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const records=await response.json();
  if(!Array.isArray(records)||!records.every(r=>r&&typeof r.id==='string'&&typeof r.title==='string'&&typeof r.source==='string'))throw Error('Невалиден нормативен регистър');
  if(token!==generation)return;
  state.records=records;state.status='ready';state.error=null;
  document.dispatchEvent(new CustomEvent('v26:normative-register-ready',{detail:{records,verified:records.filter(r=>r.verified===true).length,pending:records.filter(r=>r.verified!==true).length}}));
 }catch(error){
  if(token!==generation)return;
  state.records=[];state.status='error';state.error=String(error.message||error);
  document.dispatchEvent(new CustomEvent('v26:normative-register-error',{detail:{message:state.error}}));
 }
}
state.reload=load;
load();
})();
