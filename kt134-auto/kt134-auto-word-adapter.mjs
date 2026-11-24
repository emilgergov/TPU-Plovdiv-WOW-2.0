// KT134-B draft-only DOCX using the existing KT120 institutional template.
// Never changes KT119, never asserts Stage 4/5 expert approval.
import {makeAutomaticTemplate} from '../vt03/kt80/integration/kt120-embedded-word-template.mjs';
const esc=x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function run(text,{bold=false,italic=false}={}){
 const flags=(bold?'<w:b/>':'')+(italic?'<w:i/>':'');
 return '<w:r><w:rPr><w:rFonts w:ascii="Verdana" w:hAnsi="Verdana"/><w:sz w:val="20"/><w:lang w:val="bg-BG"/>'+flags+'</w:rPr><w:t xml:space="preserve">'+esc(text)+'</w:t></w:r>';
}
function bodyRuns(line,isSubject=false){
 if(isSubject&&line.startsWith('Относно:')){
   const rest=line.slice('Относно:'.length);
   const parts=[run('Относно:',{bold:true,italic:true})];
   let pos=0;
   for(const m of rest.matchAll(/„[^“\n]{2,180}“/gu)){
     if(m.index>pos)parts.push(run(rest.slice(pos,m.index),{italic:true}));
     const before=rest.slice(0,m.index).trimEnd();
     const isPlace=/(?:местност|ул\.|улица|квартал|район|село|гр\.|град|землище|община|област|защитена\s+зона)\s*$/iu.test(before);
     parts.push(run(m[0],{bold:!isPlace,italic:true}));pos=m.index+m[0].length;
   }
   if(pos<rest.length)parts.push(run(rest.slice(pos),{italic:true}));
   return parts.join('');
 }
 const terms=/(?:чл\.\s*\d+[а-я]?|ал\.\s*\d+|т\.\s*\d+|§\s*\d+|приложени(?:е|ето|я)\s*№\s*\d+)/giu;
 let out='',start=0;
 for(const m of line.matchAll(terms)){
   if(m.index>start)out+=run(line.slice(start,m.index));
   out+=run(m[0],{bold:true});start=m.index+m[0].length;
 }
 return out+run(line.slice(start));
}
const para=(line,{title=false,subject=false}={})=>{
 const align=title?'center':'both';
 const before=title?240:0,indent=title?'':'<w:ind w:firstLine="567"/>';
 return '<w:p><w:pPr><w:spacing w:before="'+before+'" w:after="'+before+
  '" w:line="240" w:lineRule="auto"/><w:jc w:val="'+align+'"/>'+indent+
  '<w:widowControl/>'+(title?'<w:keepNext/><w:keepLines/>':'')+
  '</w:pPr>'+(title?run(line,{bold:true}):bodyRuns(line,subject))+'</w:p>';
};
function replaceOne(xml,token,replacement){
 const parts=xml.split('<w:p>');
 const matches=parts.filter(p=>p.includes(token));
 if(matches.length!==1)throw Error('Невалидна бланка: очаква се едно поле '+token);
 const part=matches[0];
 const end=part.indexOf('</w:p>');
 if(end<0)throw Error('Невалидна структура на бланката');
 const updated=part.slice(end+'</w:p>'.length);
 return xml.replace('<w:p>'+part,'__KT134_REPLACEMENT__'+updated).replace('__KT134_REPLACEMENT__',replacement);
}
function validateDraft(input){
 if(!input||typeof input!=='object')throw Error('Липсва проект');
 const content=String(input.content??'').replace(/\r\n/g,'\n').trim();
 if(!content.startsWith('Относно:'))throw Error('Проектът трябва да започва с „Относно:“');
 const lines=content.split('\n').map(s=>s.trim()).filter(Boolean);
 if(lines.length<2)throw Error('Не е представен текст за административен документ');
 if(input.status!=='draft')throw Error('Автоматичният документ може да бъде само проект');
 if(!Number.isInteger(input.panelId)||input.panelId<1||input.panelId>22)throw Error('Не е определен валиден панел');
 const title=String(input.documentTitle??'').trim();
 if(!title)throw Error('Липсва вид на административния документ');
 return {lines,title};
}
export function createDraftWordAdapter({fflate,createTemplate=makeAutomaticTemplate,templateWindow=globalThis}){
 if(!fflate?.zipSync||!fflate?.unzipSync)throw Error('Липсва библиотеката за DOCX');
 return Object.freeze({async buildDraft(input){
  const {lines,title}=validateDraft(input);
  if(!templateWindow?.fflate || templateWindow.fflate!==fflate)
   throw Error('Генераторът на одобрената бланка не е готов');
  const template=createTemplate();
  const archive=fflate.unzipSync(template);
  if(!archive['word/document.xml'])throw Error('Одобрената бланка няма съдържание');
  let xml=new TextDecoder().decode(archive['word/document.xml']);
  if((xml.match(/Електронен подпис:/gu)||[]).length!==2)throw Error('Бланката трябва да съдържа точно два подписа');
  for(const k of ['{{SUBJECT}}','{{DOCUMENT_TITLE}}','{{BODY_ANCHOR}}']){
   if(!xml.includes(k))throw Error('Липсва задължително поле от бланката: '+k);
  }
  xml=replaceOne(xml,'{{SUBJECT}}',para(lines[0],{subject:true}));
  xml=replaceOne(xml,'{{DOCUMENT_TITLE}}',para(title.toLocaleUpperCase('bg-BG'),{title:true}));
  xml=replaceOne(xml,'{{BODY_ANCHOR}}',lines.slice(1).map(s=>para(s)).join(''));
  if(xml.includes('{{SUBJECT}}')||xml.includes('{{BODY_ANCHOR}}')||xml.includes('{{DOCUMENT_TITLE}}'))
   throw Error('Останало е непопълнено поле от бланката');
  archive['word/document.xml']=new TextEncoder().encode(xml);
  const result=fflate.zipSync(archive,{level:6});
  if(!(result instanceof Uint8Array)||!result.length)throw Error('Неуспешно създаване на Word проект');
  return result;
 }});
}
