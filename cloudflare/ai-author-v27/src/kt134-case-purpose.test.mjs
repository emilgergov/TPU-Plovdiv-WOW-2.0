import assert from 'node:assert/strict';
import {detectKT134CasePurpose,checkKT134ComplaintRoute} from './kt134-case-purpose.mjs';
const subject='Възражение относно съдържанието на писмо на РИОСВ – Пловдив';
const scope='Административно разглеждане на възражение за редакция на предходно писмо без нов инвестиционен предмет';
const sourceTexts=[{source:'Синтетично възражение.txt',
 text:'Възражение относно текст в предходно писмо на компетентния орган. Възложителят посочва, че инвестиционното предложение е за модернизация на съществуващ склад в един поземлен имот, без ново строителство. Писмото съдържа спорна формулировка за защитена зона. Искането е за корекция на текста.'}];
const matched=detectKT134CasePurpose({subject,scope,sourceTexts});
assert.equal(matched.complaintReview,true);
assert.equal(matched.kind,'review_of_prior_correspondence');
assert.equal(matched.recommendedRoute,null,'No automatic panel selection');
assert.equal(detectKT134CasePurpose({subject:'Уведомление за инвестиционно предложение',scope:'Нова сграда',sourceTexts}).complaintReview,false);
assert.equal(detectKT134CasePurpose({subject,scope,sourceTexts:[{source:'Документ',text:'Техническо описание на нова складова сграда и площадка'}]}).complaintReview,false);
assert.equal(detectKT134CasePurpose({subject:'Ново инвестиционно предложение и жалба срещу писмо',scope,sourceTexts}).complaintReview,false);
assert.equal(detectKT134CasePurpose({subject,scope,sourceTexts:[]}).complaintReview,false);
assert.equal(detectKT134CasePurpose({subject,scope,sourceTexts:[{source:'Жалба',text:'Жалба за недопустима промяна в предходно писмо, подадена по текущата преписка.'}]}).complaintReview,true);
for(const panel of [1,4,5,6,7,8,9,10,11,12])
 assert.equal(checkKT134ComplaintRoute(matched,panel).ok,false,'No new-IP route without a new filing: '+panel);
for(const panel of [14,17,18,19,20,21,22])
 assert.equal(checkKT134ComplaintRoute(matched,panel).ok,true,'Must leave complaint panel selection open: '+panel);
assert.equal(checkKT134ComplaintRoute(matched,3,'Изискване на конкретно становище от компетентна институция').ok,true);
assert.equal(checkKT134ComplaintRoute(matched,3,'Обща правна неяснота').ok,false);
assert.equal(checkKT134ComplaintRoute({complaintReview:false},1).ok,true,'No regression for new IP');
console.log('KT134 purpose: complaint evidence and routing guard passed; no single panel preset');
