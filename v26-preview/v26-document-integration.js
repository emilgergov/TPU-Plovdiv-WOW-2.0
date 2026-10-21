(()=>{
const root=document.createElement('section');
root.innerHTML='<h2>Нормативно свързване · Приложение №2</h2><p>Само експертно предоставени източници. Липсващи данни: ПРЕДСТОИ.</p><textarea id="v26Legal" placeholder="Нормативен регистър JSON">[]</textarea><button id="v26Integrate" disabled>Свържи ГИС и референции</button><p id="v26IntegrateStatus">Изисква ZIP и ГИС резултат.</p>';
document.getElementById('referenceRecords').parentNode.append(root);
let gis=null,dossier=false;
const btn=document.getElementById('v26Integrate'),status=document.getElementById('v26IntegrateStatus');
const ready=()=>btn.disabled=!(gis&&dossier);
document.addEventListener('v26:dossier-ready',()=>{dossier=true;ready()});
document.addEventListener('v26:gis-ready',e=>{gis=e.detail;ready()});
btn.onclick=async()=>{
btn.disabled=true;
try{
const legal=JSON.parse(document.getElementById('v26Legal').value);
if(!Array.isArray(legal))throw Error('Изисква се JSON масив');
const r=await fetch('/api/integrate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({gis_summary:gis,legal_register:legal,dossier_number:document.getElementById('reg').value})});
const x=await r.json();if(!r.ok)throw Error(x.error);
const bin=atob(x.pdf_base64),bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));
document.dispatchEvent(new CustomEvent('v26:annex2',{detail:bytes}));
const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
const a=document.createElement('a');a.href=url;a.download='V26_REFERENCES_APPENDIX_2_DRAFT.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
status.textContent='Готов проект: '+x.integration.references.length+' референции; необходим е експертен преглед.';
}catch(e){status.textContent='Грешка: '+e.message}finally{ready()}
};
})();