# КТ134-Ж.9 — проверка на реалния Cloudflare достъп от GitHub

Дата: 25.11.2026 г.
Клон: `kt134-auto-mode-isolated`. Няма промени в `main`, КТ133, продукционен Worker, D1 или R2.

## Потвърдено с GitHub Actions (реален GET към Cloudflare)
1. Първи read-only run: https://github.com/emilgergov/TPU-Plovdiv-WOW-2.0/actions/runs/45504788213
   - `GET /user/tokens/verify`: **HTTP 401**.
   - Това **не доказва само по себе си** невалиден секрет.
2. Втори независим read-only run: https://github.com/emilgergov/TPU-Plovdiv-WOW-2.0/actions/runs/45504882454
   - `GET /user/tokens/verify`: **HTTP 401**.
   - `GET /accounts/{account}/workers/scripts/{kt133-gateway}/settings`: **HTTP 200**.
   - Върнатите типове bindings: `service:1`, `plain_text:1`.
   - Следователно GitHub secret удостоверява поне достъп за **четене** на настройките на действащия gateway Worker. Не е нужно да се подменя токенът въз основа само на 401 от verification endpoint.
3. Поправен workflow `.github/workflows/kt134-cloudflare-github-first-readonly.yml`:
   - `401` на `/user/tokens/verify` вече е **информационен**, ако protected Worker settings GET е 200.
   - Извлича името на единствения вътрешен service binding само в временен частен файл на GitHub runner; прави към него само settings GET; публикува **единствено типовете bindings**, никога имена, идентификатори, секрети, код или реални преписки.
   - Запазва възможността за read-only проверка на изолиран тестов Worker само при валидна отделна конфигурация.
   - Не извършва PUT/POST/PATCH/DELETE към Cloudflare.
   - Коригиращ commit: `363dadeafcf2d0db0f9616d9e6f398bf092d8299`. Резултатът от изпълнението на този конкретен commit **все още не е потвърден**.

## Какво остава непотвърдено
- Достъп до същинския защитен backend Worker и способността да се прегледа неговият транзакционен контракт без изнасяне на частни данни.
- Съществуване и права на отделни тестови Worker, D1 и R2.
- Права за внедряване, тестови D1 миграции или R2 запис (не следват от GET 200).
- Истинска KT125 session+ACL интеграция и атомарен commit.
- End-to-end маршрута през реална преписка и окончателна експертна приемка.

## Следващо действие
Първо се проверяват безопасните резултати от read-only metadata audit към вътрешния service Worker. Ако няма отделен тестов Worker/D1/R2 или релевантни права, се спира без продукционно внедряване и се посочва **едно конкретно необходимо действие**, вместо множество ръчни настройки.
