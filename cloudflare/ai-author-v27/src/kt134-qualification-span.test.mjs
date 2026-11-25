import assert from 'node:assert/strict';
import {buildQualificationSources,qualificationEvidenceOptions} from './kt123-evidence-qualification.mjs';
const claims=[
 {documentIndex:0,start:18,source:'Преписка.pdf',quote:'Застроената площ на сградата е 430 кв. м.',summary:'Площ на сграда.'},
 {documentIndex:0,start:103500,source:'Преписка.pdf',quote:'Проектната мощност е 45 kW според техническото описание.',summary:'Капацитет от края на документа.'},
 {documentIndex:1,start:105,source:'Допълнение.pdf',quote:'Не се предвижда промяна на предназначението на имота.',summary:'Изрично твърдение в допълнението.'}
];
const sources=buildQualificationSources({subject:'Складово помещение',scope:'Преустройство',documents:[{source:'Преписка.pdf',text:'начални редове'}],anchoredClaims:claims,legalProvisions:[]});
assert.ok(sources.facts.some(x=>x.id==='span:0:103500'&&x.established===false&&x.text.includes('45 kW')));
assert.equal(sources.facts.filter(x=>x.kind==='unverified-document-span').length,3);
assert.ok(sources.facts.filter(x=>x.kind==='unverified-document-span').every(x=>x.established===false));
const snippets=qualificationEvidenceOptions(sources);
assert.ok(snippets.facts.some(x=>x.id==='span:0:103500'&&x.excerpts.some(y=>y.text.includes('45 kW'))));
const duplicates=buildQualificationSources({subject:'Тест',scope:'Обхват',anchoredClaims:[claims[0],claims[0]],legalProvisions:[]});
assert.equal(duplicates.facts.filter(x=>x.id==='span:0:18').length,1);
console.log('KT134 legal source qualification includes late-document, unverified anchored facts');
