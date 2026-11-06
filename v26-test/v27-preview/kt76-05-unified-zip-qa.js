/* KT76-05 — last-mile five-file ZIP structural and case consistency QA.
 * Runs after the scoped KT76-03 Classic B and KT76-04 Expert B adapters.
 * Never modifies bytes; unsafe or unresolved GIS conclusions fail closed.
 */
(function(root){'use strict';
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const EXPECTED=Object.freeze([
 '01_Proekt_na_stanovishte_Klasicheski.docx',
 '02_Proekt_na_stanovishte_Eksperten.docx',
 '03_GIS_analiz.pdf',
 '04_Normativni_i_dokumentalni_referencii.pdf',
 'README_BG.txt'
]);
const get=(n,tag)=>Array.from(n.getElementsByTagNameNS(NS,tag));
const paras=doc=>Array.from(get(doc,'body')[0]?.childNodes||[]).filter(n=>n.nodeType===1&&n.namespaceURI===NS&&n.localName==='p');
const text=p=>get(p,'t').map(t=>t.textContent||'').join('');
function effectiveBold(run){
 const b=get(run,'b')[0];return !!b&&!['0','false','off'].includes(String(b.getAttributeNS(NS,'val')||''));
}
function visibleBold(p){return get(p,'r').filter(r=>get(r,'t').some(t=>(t.textContent||'').length)).map(r=>({value:text(r),bold:effectiveBold(r)}));}
function requireOk(ok,what){if(!ok)throw Error('КТ76-05: '+what);}
function docx(fileBytes,name){
 const entries=root.fflate.unzipSync(fileBytes);
 for(const f of ['word/document.xml','word/styles.xml','[Content_Types].xml'])requireOk(!!entries[f],name+': липсва '+f);
 const xml=new DOMParser().parseFromString(new TextDecoder().decode(entries['word/document.xml']),'application/xml');
 requireOk(!xml.getElementsByTagName('parsererror').length,name+': XML грешка');
 const ps=paras(xml);requireOk(ps.length===((name==='classic'&&ps.length===41)?41:name==='classic'?43:49),name+': брой абзаци');
 return {ps,lines:ps.map(text),assets:Object.keys(entries)};
}
function pdf(bytes,name){
 requireOk(bytes?.length>500,name+': празен или прекалено малък PDF');
 const head=new TextDecoder().decode(bytes.slice(0,8));
 const tail=new TextDecoder().decode(bytes.slice(-128));
 requireOk(head.startsWith('%PDF-'),name+': невалиден PDF header');
 requireOk(tail.includes('%%EOF'),name+': липсва край на PDF');
}
function verifyCase(c,e,{scenario='Б',parcelIds=[],zoneCodes=[],spatialRelation=null}={}){
 const normalized=scenario==='B'?'Б':scenario==='A'?'А':scenario;
 requireOk(['А','Б'].includes(normalized),'невалиден сценарий');
 const n=normalized==='А'?41:43;
 requireOk(c.ps.length===n,'Classic има '+c.ps.length+' вместо '+n+' абзаца');
 requireOk(e.ps.length===49,'Expert има '+e.ps.length+' вместо 49 абзаца');
 for(const id of parcelIds){requireOk(c.lines[10].includes(id),'липсва имот '+id+' в Classic заглавието');requireOk(e.lines[10].includes(id),'липсва имот '+id+' в Expert заглавието');}
 // Stronger claims and exact formatting for the one KT76-03/04 approved case.
 const sample=normalized==='Б'&&parcelIds.length===1&&parcelIds[0]==='36676.129.457'&&zoneCodes.length===1&&zoneCodes[0]==='BG0000194';
 if(sample){
  requireOk(c.lines[23].includes('BG0000194')&&e.lines[23].includes('BG0000194'),'несъответстваща ГИС зона');
  requireOk(c.lines[24].includes('РД-688/25.08.2020')&&c.lines[24].includes('РД-648/19.07.2024'),'неправилни заповеди в Classic');
  requireOk(e.lines[24].includes('РД-688/25.08.2020')&&e.lines[24].includes('РД-648/19.07.2024'),'неправилни заповеди в Expert');
  requireOk(!/изцяло\s+или\s+частично|попада(?:т)?\s+или\s+частично/iu.test(e.lines.join('\n')),'двусмислено попадане в Expert');
  const cGIS=c.lines[23],eGIS=e.lines[23];
  const partial=/попада частично/iu.test(cGIS);
  const full=/,\s*попада в границите/iu.test(cGIS);
  requireOk(partial||full,'неясно попадане в Classic');
  requireOk(partial?/попада частично/iu.test(eGIS):/попада изцяло/iu.test(eGIS),'Classic и Expert си противоречат за попадане');
  if(spatialRelation)requireOk(partial?spatialRelation==='попада частично':spatialRelation==='попада','ГИС класификацията не съвпада');
  const p34=visibleBold(c.ps[33]),bold=p34.filter(r=>r.bold&&r.value);
  const title='„Изграждане на малък едноетажен обслужващ обект с временна площадка за складиране на оборудване“';
  const conclusion='не е необходимо провеждане на процедура по реда на Глава втора от Наредбата за ОС.';
  requireOk(bold.length===2&&bold.some(r=>r.value===title)&&bold.some(r=>r.value===conclusion),'неправилни двата bold блока в Classic §34');
  requireOk(p34.some(r=>!r.bold&&r.value.includes('в поземлен имот с идентификатор 36676.129.457')),'удебелено местоположение в Classic §34');
  requireOk(visibleBold(c.ps[22]).filter(r=>r.value).every(r=>r.bold),'Classic §23 не е изцяло bold');
  requireOk(visibleBold(c.ps[40]).some(r=>r.bold&&r.value.includes('С уважение')),'липсва bold на подписния поздрав');
  requireOk(!c.lines[17].includes('ал. 1. от'),'регресия в пунктуацията §18');
 }
 // KT76-08: block the observed nonsensical wastewater terminology before release.
 // This is a non-mutating fail-closed check: approved Classic and Expert templates
 // remain untouched; an invalid AI draft must be regenerated or reviewed.
 const expertText=e.lines.join('\\n');
 requireOk(!/санкционн(?:ото|о|и|ия|ият)?\\s+третиране\\s+на\\s+отпадъчни\\s+води/iu.test(expertText),
  'Expert съдържа неправилния термин „санкционно третиране на отпадъчни води“');
 // Even in other scenarios, never allow ambiguous geometric statement.
 requireOk(!/попада\s+изцяло\s+или\s+частично|попадат\s+или\s+частично/iu.test(e.lines.join('\n')),'двусмислено попадане в Expert');
 return {scenario:normalized,classicParagraphs:n,expertParagraphs:49,parcelCount:parcelIds.length,spatialRelation:spatialRelation||null};
}
async function verify(blob,context={}){
 requireOk(!!root.fflate?.unzipSync,'липсва ZIP библиотека');
 const pkg=root.fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
 for(const name of EXPECTED)requireOk(!!pkg[name],'липсва файл '+name);
 const names=Object.keys(pkg);
 requireOk(names.length===5,'неочакван брой файлове в ZIP '+names.length);
 const classic=docx(pkg[EXPECTED[0]],'classic'),expert=docx(pkg[EXPECTED[1]],'expert');
 pdf(pkg[EXPECTED[2]],'PDF1');pdf(pkg[EXPECTED[3]],'PDF2');
 const result=verifyCase(classic,expert,context);
 return Object.freeze({...result,files:names,pdfCount:2,passed:true});
}
root.KT7605UnifiedQA=Object.freeze({verify,files:EXPECTED});
})(typeof window!=='undefined'?window:globalThis);