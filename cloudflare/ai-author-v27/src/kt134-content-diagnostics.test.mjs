import assert from 'node:assert/strict';
import {kt134DraftDiagnostics} from './kt134-content-diagnostics.mjs';
const codes = r => r.findings.map(x=>x.code);
const bad = kt134DraftDiagnostics('Предмет: преустройство. TEST-PDF1-NONREAL. Категоричен процедурен извод не се предлага.', {stage:5});
assert(codes(bad).includes('TEST_METADATA_IN_ADMINISTRATIVE_TEXT'));
assert(codes(bad).includes('SHORT_UNREASONED_DRAFT'));
assert(codes(bad).includes('MISSING_ACTIONABLE_PROPOSAL'));
assert.equal(bad.advisoryOnly,true);
const bad4=kt134DraftDiagnostics('Неопределена процедура.',{stage:4});
for(const code of ['NO_SELECTED_PANEL','NO_DOSSIER_TEXT','NO_GIS_CONTEXT','NO_EXACT_LAW_TEXT','NO_REVIEW_GROUNDS'])assert(codes(bad4).includes(code));
const good=kt134DraftDiagnostics('Относно: Проект. На основание на проверените факти Ви уведомявам за конкретните обстоятелства по инвестиционното предложение. '+ 'Подробни фактически мотиви. '.repeat(25),{stage:5});
assert.deepEqual(codes(good),[]);
console.log('KT134 candidate diagnostics: 3 scenarios passed');

const wordExtract='ПРЕДМЕТ И ОБХВАТ НА ИНВЕСТИЦИОННОТО ПРЕДЛОЖЕНИЕ: Вътрешно преустройство на съществуващо складово помещение. '+
 'Поземлен имот с идентификатор 99999.999.999. ГИС констатации: не се пресича със защитени зони. TEST-PDF1-NONREAL. '+
 'По представените материали не е установена достатъчно обоснована съпоставка на дейността с приложения № 1 и № 2 към ЗООС. '+
 'Предлага се проект на писмо за допълнителна фактическа информация: да се уточни дали наред с описаното вътрешно преустройство се предвижда въвеждане на нова дейност или технологично оборудване.';
const wordIssues=codes(kt134DraftDiagnostics(wordExtract,{stage:5}));
assert(wordIssues.includes('TEST_METADATA_IN_ADMINISTRATIVE_TEXT'));
assert(wordIssues.includes('GENERIC_LEGAL_UNCERTAINTY'));
assert(wordIssues.includes('UNPROVEN_PHYSICAL_GAP'));
const sourceLinked='Относно: складово преустройство. На основание на описаните документи Ви уведомявам, че при съпоставка с предмета и обхвата на преписката се отчита точно установеният факт. '+ 'Допълнителни конкретни мотиви. '.repeat(22);
assert.equal(codes(kt134DraftDiagnostics(sourceLinked,{stage:5})).length,0);
console.log('KT134 Word extract + source-linked scenarios passed');
