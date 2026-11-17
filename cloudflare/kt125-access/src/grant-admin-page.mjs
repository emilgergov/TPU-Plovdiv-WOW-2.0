/**
 * KT125-VT02.2: immutable server-rendered grant management form.
 * No JavaScript, no browser access token, and no case contents.
 * Role + ownership are verified in a private worker before rendering.
 */
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>
 ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const validId=value=>typeof value==="string"&&/^[A-Za-z0-9_-]{1,160}$/.test(value);
const labels=Object.freeze({
 "case.read":"Четене на преписката",
 "case.review":"Преглед",
 "case.edit":"Редактиране",
 "case.confirm":"Потвърждаване",
 "document.generate":"Генериране на документ"
});
const css=`*{box-sizing:border-box}:root{color-scheme:dark;font:14px/1.5 Verdana,Arial;background:#0b271d;color:#f5f1de}
body{margin:0;background:radial-gradient(ellipse at 90% 0,#26553c,transparent 48%),#0b271d;min-height:100vh}
header{background:#0b271d;border-bottom:1px solid #b19b61;padding:15px max(18px,calc((100vw - 1120px)/2))}
main{max-width:1120px;margin:0 auto;padding:20px}
h1,h2{font-family:Georgia,serif;color:#f5d68c;margin:5px 0 12px}
h1{font-size:23px}h2{font-size:19px}p{color:#e0e9d9}
.back{color:#f5d68c;text-decoration:none;font-weight:700}
section{background:#15392b;border:1px solid #7b8867;border-radius:10px;padding:18px;margin:12px 0}
.notice{background:#294936;border-left:4px solid #e2bb6e;padding:12px;border-radius:6px}
.inline{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
input[type=text]{width:min(100%,320px);background:#fffced;border:1px solid #b9a271;color:#173d2e;padding:10px;border-radius:6px;font:inherit}
label{display:block;margin:6px 0}
fieldset{border:1px solid #789280;border-radius:8px;padding:10px;margin:10px 0}
legend{font-weight:700;color:#ffe2a5}
form{margin:12px 0;border-top:1px solid #446c56;padding-top:12px}
button{background:#d7b56d;color:#133a2a;border:1px solid #efd18b;padding:9px 14px;border-radius:7px;font:700 13px Verdana;cursor:pointer}
button:focus-visible,input:focus-visible{outline:3px solid #ffdc8c;outline-offset:2px}
.muted{color:#bfd1c4;font-size:12px}table{width:100%;border-collapse:collapse}td,th{text-align:left;vertical-align:top;border-bottom:1px solid #52745c;padding:10px}
th{background:#28503b;color:#f8d998}.tablewrap{overflow:auto}
button.warn{background:#8d4236;color:#fff4e9;border-color:#e4aa87}
@media(max-width:700px){main{padding:10px}section{padding:12px}.inline{display:block}}
`;
function actionFields(){
 return Object.entries(labels).map(([code,label])=>
  `<label><input type="checkbox" name="action" value="${esc(code)}"${code==="case.read"?" checked":""}> ${esc(label)}</label>`
 ).join("");
}
export function renderKT125GrantManagement({
 caseId,ownerId,status,items=[],canChange=false,hasMore=false
}={}){
 if(!validId(caseId)||!validId(ownerId))throw Error("Invalid case metadata");
 const editable=canChange&&status==="active";
 const grantForm=editable?`<section><h2>Предоставяне на достъп</h2>
 <p>Само водещият експерт може да предоставя конкретни права за тази преписка. Разрешението е за 7 дни. Без автоматично подновяване.</p>
 <form method="post" action="/kt125/cases/${esc(caseId)}/grants/form">
 <label for="kt125Grantee">Служебен идентификатор на упълномощения експерт</label>
 <input id="kt125Grantee" type="text" name="grantee" pattern="[A-Za-z0-9_-]{1,160}" maxlength="160" required autocomplete="off">
 <fieldset><legend>Разрешени действия</legend>${actionFields()}</fieldset>
 <label><input type="checkbox" name="confirm" value="GRANT" required> Потвърждавам предоставянето за 7 дни</label>
 <button type="submit">Предостави достъп</button>
 </form></section>`:"";
 const grants=items.length?`<div class="tablewrap"><table><thead><tr><th>Упълномощен</th><th>Права</th><th>Срок</th><th>Състояние</th>${editable?"<th>Управление</th>":""}</tr></thead>
 <tbody>${items.slice(0,50).map(g=>{
  const id=validId(g.grantId)?g.grantId:null;
  const rights=Array.isArray(g.actions)?g.actions.filter(a=>Object.hasOwn(labels,a)).map(a=>labels[a]).join(", "):"";
  const expiry=Number.isFinite(g.expiresAtMs)?new Date(g.expiresAtMs).toLocaleString("bg-BG",{timeZone:"Europe/Sofia"}):"—";
  return `<tr><td>${esc(g.granteeId)}</td><td>${esc(rights)}</td><td>${esc(expiry)}</td><td>${g.revoked?"Отнет":"Регистриран"}</td>
  ${editable?`<td>${id&&!g.revoked?`<form method="post" action="/kt125/cases/${esc(caseId)}/grants/${esc(id)}/revoke">
   <label><input type="checkbox" name="confirm" value="REVOKE" required> Потвърждавам</label>
   <button type="submit" class="warn">Отнеми достъпа</button></form>`:"—"}</td>`:""}</tr>`;
 }).join("")}</tbody></table></div>`:"<p>Няма регистрирани делегирания за тази преписка.</p>";
 return `<!doctype html><html lang="bg"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
 <title>WOW · Достъп до преписка</title><style>${css}</style></head><body>
 <header><small>WOW · КТ125 · Защитен служебен достъп</small><h1>Права по преписка</h1>
 <a class="back" href="/kt125/admin/panel/cases">← Към управлението на достъпа</a></header>
 <main><section><h2>Преписка ${esc(caseId)}</h2><p>Водещ експерт: <strong>${esc(ownerId)}</strong>. Състояние: ${esc(status)}.</p>
 <div class="notice">${editable?"Управление от водещ експерт.":"Режим на преглед. Нямате право да променяте делегирането или преписката не е активна."}</div></section>
 ${grantForm}<section><h2>Предоставени права</h2>${grants}
 ${hasMore?'<p class="muted">Показани са 50 записа; останалите изискват допълнителен преглед.</p>':""}
 <p class="muted">Този екран показва права, а не съдържание на преписката. Действията изискват служебна идентичност, сървърна проверка и журнал.</p>
 </section></main></body></html>`;
}
