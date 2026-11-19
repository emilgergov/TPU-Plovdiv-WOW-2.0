import assert from 'node:assert/strict';
import {administrativeStyle} from '../../ai-author-v27/src/kt131-editor-style.mjs';
import {editPreparedDocument,textHash,editorGuard} from '../../ai-author-v27/src/kt130-intelligent-editor.mjs';
const intro='Относно: „Контролен обект“ в ПИ 12345.9.8.\n\nВъв връзка с документацията Ви уведомявам следното:\n\n';
const provider=async()=>Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({edits:[],notes:[]})}]}]});
for(const [before,after] of [
 ['На основание чл. 2, ал. 2 следва да се издаде писмо с констатация, че не се налага провеждане на процедура по оценка за съвместимост.','На основание чл. 2, ал. 2 Ви уведомявам, че не се налага провеждане на процедура по оценка за съвместимост.'],
 ['Следва да се издаде писмо с констатация, че е приложимо изискването по чл. 6.','Ви уведомявам, че е приложимо изискването по чл. 6.'],
 ['На основание изложеното конкретно посочвам, че не се налага провеждане на процедура и следва да бъде изключено необходимостта от провеждане на процедура по ОВОС.','На основание изложеното Ви уведомявам, че не се налага провеждане на процедура и следва да бъде изключена необходимостта от провеждане на процедура по ОВОС.']
]){
 const currentText=intro+before;const out=await editPreparedDocument({currentText,documentVersion:1,baseTextHash:await textHash(currentText)}, {},provider);
 assert.equal(out.status,200);assert.equal(out.body.text,intro+after);assert.deepEqual(editorGuard(currentText,out.body.text),[]);
 assert(editorGuard(currentText,out.body.text.replace('не се налага','налага се')).length||!currentText.includes('не се налага'));
}
const uncertain=intro+'Няма данни за опасни вещества; следва да се издаде писмо с констатация, че са необходими сведения.';
const retained=await editPreparedDocument({currentText:uncertain,documentVersion:1,baseTextHash:await textHash(uncertain)}, {},provider);assert.equal(retained.body.text,uncertain,'Uncertainty remains frozen');
assert.equal(administrativeStyle('Обектът е с площ 580 m² в ПИ 12345.9.8.'),'Обектът е с площ 580 m² в ПИ 12345.9.8.');
assert.equal(administrativeStyle('Представени са сведения за за обекта.'),'Представени са сведения за обекта.');
console.log('PASS KT131 style: direct authority voice, narrow agreement correction, protected uncertainty, identifiers and procedural polarity retained.');
