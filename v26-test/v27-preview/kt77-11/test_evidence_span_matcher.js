/* KT77-11.4 regression tests — same source matching for A and B. */
'use strict';
const assert=require('node:assert/strict');
const m=require('./kt77-11-4-evidence-span-matcher.js');
function accepted(mode,paragraph,oldText,newText,oldFragment,newFragment,kind){
 const docs=[{source_file:'uv_latest.txt',text:'Уведомление: '+newFragment+'; потвърдено по преписката.'}];
 const actual=m.propose({paragraph,original:oldText,primary:newText,runTexts:[oldText],documents:docs,confirmedParcelIds:['46989.205.218','46989.205.219']});
 assert.equal(actual.ok,true,JSON.stringify({mode,paragraph,actual}));
 assert.equal(actual.patch.kind,kind);
 assert.equal(actual.patch.template_literal,oldFragment);
 assert.equal(actual.patch.value,newFragment);
 return actual;
}
for(const mode of ['A','B']){
 accepted(mode,11,'Относно: ИП „Складове“ в 56784.13.102','Относно: ИП „Складове“ в 46989.205.218','56784.13.102','46989.205.218','parcel_id');
 accepted(mode,7,'Възложителя: Петров','Възложителя: Иванов','Петров','Иванов','recipient');
 accepted(mode,8,'Адрес: гр. Пловдив','Адрес: гр. Асеновград','Пловдив','Асеновград','address');
 accepted(mode,11,'Относно: ИП „Складове“','Относно: ИП „Посетителски пункт“','Складове','Посетителски пункт','subject');
 accepted(mode,11,'Относно: ИП в община Пловдив','Относно: ИП в община Садово','Пловдив','Садово','municipality');
 accepted(mode,11,'Относно: ИП в област Пловдив','Относно: ИП в област Смолян','Пловдив','Смолян','region');
 accepted(mode,11,'Относно: ИП в местност Рогошко','Относно: ИП в местност Попското','Рогошко','Попското','locality');
 accepted(mode,11,'Относно: ИП в с. Катуница','Относно: ИП в с. Манастир','Катуница','Манастир','settlement');
 accepted(mode,19,'Предвижда се сграда 40 кв. м.','Предвижда се сграда 20 кв. м.','40','20','characterization');
 const oldMany='Относно: ИП в имоти 56784.13.102 и 56784.13.105';
 const newMany='Относно: ИП в имоти 46989.205.218 и 46989.205.219';
 const many=m.proposeMany({paragraph:11,original:oldMany,primary:newMany,runTexts:[oldMany],
  confirmedParcelIds:['46989.205.218','46989.205.219'],
  documents:[{source_file:'dossier.txt',text:'Имот 46989.205.218\nИмот 46989.205.219'}]});
 assert.equal(many.ok,true,JSON.stringify(many));
 assert.equal(many.patches.length,2);
 assert.deepEqual(many.patches.map(x=>x.value),['46989.205.218','46989.205.219']);
 const unsafeMany=m.proposeMany({paragraph:11,original:oldMany,primary:newMany,runTexts:[oldMany],
  confirmedParcelIds:['46989.205.218'],
  documents:[{source_file:'dossier.txt',text:'Имот 46989.205.218\nИмот 46989.205.219'}]});
 assert.equal(unsafeMany.ok,false,'Both parcel IDs must be GIS-confirmed');
 const missing=m.propose({paragraph:11,original:'Имот 56784.13.102',primary:'Имот 46989.205.218',runTexts:['Имот 56784.13.102'],documents:[],confirmedParcelIds:['46989.205.218']});
 assert.equal(missing.ok,false);
 const ambiguous=m.propose({paragraph:11,original:'Имот 56784.13.102',primary:'Имот 46989.205.218',runTexts:['Имот 56784.13.102'],documents:[
  {source_file:'a.txt',text:'46989.205.218'},{source_file:'b.txt',text:'46989.205.218'}
 ],confirmedParcelIds:['46989.205.218']});
 assert.equal(ambiguous.ok,false);
 const legal=m.propose({paragraph:25,original:'Извод: по ЗООС',primary:'Извод: не подлежи на ОВОС',runTexts:['Извод: по ЗООС'],documents:[{source_file:'a.txt',text:'не подлежи на ОВОС'}],confirmedParcelIds:[]});
 assert.equal(legal.ok,false);
 const unknown=m.propose({paragraph:11,original:'Имот 56784.13.102',primary:'Имот 46989.205.218',runTexts:['Имот 56784.13.102'],documents:[{source_file:'a.txt',text:'46989.205.218'}],confirmedParcelIds:['11111.1.1']});
 assert.equal(unknown.ok,false);
 const spans=m.propose({paragraph:11,original:'Относно: ИП 56784.13.102 и зона BG0000194',primary:'Относно: ИП 46989.205.218 и зона BG0001031',runTexts:['Относно: ИП 56784.13.102 и зона BG0000194'],documents:[{source_file:'a.txt',text:'46989.205.218 и зона BG0001031'}],confirmedParcelIds:['46989.205.218']});
 assert.equal(spans.ok,false,'Changing a parcel AND a zone in one span is not permitted');
 console.log('PASS: '+mode+' — recipient, address, subject, parcel, characterization; source/ambiguity/legal/unknown parcel/zone change BLOCKED');
}
