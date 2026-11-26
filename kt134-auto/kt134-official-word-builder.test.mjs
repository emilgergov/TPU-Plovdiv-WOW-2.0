import test from 'node:test';
import assert from 'node:assert/strict';
import {unzipSync} from 'fflate';
import {createKt134OfficialWordBuilder} from './kt134-official-word-builder.mjs';
const draft={
 caseId:'EG-TEST-0004',status:'draft',expertApproved:false,panelId:17,
 documentTitle:'Проект на отговор по възражение',
 content:'Относно: „Възражение по административна преписка“\nПредлага се мотивиран отговор до подателя.'
};
test('actual official RIOSV Word template renders protected Stage5 draft',async()=>{
 const bytes=await createKt134OfficialWordBuilder()(draft);
 const zip=unzipSync(bytes);
 const xml=new TextDecoder().decode(zip['word/document.xml']);
 assert.match(xml,/Възражение по административна преписка/);
 assert.match(xml,/Предлага се мотивиран отговор/);
 assert.match(xml,/Verdana/);
 assert.equal((xml.match(/Електронен подпис:/g)||[]).length,2);
 assert.ok(zip['word/media/crest.png']);
 assert.ok(zip['word/footer1.xml']);
});
test('official Word rejects previously approved or unauthorized final act',async()=>{
 const build=createKt134OfficialWordBuilder();
 await assert.rejects(()=>build({...draft,expertApproved:true}),/KT134_UNAUTHORIZED_WORD_FINALIZATION/);
 await assert.rejects(()=>build({...draft,finalDecision:'issued'}),/KT134_UNAUTHORIZED_WORD_FINALIZATION/);
});
