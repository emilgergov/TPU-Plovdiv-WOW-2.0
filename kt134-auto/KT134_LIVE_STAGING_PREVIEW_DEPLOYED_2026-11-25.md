# КТ134 — първо реално внедряване на постоянния изолиран Worker
Дата: 25.11.2026 г. 

## Действително публикувано
Worker: `tpu-plovdiv-kt134-test` — **същият вече съществуващ тестов Worker**, а не нова услуга.

Публичен адрес за първа синтетична визуална приемка:
https://tpu-plovdiv-kt134-test.emilgergov.workers.dev/kt134/preview

Вътрешен диагностичен адрес (без данни от преписки):
https://tpu-plovdiv-kt134-test.emilgergov.workers.dev/kt134/health

### Положителна интеграционна проверка
GitHub Actions: https://github.com/emilgergov/TPU-Plovdiv-WOW-2.0/actions/runs/45524941402

- Отделните Cloudflare staging Worker, D1 и R2 bindings са проверени от production READ-ONLY API preflight.
- Успешно компилиране на Worker с Wrangler.
- Реален `wrangler deploy` към **само** тестовия Worker и точно `DB`/`BUCKET` от вече одобрената инфраструктура.
- HTTP GET `/kt134/health`: `mode=synthetic_preview_only`, `DB=true`, `BUCKET=true`, `ready=true`, `liveEG=false`, `liveGIS=false`, `liveDOCX=false`, `expertConfirmed=false`.
- HTTP GET `/kt134/preview`: реален HTML с изрично `ИЗОЛИРАНА ДЕМОНСТРАЦИЯ — НЕ Е РЕАЛЕН АНАЛИЗ`.
- Действителна проверка на HTTP отговорите: PASS.

### Състав
- `kt134-auto/kt134-staging-preview-worker.mjs`
- `kt134-auto/wrangler.staging.toml`
- `.github/workflows/kt134-staging-preview-deploy.yml`
- `kt134-auto/KT134_AUTO_VISUAL_DEMO.html`

## Ограничения
Това е **реална публикация на визуален тест**, а не реален казус:
- Показваната преписка и EG изходи са синтетични, не П4.
- Няма live KT125 session/ACL integration.
- Няма EG Автор/рецензент call, PDF1 от текущ GIS, реален DOCX/административно одобрение.
- Няма D1 SQL/R2 object create/read/write от тестовата публична заявка; health само проверява тип на binding обектите.
- Публичното демо не е окончателна одобрена златисто-зелена визия. Следва сравнителна експертна оценка.

**КТ133, продукционният KT125 и тяхната D1 не са цел на deploy.** В бъдеще се използват същите тестови ресурси; не се създава нов Cloudflare акаунт, токен или Worker при всяка версия.
