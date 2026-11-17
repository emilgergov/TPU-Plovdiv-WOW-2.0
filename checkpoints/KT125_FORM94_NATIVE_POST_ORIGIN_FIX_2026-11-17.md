# КТ125 FORM94 — корекция на HTML POST политиката

Наблюдение от реалния Chrome: след публикуване на EMAIL93 формулярът по име/имейл/роля се вижда. Опитът за покана връща общ JSON отказ на /kt125/admin/users/invite. Самият отказ не доказва записана покана. Реалните HTTP request headers не са прочетени.

Установен кодов дефект: kt125PrivateHtmlResponse задава Referrer-Policy:no-referrer, докато validPrivateMutationOrigin изисква Origin да е точно PRIVATE_ORIGIN. Според WHATWG Fetch, при POST на HTML форма (navigate, не cors) no-referrer води до Origin:null. Това е конкретно противоречие в кода и обяснение за наблюдавания симптом; точните заглавки на реалния отказ не са наблюдавани.
Източник: https://fetch.spec.whatwg.org/#append-a-request-origin-header (стъпки 4.1/4.2).

Ограничена промяна: Referrer-Policy:same-origin за защитените HTML отговори. Origin при същия произход се запазва; cross-origin Referer не се изпраща. Няма приемане на Origin:null, липсващ Origin или чужд Sec-Fetch-Site; няма изключване на проверка за произход, роля, самоличност или журнал. Няма нови настройки, секрети, миграции или Access промени.

Source f4f289a1c86bdeb73e050979c95fb885c8959d75. GitHub validation №94/run 44184235901 SUCCESS. Bundle build №6/run 44184235902 SUCCESS. Локално 21 тестови файла PASS. Добавени изрични проверки за same-origin Referrer-Policy на users/административни, grant и activation HTML, и запазен отказ за Origin:null.

Artifact 14373008497, ZIP SHA256 9513d155125eea5645ac65b953cf7c1123cbc314318f007e8bf4f1cecdf20bbb. KT125_PRIVATE_WORKER_FORM94.txt: 104985 bytes, проверени archive digest, standalone bundle и Node syntax.

Все още НЕ е публикувана FORM94; реална покана/активация не са потвърдени. ЕГМАСТЕР входът и регистърът от EMAIL93 се виждат на реалните снимки. Публикуване само в tpu-plovdiv-kt125-private; после НОВ GET на „Потребители“/Ctrl+F5 преди нова покана. Не resubmit на старата POST страница и не използвайте кеширана предишна форма.

Основният Worker, КТ124-R6, Етапи 1–5 и Word/PDF не са променени. КТ125 остава отворена; КТ126 не започва.
Ключова дума: WOW-КТ125-FORM94-HTML-POST-ПРОИЗХОД-НОВ-ФОРМУЛЯР
