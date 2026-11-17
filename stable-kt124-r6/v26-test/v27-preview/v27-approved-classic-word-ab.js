/* V27 approved Classic A/B browser bridge. Builds a fresh, case-specific
 * administrative letter in the original institutional DOCX package.
 * The approved KT35-A/KT39-B typography is applied without reusing synthetic
 * B parcel intersections, stale template places or invented legal decisions.
 */
(function(root){'use strict';
const base=root.V26TemplateWord;
if(!base?.templatePaths)throw Error('V27: липсват институционалните Word образци.');
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const el=(d,n)=>d.createElementNS(W,'w:'+n);
const attr=(e,n,v)=>e.setAttributeNS(W,'w:'+n,String(v));
const nodes=(e,name)=>Array.from(e.getElementsByTagNameNS(W,name));
const clean=x=>String(x??'').trim();
function para(d,text,{bold=false,italic=false,align='both',indent=true,space=95,keep=false}={}){
 const p=el(d,'p'),pr=el(d,'pPr'),jc=el(d,'jc'),s=el(d,'spacing'),ind=el(d,'ind');
 attr(jc,'val',align);attr(s,'line','240');attr(s,'lineRule','auto');attr(s,'after',space);
 attr(ind,'firstLine',indent?'565':'0');
 pr.append(jc,s,ind);if(keep)pr.appendChild(el(d,'keepNext'));p.appendChild(pr);
 const r=el(d,'r'),rpr=el(d,'rPr'),fonts=el(d,'rFonts'),size=el(d,'sz');
 for(const k of ['ascii','hAnsi','cs'])attr(fonts,k,'Verdana');
 attr(size,'val','20');rpr.append(fonts,size);
 if(bold)rpr.appendChild(el(d,'b'));if(italic)rpr.appendChild(el(d,'i'));
 const t=el(d,'t');t.textContent=String(text);t.setAttribute('xml:space','preserve');
 r.append(rpr,t);p.appendChild(r);return p;
}
const blank=d=>para(d,'',{space:300,indent:false});
const isReview=x=>/НЯМА ДАННИ|\[\s*ЗА ЕКСПЕРТНА ПРОВЕРКА|ПРЕДСТОИ|НЕУСТАНОВЕН/i.test(clean(x));
function verifiedLegal(m,i){
 const legal=Array.isArray(m?.legalParagraphs)?m.legalParagraphs:[],
       sources=Array.isArray(m?.legalFindingSources)?m.legalFindingSources:[];
 const t=clean(legal[i]),s=clean(sources[i]);
 return t&&!isReview(t)&&s&&!isReview(s)?t:null;
}
function joinParcels(draft){
 return draft.parcels.map(q=>q.id).join(', ');
}
async function make(scenario,paragraphs,metadata,context={}){
 const s=({'А':'A','Б':'B'})[scenario]||scenario;
 if(!['A','B'].includes(s))throw Error('V27: ГИС сценарият А/Б не е определен.');
 if(!Array.isArray(paragraphs)||paragraphs.length!==4||paragraphs.some(x=>!clean(x)))
  throw Error('V27: липсват четирите потвърдени класически характеристики.');
 const determination=context.determination;
 if(determination?.scenario!==scenario)throw Error('V27: несъвпадение на ГИС резултата и класическия Word.');
 const zones=(determination?.zones||[]).map(x=>typeof x==='string'?x:clean(x?.code||x?.sitecode));
 if(s==='A'&&zones.length)throw Error('V27: не може да се използва образец А при пресичане.');
 if(s==='B'&&(!zones.length||zones.some(z=>!/^BG\d{7}$/.test(z))))
  throw Error('V27: не може да се използва образец Б без потвърдена защитена зона.');
 if(!root.fflate?.unzipSync||!root.fflate?.zipSync)throw Error('Липсва DOCX ZIP библиотеката.');
 const path=base.templatePaths[s],response=await fetch(path,{cache:'no-store'});
 if(!response.ok)throw Error('Институционалният Word образец е недостъпен: '+s);
 const zip=root.fflate.unzipSync(new Uint8Array(await response.arrayBuffer()));
 if(!zip['word/document.xml']||!zip['word/_rels/document.xml.rels'])
  throw Error('Невалиден Word образец '+s);
 const d=new DOMParser().parseFromString(new TextDecoder().decode(zip['word/document.xml']),'application/xml');
 if(d.getElementsByTagName('parsererror').length)throw Error('Невалиден Word XML '+s);
 const body=nodes(d,'body')[0];if(!body)throw Error('Липсва основната част на Word.');
 const sect=Array.from(body.children).find(x=>x.localName==='sectPr');if(!sect)throw Error('Липсва институционалният футер.');
 if(!Object.keys(zip).some(x=>x.startsWith('word/media/')))
  throw Error('Липсва оригиналното институционално лого.');
 const m=metadata||{},ids=clean(m.parcelIds).match(/\b\d{5}\.\d+\.\d+\b/g)||[];
 if(!ids.length||new Set(ids).size!==ids.length)throw Error('Липсват потвърдени имоти.');
 const subject=clean(m.subject);if(!subject)throw Error('Липсва потвърден предмет на ИП.');
 const location=clean(m.location);
 const idLine=(ids.length===1?'поземлен имот с идентификатор ':'поземлени имоти с идентификатори ')+ids.join(', ')+(location?', '+location:'');
 const recipient=clean(m.recipient)||'Възложителя: ХХХХХХХХХ';
 const address=clean(m.address)||'Адрес: ХХХХХХХХХ';
 const reference=clean(m.incomingReference)||'Вх. № ОВОС-ХХХХ / ХХ.ХХ.ХХХХ г.';
 const texts=[
  blank(d),para(d,recipient,{bold:true,indent:false}),para(d,address,{indent:false}),
  para(d,'Относно: Уведомление за инвестиционно предложение „'+subject+'“ — '+idLine+'.',{italic:true,indent:false}),
  para(d,clean(m.salutation)||'УВАЖАЕМИ ГОСПОЖИ И ГОСПОДА,',{bold:true,indent:false}),
  para(d,'Във връзка с внесеното уведомление с '+reference+' за горецитираното инвестиционно предложение, на основание чл. 6а, т. 2 от Наредбата за ОС Ви уведомявам следното:'),
  para(d,'С реализацията на инвестиционното предложение '+clean(paragraphs[0]).replace(/^С реализацията на инвестиционното предложение\s*/i,'')),
  ...paragraphs.slice(1).map(t=>para(d,clean(t)))
 ];
 if(s==='B')texts.push(para(d,'Инвестиционното предложение не е свързано с промяна предназначението и/или начина на трайно ползване на имота само ако това обстоятелство е изрично потвърдено с документ от преписката. В противен случай същото подлежи на експертна проверка.'));
 texts.push(para(d,s==='A'
  ?'Съгласно потвърдения ГИС анализ '+idLine+' не попадат в границите на защитени зони от мрежата „Натура 2000“.'
  :'Съгласно потвърдения ГИС анализ е установено пресичане на част от поземлените имоти, разглеждани във връзка с инвестиционното предложение, със защитени зони '+zones.join(', ')+'. Конкретният имотен обхват е посочен в самостоятелния ГИС анализ.'));
 const nearest=clean(m.nearestZone);if(s==='A'&&nearest&&!isReview(nearest))texts.push(para(d,'Най-близко разположена защитена зона е '+nearest+'.'));
 if(s==='B'){
  texts.push(para(d,'Установени защитени зони: '+zones.join(', ')+'. Правните режими, предметът и целите на опазване са разгледани само в обхвата на проверените приложими нормативни източници.'));
 }
 const legal=(m.legalParagraphs||[]).map((_,i)=>verifiedLegal(m,i)).filter(Boolean);
 for(const t of legal)texts.push(para(d,t));
 if(s==='B'&&legal.length===0)texts.push(para(d,'Приложимите режими и допустимостта по чл. 12 от Наредбата за ОС са предмет на експертна проверка по установените защитени зони.'));
 texts.push(para(d,'С оглед местоположението и характера на инвестиционното предложение са разгледани вероятните преки, косвени и кумулативни въздействия върху предмета и целите на опазване на защитените зони по отношение на:'));
 const criteria=[
 'пряко и косвено унищожаване, увреждане или фрагментиране на природни местообитания и местообитания на видове, включително птици;',
 'трансформация на местообитания, безпокойство и прогонване на видове по време на строителство и експлоатация;',
 'възможност за нарушаване целостта и целите на опазване на защитените зони;',
 'възможност за нарушаване на екологичните връзки и кохерентността между защитени зони;',
 'възможни кумулативни въздействия във взаимодействие с други планове, програми, проекти и инвестиционни предложения.'
 ];
 for(let i=0;i<criteria.length;i++)texts.push(para(d,verifiedLegal(m,100+i)||criteria[i]));
 const finding=clean(m.procedureFinding);
 const hasVerifiedFinding=finding&&!isReview(finding)
   &&Array.isArray(m.procedureFindingSources)&&m.procedureFindingSources.some(x=>clean(x)&&!isReview(x));
 texts.push(para(d,hasVerifiedFinding?finding:
  'Преценката по чл. 2, ал. 2 от Наредбата за ОС за заявеното инвестиционно предложение се представя за окончателна експертна проверка по пълната преписка. Не се формулира неподкрепен извод за липса на необходимост от процедура.',
  {bold:true}));
 texts.push(
  para(d,'Настоящият проект се отнася само до заявените параметри и не отменя изискуеми съгласувания или разрешения по други нормативни актове.'),
  para(d,'При промяна на параметрите или на някои от обстоятелствата, при които е извършена преценката, възложителят уведомява компетентния орган по приложимия ред.'),
  para(d,'С уважение,',{indent:false}),blank(d)
 );
 // Preserve original logo drawing(s), but none of the stale sample case text.
 const logo=Array.from(body.children).filter(x=>x.localName==='p'&&nodes(x,'drawing').length>0)
  .slice(0,3).map(x=>x.cloneNode(true));
 body.replaceChildren(...logo,...texts,sect.cloneNode(true));
 zip['word/document.xml']=new TextEncoder().encode(new XMLSerializer().serializeToString(d));
 return new Blob([root.fflate.zipSync(zip,{level:6})],
  {type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
root.V26TemplateWord=Object.freeze({make,templatePaths:base.templatePaths,layout:'KT35_A_KT39_B_APPROVED'});
})(typeof window!=='undefined'?window:globalThis);
