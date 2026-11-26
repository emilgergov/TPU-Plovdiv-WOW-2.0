# КТ134 — корекция на входа ORIGIN_REJECTED — 26.11.2026

## Установен дефект
Браузърът на експерта получаваше `{"error":"ORIGIN_REJECTED"}` на `/auth/login`, въпреки че предишните CI проверки са отчитали статус HTTP 200. Предишните проверки са били недостатъчни, защото не са проверявали HTML съдържанието или поведение при стари browser cookies.

## Изпълнена корекция (само тестова среда)
- В `kt134-kt125-native-auth-proxy.mjs` GET към публичната форма за вход НЕ прехвърля старите KT134 browser cookies към оригиналния KT125 service binding; POST остава със същия origin guard и същата native authentication.
- Тест `kt134-kt125-native-auth-proxy.test.mjs` проверява точно този сценарий.
- CI workflow `kt134-kt125-bridge-staging-deploy.yml` изисква действителна HTML форма и при GET с `Cookie: kt125_session=expired; kt134_test_session=stale`, и при GET без cookies. Проверява липсата на `ORIGIN_REJECTED` в съдържанието, а не само статуса.
- Пълното внедряване и новият стриктен live smoke test: **SUCCESS**, https://github.com/emilgergov/TPU-Plovdiv-WOW-2.0/actions/runs/45791689171
- Продукционният КТ133 не е променян.

## Ограничение
Това потвърждава външна GET проверка с контролиран тестов Cookie. Реална потребителска сесия и POST вход на конкретния експерт още не са приемани. Общият тест на преписка Е1–Е5 също не е приет.

## Тестов адрес
`https://tpu-plovdiv-kt134-test.emilgergov.workers.dev/auth/login?kt134_fix=origin-cookie-02`
