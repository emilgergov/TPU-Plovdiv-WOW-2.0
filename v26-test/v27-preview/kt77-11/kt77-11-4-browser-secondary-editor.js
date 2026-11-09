/* KT77-11.4 — browser counterpart to Python secondary editor.
 * Experimental preview ONLY. Both Classic A/B; no change to source/other ZIP files.
 * Explicit evidence patches required; no guessed legal facts and no silent fallback.
 */
(function(root){'use strict';
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const DOC='01_Proekt_na_stanovishte_Klasicheski.docx';
const SPEC={A:{name:'KT35-A.docx',n:41},B:{name:'KT39-B.docx',n:43}};
const KINDS=new Set(['parcel_id','settlement','municipality','region','subject','recipient','address','reference','locality','characterization']);
const ALLOWED=new Set([7,8,11,17,19,20,21,22,23,24]);
const DANGER=/не е необходимо провеждане|не подлежи на|допустимо спрямо|няма вероятност от отрицателно/iu;
const words=doc=>Array.from(doc.getElementsByTagNameNS(W,'body')[0]?.childNodes||[]).filter(n=>n.nodeType===1&&n.namespaceURI===W&&n.localName==='p');
const nodes=(p,tag)=>Array.from(p.getElementsByTagNameNS(W,tag));
const content=p=>nodes(p,'t').map(t=>t.textContent||'').join('');
const decode=b=>new TextDecoder().decode(b);
const encode=s=>new TextEncoder().encode(s);
const error=msg=>{throw Error('КТ77-11.4: '+msg)};
const parse=b=>{const xml=new DOMParser().parseFromString(decode(b),'application/xml');if(xml.getElementsByTagName('parsererror').length)error('невалиден Word XML');return xml;};
async function transform(blob,{scenario,patches,evidence}={}){
 const mode=String(scenario||'').toUpperCase().replace('Б','B').replace('А','A'),spec=SPEC[mode];
 if(!spec)error('липсва валиден сценарий А/Б');
 if(!root.fflate?.unzipSync||!root.fflate?.zipSync)error('ZIP библиотеката липсва');
 const raw=root.fflate.unzipSync(new Uint8Array(await blob.arrayBuffer()));
 const source=raw[DOC];if(!source)error('липсва първичен Classic Word в ZIP');
 const primary=root.fflate.unzipSync(source),pdoc=parse(primary['word/document.xml']||error('липсва първичен Word XML'));
 const pps=words(pdoc);
 if(pps.length!==spec.n)error('първичният Word има '+pps.length+' вместо '+spec.n+' абзаца (ЗТ се добавя след редактора)');
 const url=new URL('v27-preview/etalon/'+spec.name,document.baseURI);
 const response=await fetch(url,{cache:'no-store'});
 if(!response.ok)error('липсва оригинален еталон '+spec.name);
 const original=root.fflate.unzipSync(new Uint8Array(await response.arrayBuffer()));
 const refDoc=parse(original['word/document.xml']||error('липсва еталонен Word XML')),rps=words(refDoc);
 if(rps.length!==spec.n)error('регресия в оригиналния еталон');
 const differences=rps.map((p,i)=>content(p)===content(pps[i])?null:i+1).filter(Boolean);
 const report={scenario:mode,baseline:spec.name,paragraphs:spec.n,primaryDifferences:differences,edits:[],status:'BLOCKED',readOnly:false};
 if(!Array.isArray(patches)||!patches.length)error('няма потвърдени доказателствени полета; не генерирам примерен Word');
 if(!Array.isArray(evidence)||!evidence.length)error('липсват първични документални доказателства');
 const seen=new Set(),changes=[],pendingByRun=new Map();
 for(const patch of patches){
  if(!Number.isInteger(patch?.paragraph)||!ALLOWED.has(patch.paragraph))error('неразрешен абзац за редакция');
  if(!KINDS.has(patch.kind))error('забранен вид промяна '+patch.kind);
  const {paragraph:index,template_literal:old,value,source_file:source,source_quote:quote}=patch;
  if(typeof old!=='string'||!old.trim()||typeof value!=='string'||!value.trim()||old===value||value.length>600||DANGER.test(value))error('недопустима стойност');
  const targetKey=index+'|'+old;if(seen.has(targetKey))error('повторно изменение');seen.add(targetKey);
  if(content(pps[index-1]).split(value).length!==2)error('стойността не се среща еднозначно в първичния Word, абзац '+index);
  if(typeof source!=='string'||!source||typeof quote!=='string'||!quote.includes(value))error('липсва проследим документален цитат');
  const matching=evidence.filter(e=>e&&e.source_file===source&&typeof e.text==='string'&&e.text.includes(quote));
  if(matching.length!==1)error('цитатът не е потвърден еднозначно в първичния архив: '+source);
  const candidates=nodes(rps[index-1],'t').filter(t=>(t.textContent||'').includes(old));
  if(candidates.length!==1||(candidates[0].textContent||'').split(old).length!==2)error('оригиналната стойност не е един текстов Word сегмент');
  const target=candidates[0],current=pendingByRun.has(target)?pendingByRun.get(target):target.textContent;
  if(current.split(old).length!==2)error('нееднозначна повторна замяна на Word run');
  pendingByRun.set(target,current.replace(old,value));
  changes.push({node:target,oldLiteral:old,newValue:value,paragraph:index,kind:patch.kind,source_file:source});
 }
 for(const [node,newText] of pendingByRun)node.textContent=newText;
 for(const change of changes)report.edits.push({paragraph:change.paragraph,kind:change.kind,source_file:change.source_file});
 // Recheck untouched OOXML paragraphs and all original package resources.
 const resultXml=new XMLSerializer().serializeToString(refDoc),recheck=parse(encode(resultXml)),changed=words(recheck);
 const originalXml=parse(original['word/document.xml']),baseline=words(originalXml),modified=new Set(changes.map(c=>c.paragraph));
 if(changed.length!==spec.n)error('променен брой абзаци');
 // Every material variable difference must be fully reconciled. A partial set of
 // patches must NEVER silently restore the specimen's historical parcel/subject.
 for(let i=0;i<spec.n;i++)if(ALLOWED.has(i+1)&&content(changed[i])!==content(pps[i]))
  error('непопълнена фактическа разлика в абзац '+(i+1)+'; изходът би съдържал примерни данни');
 const cadastral=s=>new Set((s.match(/\b\d{5}\.\d+\.\d+\b/g)||[]));
 const primaryIds=cadastral(pps.map(content).join(' '));
 const outputIds=cadastral(changed.map(content).join(' '));
 if(primaryIds.size!==outputIds.size||[...primaryIds].some(id=>!outputIds.has(id)))
  error('идентификаторите в вторичния Word не съвпадат с първичния; възможно пренасяне на еталонен имот');

 const zones=t=>new Set((String(t||'').match(/BG\d{7}/g)||[]));
 const primaryZones=zones(pps.map(content).join(' ')),outputZones=zones(changed.map(content).join(' '));
 if(primaryZones.size!==outputZones.size||[...primaryZones].some(id=>!outputZones.has(id)))
  error('кодът на защитена зона в вторичния Word не съвпада с първичния; възможно пренасяне на тестова зона');
 const serializer=new XMLSerializer();
 for(let i=0;i<spec.n;i++)if(!modified.has(i+1)&&serializer.serializeToString(baseline[i])!==serializer.serializeToString(changed[i]))error('променен заключен абзац '+(i+1));
 for(const c of changes){if(!content(changed[c.paragraph-1]).includes(c.newValue)||content(changed[c.paragraph-1]).includes(c.oldLiteral))error('неуспешна конкретна подмяна');}
 const secondary={...original,'word/document.xml':encode(resultXml)};
 const outgoing={...raw,[DOC]:root.fflate.zipSync(secondary,{level:6})};
 for(const [filename,bytes] of Object.entries(raw))if(filename!==DOC){
  const now=outgoing[filename];if(!now||bytes.length!==now.length||bytes.some((x,i)=>x!==now[i]))error('променен несвързан ZIP файл: '+filename);
 }
 report.status='PASS';report.changedParagraphs=[...modified].sort((a,b)=>a-b);
 return {blob:new Blob([root.fflate.zipSync(outgoing,{level:6})],{type:'application/zip'}),report};
}
root.KT7711SecondaryEditor=Object.freeze({transform});
})(window);
