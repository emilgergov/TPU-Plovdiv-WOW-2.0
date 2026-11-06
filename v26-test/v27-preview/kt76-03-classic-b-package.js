/* KT76-03 · TEST-ONLY Classic B postprocessor, approved KT76-02 paragraph register.
 * Scope: one verified sample dossier (36676.129.457, BG0000194), B only.
 * A, Expert, PDFs, archive, KT75 generators and unrelated ZIP members unchanged.
 * Unsupported GIS geometry FAILS CLOSED; no inference from boolean intersects.
 */
(function(root){'use strict';
const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const PARCEL='36676.129.457',ZONE='BG0000194';
const docxName='01_Proekt_na_stanovishte_Klasicheski.docx';
const TEXT=Object.freeze({
 18:'Инвестиционното предложение попада в обхвата на чл. 2, ал. 2 от Наредбата за ОС и внесената информация може да бъде приета като уведомление по приложение № 1 към чл. 10, ал. 1 от същата.',
 19:'С инвестиционното предложение се предвижда изграждане на малък едноетажен обслужващ обект с временна площадка за складиране на оборудване в поземлен имот с идентификатор 36676.129.457, местност „Попското“, с. Катуница, община Садово, област Пловдив. Предвижда се приблизителна застроена площ на обслужващия обект около 40 кв. м и площ на временната открита площадка около 60 кв. м. Обектът ще се използва за съхранение на инструменти и краткотрайно обслужване на теренна дейност, без да се предвижда промишлено производство.',
 20:'Електроснабдяването на обекта ще се осъществява чрез присъединяване към електроразпределителната мрежа на съответния мрежови оператор, при условия, определени от него. Транспортният достъп до имота ще се осъществява по съществуващата пътна инфраструктура.',
 21:'Водоснабдяването на обекта ще се осъществява чрез доставка на вода в съдове, без присъединяване към съществуващата водоснабдителна мрежа.',
 22:'При експлоатацията на обекта не се предвижда заустване на отпадъчни води в канализационна мрежа или воден обект.',
 23:'Инвестиционното предложение не е свързано с промяна предназначението и/или начина на трайно ползване на имота.',
 25:'Защитена зона BG0000194 „Река Чая“ за опазване на природните местообитания и на дивата флора и фауна е обявена със Заповед № РД-688/25.08.2020 г. на министъра на околната среда и водите (ДВ, бр. 80/11.09.2020 г.), изменена със Заповед № РД-648/19.07.2024 г. (ДВ, бр. 70/20.08.2024 г.).',
 26:'При направената проверка за допустимост по смисъла на чл. 12, ал. 2 от Наредбата за ОС се констатира, че инвестиционното предложение е допустимо спрямо режимите на защитена зона BG0000194 „Река Чая“.',
 27:'Така заявеното ИП и предвидените в него дейности не могат да бъдат отнесени към някоя от позициите на Приложения № 1 и № 2 на Закона за опазване на околната среда (ЗООС) и не подлежат на регламентираните по реда на глава шеста от него процедури по оценка на въздействието върху околната среда (ОВОС) или екологична оценка (ЕО).',
 28:'С оглед гореизложеното, отчитайки местоположението и характера на инвестиционното предложение, при реализацията му няма вероятност от отрицателно въздействие върху защитени зони от мрежата „Натура 2000“, включително върху засегнатата защитена зона BG0000194 „Река Чая“, по отношение на:',
 29:'пряко или косвено унищожаване, увреждане или фрагментиране на природни местообитания и местообитания на растителни и животински видове, включително видове птици, предмет на опазване в засегнатата защитена зона;',
 30:'трансформация на местообитания на видове, безпокойство или прогонване на видове, предмет на опазване в засегнатата защитена зона;',
 31:'нарушаване на целостта и целите на опазване на защитената зона;',
 32:'нарушаване на кохерентността между съседни защитени зони;',
 33:'въздействия, произтичащи от предвидените дейности, самостоятелно или във взаимодействие с други инвестиционни предложения, планове, програми и проекти.',
 34:'В тази връзка и на основание чл. 2, ал. 2 от Наредбата за ОС Ви уведомявам, че преценката на компетентния орган за така заявеното инвестиционно предложение: „Изграждане на малък едноетажен обслужващ обект с временна площадка за складиране на оборудване“ в поземлен имот с идентификатор 36676.129.457, населено място с. Катуница, община Садово, област Пловдив, местност Попското е, че не е необходимо провеждане на процедура по реда на Глава втора от Наредбата за ОС.',
 35:'Настоящото писмо се отнася единствено за заявените параметри на инвестиционното предложение и не отменя необходимостта от получаване на съгласувания и разрешителни, предвидени в други закони и подзаконови нормативни актове, нито може да послужи като основание за изменение на Общ устройствен план.',
 36:'При промяна в параметрите на инвестиционното предложение или в обстоятелствата, при които е изготвено настоящото писмо, възложителят е длъжен незабавно да уведоми РИОСВ – Пловдив за настъпилите промени.'
});
const changed=[11,...Array.from({length:19},(_,i)=>i+18)];
const el=(xml,name)=>xml.createElementNS(NS,'w:'+name);
const nodes=(p,local)=>Array.from(p.getElementsByTagNameNS(NS,local));
const children=(p,local)=>Array.from(p.childNodes).filter(n=>n.nodeType===1&&n.namespaceURI===NS&&n.localName===local);
const read=p=>nodes(p,'t').map(t=>t.textContent||'').join('');
const bytesEqual=(a,b)=>a?.length===b?.length&&a.every((x,i)=>x===b[i]);
function areaGeometry(g){
 if(!g||!['Polygon','MultiPolygon'].includes(g.type))return NaN;
 const polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;
 let sum=0;
 for(const poly of polys)for(let j=0;j<poly.length;j++){
  const ring=poly[j];if(!Array.isArray(ring)||ring.length<4)return NaN;
  let q=0;
  for(let i=0;i<ring.length-1;i++){
   const a=ring[i],b=ring[i+1];
   if(!a||!b||!Number.isFinite(a[0])||!Number.isFinite(a[1])||!Number.isFinite(b[0])||!Number.isFinite(b[1]))return NaN;
   q+=a[0]*b[1]-b[0]*a[1];
  }
  sum+=(j===0?1:-1)*Math.abs(q)/2;
 }
 return sum;
}
function areaFeatures(fs){return (fs||[]).reduce((n,f)=>n+areaGeometry(f.geometry),0);}
function spatialRelation(gisResults){
 if(!Array.isArray(gisResults)||gisResults.length!==1)throw Error('KT76-03: изисква се един проверен имот за тест Б.');
 const r=gisResults[0];
 if(String(r.input||r.cadnum||'')!==PARCEL)throw Error('KT76-03: несъответствие на имота в ГИС.');
 const codes=(r.verified_zone_intersections||[]).map(x=>typeof x==='string'?x:String(x.sitecode||x.code||''));
 if(codes.length!==1||codes[0]!==ZONE)throw Error('KT76-03: защитената зона не е еднозначно потвърдена.');
 const parcel=(r.geojson?.features||[]).filter(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type));
 const overlaps=(r.overlap_geojson?.features||[]).filter(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type));
 if(!parcel.length||!overlaps.length)throw Error('KT76-03: липсват проверени геометрии за сравнението.');
 for(const f of overlaps){
  const c=f.properties?.SITECODE||f.properties?.sitecode||f.properties?.code;
  if(c&&c!==ZONE)throw Error('KT76-03: пресичането е за друга зона.');
 }
 const whole=areaFeatures(parcel),intersection=areaFeatures(overlaps);
 if(!(whole>0&&intersection>0&&Number.isFinite(whole)&&Number.isFinite(intersection)))throw Error('KT76-03: невалидна площ.');
 const ratio=intersection/whole;
 if(ratio>1.001)throw Error('KT76-03: площта на пресичане е по-голяма от площта на имота.');
 // Area comparison is necessary, not a formal topological proof; classify
 // near-full only with verified zone intersection + overlap polygon.
 if(ratio>=0.99999&&ratio<=1.001)return {word:'попада',ratio};
 if(ratio>0&&ratio<0.99999)return {word:'попада частично',ratio};
 throw Error('KT76-03: недоказуемо пространствено отношение.');
}
function writeParagraph(xml,p,segments){
 const actual=segments.map(x=>x.text).join('');
 if(!actual)throw Error('KT76-03: празен целеви текст');
 const original=children(p,'r').find(r=>nodes(r,'t').some(t=>(t.textContent||'').length))||children(p,'r')[0];
 if(!original)throw Error('KT76-03: липсва изходен Word run');
 const oldProps=children(original,'rPr')[0];
 for(const run of children(p,'r'))p.removeChild(run);
 for(const seg of segments){
  if(!seg.text)continue;
  const run=el(xml,'r');
  const props=oldProps?oldProps.cloneNode(true):el(xml,'rPr');
  for(const b of [...nodes(props,'b'),...nodes(props,'bCs')])b.parentNode.removeChild(b);
  if(seg.bold)props.appendChild(el(xml,'b'));
  run.appendChild(props);
  const t=el(xml,'t');t.textContent=seg.text;t.setAttribute('xml:space','preserve');
  run.appendChild(t);p.appendChild(run);
 }
 if(read(p)!==actual)throw Error('KT76-03: нарушено съдържание при OOXML запис.');
}
function segmentsFor(index,value,relation){
 if(index===23)return [{text:value,bold:true}];
 if(index===24){
  const token=relation.word,a=value.indexOf(token);
  if(a<0)throw Error('KT76-03: липсва ГИС израз');
  return [{text:value.slice(0,a)},{text:token,bold:true},{text:value.slice(a+token.length)}];
 }
 let suffix='';
 if(index===26)suffix='BG0000194 „Река Чая“';
 if(index===27)suffix='и не подлежат на регламентираните по реда на глава шеста от него процедури по оценка на въздействието върху околната среда (ОВОС) или екологична оценка (ЕО).';
 if(index===34)suffix='не е необходимо провеждане на процедура по реда на Глава втора от Наредбата за ОС.';
 if(index===35)suffix='Общ устройствен план.';
 if(index===36)suffix='настоящото писмо';
 if(!suffix)return [{text:value}];
 const start=value.indexOf(suffix);
 if(start<0||value.indexOf(suffix,start+1)>=0)throw Error('KT76-03: неоднозначно удебеляване №'+index);
 return [{text:value.slice(0,start)},{text:suffix,bold:true},{text:value.slice(start+suffix.length)}];
}
async function fix(blob,context={}){
 const scenario=context.scenario,ids=context.parcelIds||[],codes=context.zoneCodes||[];
 if(scenario!=='Б'&&scenario!=='B')return {blob,applied:false,reason:'Сценарий А — запазен'};
 if(ids.length!==1||String(ids[0])!==PARCEL||codes.length!==1||String(codes[0])!==ZONE)
  return {blob,applied:false,reason:'Извън одобрения тестов имот или зона'};
 if(!root.fflate?.unzipSync||!root.fflate?.zipSync)throw Error('KT76-03: липсва fflate');
 const relation=spatialRelation(context.gisResults);
 const packageZip=root.fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
 const old=packageZip[docxName];if(!old)throw Error('KT76-03: липсва Classic Б Word в ZIP.');
 const inner=root.fflate.unzipSync(old),xmlBytes=inner['word/document.xml'];
 if(!xmlBytes)throw Error('KT76-03: липсва DOCX document.xml');
 const xml=new DOMParser().parseFromString(new TextDecoder().decode(xmlBytes),'application/xml');
 if(xml.getElementsByTagName('parsererror').length)throw Error('KT76-03: невалиден Word XML');
 const ps=Array.from(nodes(xml,'body')[0]?.childNodes||[]).filter(p=>p.nodeType===1&&p.localName==='p');
 if(ps.length!==43)throw Error('KT76-03: изискват се точно 43 еталонни абзаца');
 const before=ps.map(read);
 if(!before[10].includes(PARCEL)||!/обслужващ обект/iu.test(before[10]))
  throw Error('KT76-03: непотвърден предмет или имот в „Относно:“');
 if(!before[23].includes(PARCEL))throw Error('KT76-03: несъответствие на ГИС абзац №24');
 if(!before[24].includes(ZONE)||!/Река Чая/iu.test(before[24]))throw Error('KT76-03: несъответствие в защитена зона №25');
 if(!before[16].includes('чл. 6а, т. 2'))throw Error('KT76-03: защитеният правен увод №17 липсва');
 const fixedHeading=before[10].replace('местност ПОПСКОТО','местност „Попското“');
 if(fixedHeading===before[10]&&!before[10].includes('местност „Попското“'))
  throw Error('KT76-03: неочаквано местоположение в заглавието');
 if(fixedHeading!==before[10]){
  const t=nodes(ps[10],'t').find(x=>(x.textContent||'').includes('местност ПОПСКОТО'));
  if(!t)throw Error('KT76-03: не може да се запази стилът на заглавието');
  t.textContent=t.textContent.replace('местност ПОПСКОТО','местност „Попското“');
 }
 const location='Имотът, предмет на инвестиционното предложение, с идентификатор '+PARCEL+' по КККР на с. Катуница, местност „Попското“, община Садово, област Пловдив, '+relation.word+' в границите на защитена зона '+ZONE+' „Река Чая“.';
 for(let index=18;index<=36;index++){
  const value=index===24?location:TEXT[index];
  if(!value)throw Error('KT76-03: липсва одобрен текст №'+index);
  writeParagraph(xml,ps[index-1],segmentsFor(index,value,relation));
 }
 if(read(ps[16])!==before[16]||read(ps[40])!==before[40])throw Error('KT76-03: защитените абзаци са променени');
 const after=ps.map(read),allowed=new Set(changed);
 for(let i=0;i<43;i++)if(!allowed.has(i+1)&&before[i]!==after[i])throw Error('KT76-03: промяна на неразрешен абзац №'+(i+1));
 inner['word/document.xml']=new TextEncoder().encode(new XMLSerializer().serializeToString(xml));
 const revisedDocx=root.fflate.zipSync(inner,{level:6});
 const newInner=root.fflate.unzipSync(revisedDocx);
 for(const [name,data] of Object.entries(inner))if(name!=='word/document.xml'&&!bytesEqual(data,newInner[name]))
  throw Error('KT76-03: нарушен DOCX ресурс '+name);
 packageZip[docxName]=revisedDocx;
 const revised=new Blob([root.fflate.zipSync(packageZip,{level:6})],{type:'application/zip'});
 return {blob:revised,applied:true,positions:changed,relation:relation.word,ratio:relation.ratio};
}
root.KT7603ClassicB=Object.freeze({fix,approved:TEXT,spatialRelation});
})(typeof window!=='undefined'?window:globalThis);
