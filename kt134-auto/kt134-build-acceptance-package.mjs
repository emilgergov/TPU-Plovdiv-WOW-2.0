/**
 * KT134 synthetic acceptance package.
 * Real DOCX generator + original approved institutional template;
 * entirely fictional dossier, no credentials, private cases or Worker calls.
 * Running: node kt134-auto/kt134-build-acceptance-package.mjs
 * Requires npm packages fflate@0.8.2.
 */
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
import {zipSync,unzipSync} from 'fflate';
import {createDraftWordAdapter} from './kt134-auto-word-adapter.mjs';

const root=dirname(fileURLToPath(import.meta.url));
const dest=join(root,'test-deliverables');
await fs.mkdir(dest,{recursive:true});
const fflate={zipSync,unzipSync};
// The existing KT120 template expects window.fflate in the legacy host.
// Provide this only in the isolated Node acceptance generator.
globalThis.window={fflate};
const word=createDraftWordAdapter({fflate,templateWindow:globalThis.window});
const documentTitle='Проект на отговор по възражение';
const content=[
 'Относно: „Възражение по административна преписка“ — синтетичен тестов казус',
 'В Регионалната инспекция по околната среда и водите – Пловдив е представено възражение относно съдържанието на предходно писмо. Настоящият текст е изцяло учебен пример и не съответства на действителна преписка.',
 'Съгласно тестовия сценарий водещият документ е последващото възражение. Първоначалното уведомление и предходното писмо са разгледани като хронологично свързани документи.',
 'Предлага се разглеждане на възражението в рамките на компетентността на административния орган и подготовка на мотивиран отговор. Конкретната правна квалификация подлежи на проверка от експерта с приложимата нормативна уредба и доказателствата по преписката.',
 'Този документ е автоматично генериран ПРОЕКТ за визуална и техническа приемка. Не представлява административно решение, не е подписан и не може да бъде изпращан на възложител.'
].join('\n');
const bytes=await word.buildDraft({
 caseId:'KT134-SYNTHETIC-TEST',status:'draft',panelId:17,
 documentTitle,content
});
const pack=unzipSync(bytes);
const xml=new TextDecoder().decode(pack['word/document.xml']);
if(!pack['word/header1.xml']||!pack['word/footer1.xml']||!pack['word/media/crest.png']||
 !pack['word/media/eco.png']||!xml.includes('Синтетичен тестов казус')&&!xml.includes('синтетичен тестов казус')||
 (xml.match(/Електронен подпис:/gu)||[]).length!==2)
 throw Error('DOCX acceptance package verification failed');
const docxName='KT134_TEST_PROEKT_OTGOVOR_VAZRAZHENIE.docx';
await fs.writeFile(join(dest,docxName),bytes);
await fs.copyFile(join(root,'KT134_AUTO_VISUAL_DEMO.html'),
 join(dest,'KT134_AUTO_VISUAL_DEMO.html'));
const guide=`КТ134 — тестов пакет за визуална и документална приемка

1. Отворете KT134_AUTO_VISUAL_DEMO.html в браузъра и активирайте автоматичния маршрут.
2. Разгледайте етапи 1–5, предложението, панел №17 и командите Редактирай/Потвърди.
3. Отворете KT134_TEST_PROEKT_OTGOVOR_VAZRAZHENIE.docx в Word и проверете бланката, типографията, заглавието, отстъпа 1 см, двата подписа и правния стил.
4. Предайте забележки. Нищо от този пакет не се публикува в КТ133.

ВАЖНО: Използвана е изцяло измислена преписка. HTML файлът е визуална симулация и не е свързан с КТ125. DOCX е реален резултат на генератора на КТ134 и оригиналната шаблонна конструкция. Това НЕ е тест на работещ EG Автор, независим рецензент, реална нормативна проверка или реално експертно одобрение. Не използвайте текста като административен документ.
`;
await fs.writeFile(join(dest,'PROCHETI_PARVO.txt'),guide,'utf8');
console.log('KT134 acceptance package created:',docxName,'bytes='+bytes.byteLength,
 'ZIP parts='+Object.keys(pack).length,'signed=false','liveWorker=false');
