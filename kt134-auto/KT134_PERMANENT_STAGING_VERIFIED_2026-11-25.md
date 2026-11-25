# КТ134 — постоянна тестова среда: проверка в Cloudflare от GitHub (25.11.2026)
**Изпълнено, без изискване за действия от потребителя.**

## Точно удостоверени ресурси
- Worker: `tpu-plovdiv-kt134-test`, **съществуващ**, а не нов.
- D1 binding: `DB` → `kt134-isolated-d1-2026`, UUID `9f977144-c6f1-4fbf-8262-5c48b818bfb1`.
- R2 binding: `BUCKET` → `kt134-isolated-r2-2026`, съществуващ.
- Test Worker има **точно две** изолирани bindings, без service binding към KT125, без други secrets/production bindings.
- Действащата КТ125 D1 е различна от тестовата; проверено чрез protected gateway/service metadata и D1 identity.

### Фактическа read-only CI проверка
GitHub Actions: https://github.com/emilgergov/TPU-Plovdiv-WOW-2.0/actions/runs/45524507958

Шест независими проверки за изолация/идентичност: **6 PASS / 0 BLOCK**. Синтетичните регресии също преминават. Cloudflare API се използва само с GET и съществуващия `CLOUDFLARE_API_TOKEN`. Токенът остава тайна на GitHub, стойността не се извежда. **Нито един Cloudflare ресурс не е създаден или изменен от този workflow.**

Файлове:
- `kt134-auto/kt134-existing-staging-audit.mjs`
- `kt134-auto/kt134-existing-staging-audit.test.mjs`
- `.github/workflows/kt134-existing-staging-readonly.yml`

## Постоянен архитектурен принцип
Тези ресурси се **използват повторно** за КТ134, КТ135 и следващите изолирани тестове; не се създават нови тестови Worker, D1, R2 или токен за всяка версия. Старият автоматизиран сценарий за дублиращо създаване на Cloudflare ресурси е изключен с отказ в `create` mode.

## Какво НЕ е означено като готово
- Няма автоматизирано поставяне на новия интеграционен пакет в реалния staging Worker, нито извикване на живите EG Автор/рецензент. Отделна защитена KT125 host интеграция все още е необходима.
- Binding-и/налични ресурси сами по себе си не означават работещ КТ134.
- Този workflow не проверява дали bucket-ът има public-domain настройка; екранната проверка от Cloudflare го показва като `Public Access: Disabled`.
- Не сме променяли КТ133, продукционния КТ125, потребителските преписки, D1 или R2 в този цикъл.

## Продължение през GitHub, без ново Cloudflare конфигуриране
1. Фиксиран staging deploy пакет, който използва точно `tpu-plovdiv-kt134-test`, `DB`, `BUCKET`.
2. Контрол за запазване на текущия тестов Worker и отдръпване при несъвпадащи binding-и.
3. Реални EG/GIS/PDF1/Word services в защитения host; общ тест с П4 и окончателна експертна приемка.
