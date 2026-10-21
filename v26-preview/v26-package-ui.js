(()=>{
let word=null,gis=null,refs=null;
const btn=document.createElement('button');
btn.textContent='Изтегли комплект ZIP (Word + Приложение №1 + налично №2)';
btn.disabled=true;
document.getElementById('proposalDraft').after(btn);
const update=()=>btn.disabled=!(word&&gis);
document.addEventListener('v26:word',e=>{word=e.detail;update()});
document.addEventListener('v26:annex1',e=>{gis=e.detail;word=null;refs=null;update()});
document.addEventListener('v26:annex2',e=>{refs=e.detail;update()});
const b64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.slice(i,i+8192));return btoa(s)};
btn.onclick=async()=>{
btn.disabled=true;
try{
const payload={docx_base64:b64(word),gis_pdf_base64:b64(gis)};
if(refs)payload.references_pdf_base64=b64(refs);
const r=await fetch('/api/package',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
const data=await r.json();if(!r.ok)throw Error(data.error||'Неуспешно комплектоване');
const bytes=Uint8Array.from(atob(data.zip_base64),c=>c.charCodeAt(0));
const url=URL.createObjectURL(new Blob([bytes],{type:'application/zip'}));
const a=document.createElement('a');a.href=url;a.download='V26_PREDLOZHENIE_I_PRILOZHENIA.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}catch(e){document.getElementById('result').textContent='Комплектът не е създаден: '+e.message}finally{update()}
};
})();