# КТ125 — корекция на JWKS_NETWORK от 17.11.2026

## Доказана причина
Последната реална диагностика връща `JWKS_NETWORK`. Всички предходни bootstrap файлове използват `fetch(..., { redirect: 'error', ... })`. **Cloudflare Workers runtime не поддържа `redirect: 'error'`** и генерира `TypeError` още преди мрежовата заявка, документирано от Cloudflare:
https://developers.cloudflare.com/workers/runtime-apis/request/

Това е конкретен дефект в кода, не доказана повреда на мрежата, Access или D1. Отделно `cache: 'no-store'` е поддържано:
https://developers.cloudflare.com/workers/runtime-apis/fetch/

## Ограничена корекция
В `KT125_EGMASTER_DIAGNOSTIC_SAFE.mjs`:
- `redirect: 'error'` → `redirect: 'manual'`.
- Редиректите не се следват: изискваме точно HTTP 200, без `response.redirected`.
- Пинването на issuer/AUD, RS256 криптографската проверка, срокът на JWT, еднократната регистрация и атомарният журнал остават непроменени.
- Няма нови токени, секрети, права или SQL миграции.

Артефактът за ръчно публикуване на **само** отделния `tpu-plovdiv-kt125-private` е `KT125_EGMASTER_FIX_CLOUDFLARE_FETCH.txt` в работната сесия. Изпълнени са Node syntax check и криптографските тестове (вкл. проверка, че се използва `redirect: manual`). Резултат: PASS.

**Не е публикуван в реалния Worker, не е извършена регистрация на ЕГМАСТЕР.** Не се засяга стабилната КТ124-R6: `1e949e654f9d002f51f7e0b0e8629a78f43512d1`.
