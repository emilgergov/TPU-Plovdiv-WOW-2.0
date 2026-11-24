# КТ134-Ж.10 — реална КТ125 инфраструктура и граници на тестовото внедряване
Дата: 25.11.2026 г.
Клон: `kt134-auto-mode-isolated`; без промени в main и продукционната КТ133.

## Потвърдено от реални read-only GitHub Actions
Успешни runs:
- KT125 gateway+backend metadata: https://github.com/emilgergov/TPU-Plovdiv-WOW-2.0/actions/runs/45505269847
- KT125 backend source structure: https://github.com/emilgergov/TPU-Plovdiv-WOW-2.0/actions/runs/45505581148
- Workers / D1 / R2 metadata-only inventory: https://github.com/emilgergov/TPU-Plovdiv-WOW-2.0/actions/runs/45505669651

### Реален KT125 Worker
- Входен gateway settings GET: HTTP 200.
- Backend settings GET: HTTP 200.
- Backend source GET: HTTP 200. Байт размер 1 084 216, SHA-256 `7acd14e386501d1dfe174720b3b721e297b981d89dd7bdd51351c6dffc1c194e`. Кодът е бил само във временен GitHub runner и **не е публикуван или записан в GitHub**.
- Потвърдени само като presence markers: `case.confirm`, `case.edit`, `document.generate`, `kt126_registry`, SQL UPDATE, локален `/auth/login`, Durable Object.
- Маркер `kt134.auto-dossier-analyze.v1` **не е намерен** в действителния код. Няма основание да се твърди жив маршрут КТ134.
- Backend bindings: `secret_text:3`, `d1:1`, `service:2`, `plain_text:9`, `durable_object_namespace:1`. Това доказва типове връзки, не наличието на валиден автоматичен маршрут.
- `/user/tokens/verify`: HTTP 401; независимо от това Worker settings/source са прочетени с HTTP 200. Следователно не следва подмяна на токен само заради 401 от verification endpoint.

### Account inventory (само metadata, без имена/ID)
- Workers list GET: HTTP 200; 7 видими; **0 намерени тестови кандидати по шаблон** (kt134/staging/stage/sandbox/test), като това не доказва пълно отсъствие на различно именувани тестови Workers.
- D1 list GET: HTTP 200; 1 видима база; 0 разпознати отделни тестови кандидати.
- R2 buckets list GET: HTTP 403; текущият токен няма доказани R2-list права. Това не доказва, че R2 липсва.
- `KT134_TEST_WORKER_NAME` не е зададена (няма доказан isolated staging Worker).

## Извод и безопасно решение
- Съществуващият GitHub secret позволява **read-only** проучване на реалния KT125 и част от Cloudflare ресурсите.
- Това **не доказва deploy права**, отделни тестови D1/R2 ресурси или техническа възможност за безопасно KT134 внедряване.
- Забранено е да се използва единствената видима D1 или продукционният KT125 за синтетични KT134 миграции. Забранено е продукционно публикуване без експертна приемка.
- Не трябва да се преписва скритият оригинален KT125 Worker в публичното хранилище.
- Следващата практическа стъпка е **еднократно осигуряване на изолирана тестова среда**, достъпна през GitHub Actions (test Worker + отделна D1 + частен R2 + минимални права). Преди това може да се разработва само изолираният интеграционен код и договорите.

## Приемка
Проверка на реалните зависимости за staging, синтетична преписка, автоматичен маршрут през етапи 1–5, проверен Word, ревизионен lock, независим рецензент и единствено финално експертно решение. КТ133 остава непроменена.
