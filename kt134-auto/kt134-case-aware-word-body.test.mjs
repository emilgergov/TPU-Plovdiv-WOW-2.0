import assert from 'node:assert/strict';
import {test} from 'node:test';
import {buildKt134CompleteStage4Request} from './kt134-complete-dossier-stage4.mjs';
import {composeKt134CaseAwareStage5Draft} from './kt134-case-aware-word-body.mjs';
test('Word receives only sourced E1-E3 location GIS ZZ and ZT observations',()=>{
 const bundle={caseId:'EG-4',subject:'Тестово ИП',scope:'Преустройство по уведомление',
 documents:[{sourceId:'src-1',fileName:'Уведомление.pdf',type:'уведомление',text:'Тестов документ'}],
 parcels:[{identifier:'99999.999.999',settlement:'Тестово село',municipality:'Тестова община',areaSqm:1800,sourceId:'pi-1'}],
 gisMode:'required',gis:{sourceId:'gis-1',pdf1Ref:'PDF1-test',
 protectedZones:[{name:'Синтетична ЗЗ',intersects:false,distanceMeters:1100,sourceId:'gis-1'}],
 protectedAreas:[{name:'Синтетична ЗТ',intersects:true,intersectionAreaSqm:40,sourceId:'gis-1'}]},
 pdf2Ref:'PDF2-test',normativeArchive:{name:'V11 MASTER',verifiedReferences:[]}};
 const req=buildKt134CompleteStage4Request({caseId:'EG-4',revision:'1',bundle});
 const w=composeKt134CaseAwareStage5Draft({stage5Text:'Относно: „Тестово ИП“\nПредлага се мотивирано действие за преценка от експерта.',stage4Request:req});
 for(const val of ['Уведомление.pdf','Тестово село','Тестова община','99999.999.999',
  '1800 кв. м','Синтетична ЗЗ','1100 м','Синтетична ЗТ','40 кв. м','PDF1-test','PDF2-test'])
  assert.ok(w.includes(val),'Missing '+val);
 assert.ok(w.startsWith('Относно:'));
 assert.equal((w.match(/Относно:/gu)||[]).length,1);
 assert.ok(w.includes('Предлага се мотивирано действие'));
});
test('Word never invents location or GIS result when absent',()=>{
 const req={subject:'Жалба',scope:'Възражение',completeCaseEvidence:{sourceTexts:[{source:'жалба'}],
 parcels:[],gis:{analysisMode:'contextual_skip',reason:'Предмет без имотен анализ'}}};
 const text=composeKt134CaseAwareStage5Draft({stage5Text:'Относно: „Жалба“\nПроектно становище.',stage4Request:req});
 assert.ok(text.includes('Предмет без имотен анализ'));
 assert.equal(text.includes('установено пресичане'),false);
 assert.equal(text.includes('Поземлен имот'),false);
});
