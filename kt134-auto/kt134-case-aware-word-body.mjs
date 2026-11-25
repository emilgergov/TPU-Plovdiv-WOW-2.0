/**
 * KT134 — present verified E1-E3 facts in the final DOCX draft.
 * This does not edit the EG legal conclusion and does not invent missing
 * locations, permits, spatial intersections, legal grounds or distances.
 */
const str=x=>typeof x==='string'?x.trim():'';
const list=x=>Array.isArray(x)?x:[];
const printable=x=>str(x).replace(/[\r\n]+/gu,' ').replace(/\s+/gu,' ');
const num=x=>typeof x==='number'&&Number.isFinite(x)?String(x):'';
const finish=x=>/[.!?]$/u.test(x)?x:x+'.';
export function composeKt134CaseAwareStage5Draft({stage5Text,stage4Request}={}){
 const original=str(stage5Text);
 if(!original.startsWith('Относно:')||!stage4Request?.completeCaseEvidence)
   throw Error('KT134_STAGE5_CASE_CONTEXT_MISSING');
 const dossier=stage4Request.completeCaseEvidence;
 const paras=[];
 const section=(name,texts)=>{
   const t=texts.filter(x=>str(x));
   if(t.length)paras.push(name+':',...t);
 };
 const docs=list(dossier.sourceTexts);
 section('КОНКРЕТНИ ДОКУМЕНТИ ПО ПРЕПИСКАТА',docs.map(d=>{
   const id=printable(d.fileName||d.source);
   return id?('Документ '+id+(str(d.type)?' — '+printable(d.type):'')+
     (str(d.date)?' от '+printable(d.date):'')+'. Източник: '+printable(d.source)+'.'):'';
 }));
 section('ПРЕДМЕТ И ОБХВАТ НА ИНВЕСТИЦИОННОТО ПРЕДЛОЖЕНИЕ',[
   str(stage4Request.subject)?finish('Предмет: '+printable(stage4Request.subject)):'',
   str(stage4Request.scope)?finish('Обхват: '+printable(stage4Request.scope)):''
 ]);
 section('МЕСТОПОЛОЖЕНИЕ И ДАННИ ЗА ИМОТИТЕ',list(dossier.parcels).map(p=>{
   const id=printable(p.identifier);if(!id)return '';
   return 'Поземлен имот с идентификатор '+id+
     (str(p.settlement)?', населено място '+printable(p.settlement):'')+
     (str(p.municipality)?', община '+printable(p.municipality):'')+
     (num(p.landAreaSqm)?', площ '+num(p.landAreaSqm)+' кв. м':'')+
     (str(p.landUse)?', НТП '+printable(p.landUse):'')+
     (str(p.sourceId)?'. Източник: '+printable(p.sourceId)+'.':'.');
 }));
 const gis=dossier.gis;
 if(gis?.analysisMode==='contextual_skip'){
   section('ГИС КОНТЕКСТ',[
     'Пространствен анализ не е приложен към конкретния предмет: '+printable(gis.reason)+'.'
   ]);
 }else if(gis?.analysisMode==='spatial'){
   const format=(x,kind)=>{
     if(!str(x?.name)||!str(x?.sourceId))return '';
     const fact=x.intersects===true?'установено пресичане':x.intersects===false?'не се пресича':'липсва потвърден извод за пресичане';
     return kind+' „'+printable(x.name)+'“ — '+fact+
       (num(x.intersectionAreaSqm)?', площ на пресичане '+num(x.intersectionAreaSqm)+' кв. м':'')+
       (num(x.distanceMeters)?', отстояние '+num(x.distanceMeters)+' м':'')+
       (str(x.order)?'; заповед '+printable(x.order):'')+
       '. Източник: '+printable(x.sourceId)+'.';
   };
   section('ГИС КОНСТАТАЦИИ СПРЯМО ЗАЩИТЕНИ ЗОНИ И ЗАЩИТЕНИ ТЕРИТОРИИ',[
     'Пространствен анализ от PDF1: '+printable(gis.pdf1Ref)+'.',
     ...list(gis.protectedZones).map(x=>format(x,'Защитена зона')),
     ...list(gis.protectedAreas).map(x=>format(x,'Защитена територия'))
   ]);
 }
 section('ПРИЛОЖЕНИЯ И ИЗТОЧНИЦИ',[
   str(dossier.pdf1Ref)?'Приложение: ГИС анализ (PDF1) — '+printable(dossier.pdf1Ref)+'.':'',
   str(dossier.pdf2Ref)?'Приложение: нормативна справка (PDF2) — '+printable(dossier.pdf2Ref)+'.':''
 ]);
 const lines=original.split(/\r?\n/u);
 // Institutional subject comes from the confirmed Stage 2 subject, not an
 // uncontrolled model-generated quotation; avoids mismatched or duplicate quotes.
 const title=printable(stage4Request.subject).replace(/[„“"]/gu,'').replace(/[.!?]+$/u,'').trim();
 if(!title)throw Error('KT134_VERIFIED_SUBJECT_MISSING');
 const heading='Относно: „'+title+'“';
 // The factual section has already been assembled directly from the
 // identified documents, PI MASTER and GIS. Do not repeat model retellings.
 // Preserve the reviewed legal basis, proposal and next action unchanged.
 const bodyLines=lines.slice(1).filter(line=>!line.trimStart().startsWith('Относно:'));
 const factStart=bodyLines.findIndex(line=>/^\s*Фактически констатации\s*:?\s*$/iu.test(line));
 const lawStart=bodyLines.findIndex((line,i)=>i>factStart&&/^\s*Правни предпоставки\s*:?\s*$/iu.test(line));
 const substantive=(factStart>=0&&lawStart>factStart)
   ?bodyLines.filter((_,i)=>i<factStart||i>=lawStart)
   :bodyLines;
 const body=substantive.join('\n').trim();
 return [heading,...paras,body].filter(x=>str(x)).join('\n');
}
