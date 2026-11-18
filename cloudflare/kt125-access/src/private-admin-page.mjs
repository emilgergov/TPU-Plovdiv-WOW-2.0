/**
 * KT125-VT02 — protected read-only server-rendered management page.
 * Deliberately no scripts or browser-held credentials. Only preauthorized
 * metadata from management-read.mjs is passed here.
 */
export const escapeHtml=v=>String(v??"").replace(/[&<>"']/g,
 c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const sectionNames=Object.freeze({
 overview:"Общ преглед",users:"Потребители",roles:"Роли и права",cases:"Преписки",audit:"Журнал"
});
const headers=Object.freeze({
 users:[["user_id","Потребител"],["email","Служебен имейл"],["role","Роля"],["active","Активен"],["updated_at_ms","Последна промяна"]],
 cases:[["case_id","Вътрешен идентификатор"],["owner_id","Водещ експерт"],["status","Състояние"],["updated_at_ms","Последна промяна"]],
 audit:[["event_id","Събитие"],["case_id","Преписка"],["actor_id","Извършител"],["action","Действие"],["outcome","Резултат"],["timestamp_ms","Време"]]
});
export const kt125PageCss=`:root{color-scheme:dark;font:14px/1.5 Verdana,Arial,sans-serif;background:#0b271d;color:#f5f0de}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(ellipse at 95% 0,#24563e,transparent 45%),#0b271d}
main{max-width:1380px;margin:auto;padding:18px}
header{background:#09221a;border-bottom:1px solid #aa8d52;padding:15px max(16px,calc((100vw - 1380px)/2));}
h1{font:700 24px Georgia,serif;color:#f5d588;margin:3px 0}
h2{font:700 21px Georgia,serif;color:#f5d588;margin:0 0 14px}
small{color:#c7d5c9}.notice{background:#244535;border-left:4px solid #e0bb6e;border-radius:7px;padding:13px;margin-bottom:14px}
.layout{display:grid;grid-template-columns:230px minmax(0,1fr);gap:15px}
nav{display:flex;flex-direction:column;gap:8px;align-self:start}
nav a{display:block;text-decoration:none;padding:11px 12px;border:1px solid #799079;background:#194733;border-radius:7px;color:#f5efdd;font-weight:700}
nav a[aria-current="page"]{background:#d6b66d;color:#173829}
.panel{background:#123629;border:1px solid #8c865c;border-radius:10px;min-height:420px;padding:19px}
p{color:#e0eade}.tablewrap{overflow-x:auto}
table{width:100%;border-collapse:collapse}
form{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
form label{font-size:12px}
form input[name="name"],form input[name="email"]{display:block;width:min(100%,440px);min-width:280px;font:inherit;padding:9px 10px;border:1px solid #799079;border-radius:6px;background:#092b20;color:#f5f0de}
form .wide-field{flex:1 1 340px;min-width:0}
form .wide-field input{width:100%;max-width:none;min-width:0}
textarea{display:block;width:100%;min-height:120px;resize:vertical;font:inherit;padding:10px;border:1px solid #799079;border-radius:6px;background:#092b20;color:#f5f0de}
form .full-field{flex:1 0 100%}.request-note{white-space:pre-wrap;overflow-wrap:anywhere}
@media(max-width:500px){form input[name="name"],form input[name="email"]{min-width:0;width:100%}}
form button{background:#d9b771;border:1px solid #f0ce8a;color:#153828;border-radius:6px;padding:7px 10px;font:700 12px Verdana,Arial;cursor:pointer}
form button:focus-visible{outline:3px solid #f3db9b;outline-offset:2px}td,th{text-align:left;padding:10px;border-bottom:1px solid #56745e;vertical-align:top;overflow-wrap:anywhere}
th{background:#28533e;color:#f5d99a}
.state{padding:10px;border:1px dashed #77907c;border-radius:8px;background:#224836}
.disabled{color:#c3d0c3;font-size:12px;margin-top:15px}
@media(max-width:790px){.layout{grid-template-columns:1fr}nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}main{padding:12px}}
`;
const readable=(key,value)=>{
 if(key==="active")return value===1?"Да":"Не";
 if(key==="role")return ({egmaster:"ЕГМАСТЕР",administrator:"Администратор",expert:"Експерт",reviewer:"Преглеждащ",delegated_expert:"Упълномощен експерт"})[value]||String(value??"—");
 if(key.endsWith("_ms")&&Number.isSafeInteger(value))return new Date(value).toLocaleString("bg-BG",{timeZone:"Europe/Sofia"});
 return String(value??"—");
};
export function renderKT125PrivatePage({section="overview",items=[],hasMore=false,invitations=[],invitationsHasMore=false,directoryUnavailable=false,accessRequests=[],requestsUnavailable=false,requestsHasMore=false,mailConfigured=false,localMode=false,localOrigin=""}={}){
 if(!Object.hasOwn(sectionNames,section))throw Error("Unknown management section");
 const nav=Object.keys(sectionNames).map(k=>
  `<a href="/kt125/admin/panel/${k}"${k===section?' aria-current="page"':""}>${escapeHtml(sectionNames[k])}</a>`).join("");
 const columns=headers[section]||[];
 const roleMatrix=`<div class="tablewrap"><table><thead><tr><th>Роля</th><th>Системни права</th><th>Достъп до преписки</th></tr></thead>
  <tbody><tr><td>ЕГМАСТЕР</td><td>Потребители, настройки, журнал</td><td>Без автоматичен прочит</td></tr>
  <tr><td>Администратор</td><td>Потребители, настройки</td><td>Без автоматичен прочит</td></tr>
  <tr><td>Експерт</td><td>Работни действия по лични преписки</td><td>Собствени и изрично делегирани</td></tr>
  <tr><td>Преглеждащ</td><td>Няма системно администриране</td><td>Само изрично разрешени</td></tr>
  <tr><td>Упълномощен експерт</td><td>Няма системно администриране</td><td>Само за посочено действие и срок</td></tr></tbody></table></div>`;
 const disableAction=r=>{
   const target=r.user_id;
   if(typeof target!=="string"||!/^[A-Za-z0-9_-]{1,160}$/.test(target)||![0,1].includes(r.active))return "<td>—</td>";
   return `<td><form method="post" action="/kt125/admin/users/${escapeHtml(target)}/${r.active===1?"disable":"enable"}">
   <label><input type="checkbox" required name="confirm" value="${r.active===1?"DEACTIVATE":"REACTIVATE"}"> Потвърждавам</label>
   <button type="submit">${r.active===1?"Деактивирай":"Активирай"}</button></form></td>`;
 };
 const caseGrantLink=r=>{
  const id=r.case_id;
  if(typeof id!=="string"||!/^[A-Za-z0-9_-]{1,160}$/.test(id))return "<td>—</td>";
  return `<td><a href="/kt125/cases/${escapeHtml(id)}/manage">Виж правата</a></td>`;
 };
 const enrollment=section==="users"&&localMode?`<div class="state"><strong>Регистрация в нашия модул</strong><p>Потребителят избира собствено име и парола и подава заявка. Одобрете я от списъка по-долу. Паролите не се показват в панела.</p><a href="${escapeHtml(localOrigin)}/auth/register" target="_blank" rel="noopener">Адрес за заявяване на достъп</a></div>`:section==="users"?`<div class="state"><strong>Добавяне на потребител</strong>
 <p>Запишете име, служебен имейл и роля. Профилът се активира, когато поканеният влезе със същия удостоверен имейл и потвърди регистрацията. Поканата е валидна 7 дни.</p>
 <form method="post" action="/kt125/admin/users/invite">
 <label class="wide-field">Име <input name="name" required maxlength="80" autocomplete="off" aria-label="Име"></label>
 <label class="wide-field">Служебен имейл <input name="email" type="email" required maxlength="254" autocomplete="off" aria-label="Служебен имейл"></label>
 <label>Роля <select name="role" required><option value="expert">Експерт</option><option value="reviewer">Преглеждащ</option><option value="delegated_expert">Упълномощен експерт</option></select></label>
 <label><input type="checkbox" name="confirm" value="INVITE" required> Потвърждавам добавянето</label>
 <button type="submit">Запиши покана</button></form>
 <p>Поканата се записва тук; имейл не се изпраща автоматично. Служителят отваря общия <a href="/kt125/enrollment/activate">адрес за активиране</a>. Входът му трябва да е допуснат от служебната система за удостоверяване.</p>
 </div>`:"";
 const invitationStates={pending:"Чака потвърждение",accepted:"Активирана",revoked:"Оттеглена",expired:"Изтекла"};
 const pendingTable=section!=="users"||localMode?"":directoryUnavailable?
  '<p class="state">Списъкът с покани временно не е достъпен. Не записвайте повторна покана, преди да проверите резултата.</p>':
  `<h3>Покани</h3>${invitations.length?`<div class="tablewrap"><table><thead><tr><th>Име</th><th>Служебен имейл</th><th>Роля</th><th>Състояние</th><th>Валидна до</th><th>Управление</th></tr></thead><tbody>${invitations.slice(0,50).map(i=>`<tr><td>${escapeHtml(i.display_name)}</td><td>${escapeHtml(i.email)}</td><td>${escapeHtml(readable("role",i.role))}</td><td>${escapeHtml(invitationStates[i.status]||"Неизвестно")}</td><td>${escapeHtml(readable("expires_at_ms",i.expires_at_ms))}</td><td>${["pending","expired"].includes(i.status)&&/^[A-Za-z0-9_-]{1,160}$/.test(i.invitation_id)?`<form method="post" action="/kt125/admin/invitations/${escapeHtml(i.invitation_id)}/revoke"><label><input type="checkbox" name="confirm" value="REVOKE" required> Потвърждавам</label><button type="submit">Оттегли поканата</button></form>`:"—"}</td></tr>`).join("")}</tbody></table></div>`:'<p>Няма записани покани.</p>'}${invitationsHasMore?'<p>Показани са последните 50 покани.</p>':""}<h3>Регистрирани потребители</h3>`;
 const requestStates={pending:"Чака одобрение",approved:"Одобрена",rejected:"Отказана"};
 const mailStates={queued:"Чака изпращане",sending:"Изпращането се проверява",accepted:"Приета за изпращане",failed:"Не е изпратена",uncertain:"Неясен резултат — проверете изпращането"};
 const requestTable=section!=="users"?"":`<h3>Заявки за достъп</h3>${mailConfigured?"":'<p class="state">Автоматичното изпращане на покани по имейл още не е настроено. Одобрените покани остават в изчакване за изпращане.</p>'}${requestsUnavailable?'<p class="state">Заявките временно не са достъпни.</p>':accessRequests.length?`<div class="tablewrap"><table><thead><tr><th>Име и имейл</th><th>Забележка</th><th>Състояние</th><th>Решение</th></tr></thead><tbody>${accessRequests.slice(0,50).map(r=>`<tr><td>${escapeHtml(r.display_name)}<br>${escapeHtml(r.email)}</td><td class="request-note">${escapeHtml(r.note||"—")}</td><td>${escapeHtml(requestStates[r.status]||"Неизвестно")}${r.auth_kind==="local"?`<br>${r.activated_at_ms?"Първият вход е потвърден":"Имейлът се потвърждава при първия вход от писмото"}`:""}${r.mail_state?`<br>${escapeHtml(mailStates[r.mail_state]||"Проверете изпращането")}`:""}</td><td>${r.status==="pending"&&/^[A-Za-z0-9_-]{1,160}$/.test(r.existing_user_id||"")?`<p>Наличен служебен профил. Ролята се запазва.</p><form method="post" action="/kt125/admin/requests/${escapeHtml(r.request_id)}/link"><input type="hidden" name="target_user_id" value="${escapeHtml(r.existing_user_id)}"><label><input type="checkbox" name="confirm" value="LINK" required> Потвърждавам свързването с този профил</label><button>Свържи профила</button></form>`:""}${r.status==="pending"&&/^[A-Za-z0-9_-]{1,160}$/.test(r.request_id)?`<form method="post" action="/kt125/admin/requests/${escapeHtml(r.request_id)}/decide"><label>Роля <select name="role"><option value="expert">Експерт</option><option value="reviewer">Преглеждащ</option><option value="delegated_expert">Упълномощен експерт</option></select></label><label><input type="checkbox" required name="confirm" value="DECIDE"> Потвърждавам решението</label>${r.existing_user_id?"":'<button name="decision" value="approve">Одобри</button>'}<button name="decision" value="reject">Откажи</button></form>`:r.status==="approved"&&(r.auth_kind==="local"?["queued","failed"]:["queued","failed","sending"]).includes(r.mail_state)?`<form method="post" action="/kt125/admin/requests/${escapeHtml(r.request_id)}/mail"><label><input type="checkbox" name="confirm" value="SEND" required> Потвърждавам</label><button>Изпрати поканата</button></form>`:"—"}${r.auth_kind==="local"&&r.status==="approved"&&!r.activated_at_ms?`<form method="post" action="/kt125/admin/requests/${escapeHtml(r.request_id)}/renew"><label><input type="checkbox" name="confirm" value="RENEW" required> Обезсилвам старата връзка</label><button>Изпрати нова връзка</button></form>`:""}</td></tr>`).join("")}</tbody></table></div>`:'<p>Няма заявки за достъп.</p>'}${requestsHasMore?'<p>Показани са последните 50 заявки.</p>':""}`;
 const table=section==="overview"
  ?`<div class="state">Защитен служебен режим. Информацията за потребители, преписки и журнал се извлича само след проверка на самоличността и съответните права.</div>
  <p>ЕГМАСТЕР и администраторът не получават автоматичен достъп до съдържанието на преписките.</p>`
  :section==="roles"?roleMatrix
  :items.length
    ?`<div class="tablewrap"><table><thead><tr>${columns.map(([,label])=>`<th scope="col">${escapeHtml(label)}</th>`).join("")}${section==="users"?"<th scope=\"col\">Управление</th>":section==="cases"?"<th scope=\"col\">Права</th>":""}</tr></thead>
    <tbody>${items.slice(0,50).map(r=>`<tr>${columns.map(([key])=>`<td>${escapeHtml(readable(key,key==="user_id"?(r.display_name||r.user_id):r[key]))}</td>`).join("")}${section==="users"?disableAction(r):section==="cases"?caseGrantLink(r):""}</tr>`).join("")}</tbody></table></div>
    ${hasMore?'<p class="disabled">Показани са първите 50 записа. Разширеното търсене предстои.</p>':""}`
    :`<div class="state">Няма налични записи в този раздел.</div>`;
 return `<!doctype html><html lang="bg"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
 <meta name="robots" content="noindex,nofollow"><title>WOW · ЕГМАСТЕР · ${escapeHtml(sectionNames[section])}</title>
 <style>${kt125PageCss}</style></head><body>
 <header><small>WOW · ЕГМАСТЕР · КТ125</small><h1>Управление на достъпа</h1>
 <small>Проверен служебен достъп · защитен регистър</small></header>
 <main><div class="notice">Показват се само разрешените служебни данни. Няма публичен достъп до преписки.</div>
 <div class="layout"><nav aria-label="Управление на достъпа">${nav}</nav>
 <section class="panel"><h2>${escapeHtml(sectionNames[section])}</h2>${requestTable}${enrollment}${pendingTable}${table}
 <p class="disabled">За промяна на права се изисква отделно потвърдено служебно действие. Данните не се записват в браузъра.</p>
 </section></div></main></body></html>`;
}
export function kt125PrivateHtmlResponse(content,status=200){
 return new Response(content,{status,headers:{
  "Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store, private",
  "X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY",
  // HTML form navigation under no-referrer serializes Origin as null.
  // same-origin retains the strict POST origin check and sends no cross-origin Referer.
  "Referrer-Policy":"same-origin",
  "Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
 }});
}
export function kt125AccountFailure({activation=false,emailRequired=false,status=403}={}){
 const message=activation?(emailRequired?
  "Входът не предостави удостоверен служебен имейл. Използвайте разрешения служебен начин за вход.":
  "Профилът не е активиран. Влезте с имейла от поканата. Ако отказът остане, администраторът трябва да провери дали поканата е валидна."):
  "Поканата не е записана или променена. Проверете името, имейла, избраната роля и списъка с покани. Не подавайте повторно, преди да проверите резултата.";
 return kt125PrivateHtmlResponse(`<!doctype html><html lang="bg"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WOW · Служебна регистрация</title><style>${kt125PageCss}</style></head><body><header><h1>Служебна регистрация</h1></header><main><p class="state">${message}</p><a href="${activation?'/kt125/enrollment/activate':'/kt125/admin/panel/users'}">${activation?'Към потвърждаването':'Към потребителите'}</a></main></body></html>`,status);
}

