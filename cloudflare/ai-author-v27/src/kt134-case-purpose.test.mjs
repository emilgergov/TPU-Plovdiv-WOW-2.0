import assert from 'node:assert/strict';
import {detectKT134CasePurpose} from './kt134-case-purpose.mjs';
const subject='Възражение относно съдържанието на писмо на РИОСВ – Пловдив';
const scope='Административно разглеждане на възражение за редакция на предходно писмо без нов инвестиционен предмет';
const sourceTexts=[{source:'Синтетично възражение.txt',
 text:'Възражение относно текст в предходно писмо на компетентния орган. Възложителят посочва, че инвестиционното предложение е за модернизация на съществуващ склад в един поземлен имот, без ново строителство. Писмото съдържа спорна формулировка за защитена зона. Искането е за корекция на текста.'}];
const matched=detectKT134CasePurpose({subject,scope,sourceTexts});
assert.equal(matched.complaintReview,true);
assert.equal(matched.kind,'review_of_prior_correspondence');
assert.equal(matched.recommendedRoute,null,'No automatic panel selection');
assert.equal(detectKT134CasePurpose({subject:'Уведомление за инвестиционно предложение',scope:'Нова сграда',sourceTexts}).complaintReview,false);
assert.equal(detectKT134CasePurpose({subject,scope,sourceTexts:[{source:'Документ',text:'Обикновено инвестиционно предложение без възражение за писмо'}]}).complaintReview,false);
assert.equal(detectKT134CasePurpose({subject:'Ново инвестиционно предложение и жалба срещу писмо',scope,sourceTexts}).complaintReview,false);
assert.equal(detectKT134CasePurpose({subject,scope,sourceTexts:[]}).complaintReview,false);
assert.equal(detectKT134CasePurpose({subject,scope,sourceTexts:[{source:'Жалба',text:'Жалба за недопустима промяна в предходно писмо, подадена по текущата преписка.'}]}).complaintReview,true);
console.log('KT134 purpose: seven independent assertions passed; no preset panel');
