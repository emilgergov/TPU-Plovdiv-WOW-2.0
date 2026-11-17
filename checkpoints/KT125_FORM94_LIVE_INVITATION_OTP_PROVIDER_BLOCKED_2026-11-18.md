# КТ125 — реална покана е записана; OTP е последната блокирана настройка

18.11.2026 Europe/Sofia.

След ръчно публикуване на FORM94 и нов GET на „Потребители“ е показана реално записана покана за test1234, role Експерт, статус „Чака потвърждение“, срок 24.11.2026 23:55:42 Europe/Sofia. Това потвърждава работещото добавяне/четене на покани в D1, но не личната активация.

В Workers Access списъка са показани едновременно запазеното WOW-KT125-EGMASTER и Email domain:plovdiv.riew.gov.bg, All traffic. Домейнът е одобрен от потребителя. В отделен инкогнито прозорец служебният вход още показва само бутон Cloudflare.

В Cloudflare One > Integrations > Identity providers се вижда един built-in Cloudflare provider. В приложението > Login methods dropdown също се вижда само Cloudflare. One-time PIN още не е наличен. Бутони Add provider/Save не са видими в предоставените снимки; не трябва да се измислят елементи или да се премахва Cloudflare.

Read-only CI 44188158552: GET /access/identity_providers HTTP200 success, result []; built-in Cloudflare не е в този API списък. Автоматичен еднократен опит за добавяне на одобрения OTP provider (официален type:onetimepin, config:{}) чрез съществуващия credential: run44188313505, GET200, POST403. Няма потвърдено създаване на OTP provider, промяна на policy, Worker, D1 или профили; не са изпращани имейли. Workflow .github/workflows/kt125-enable-email-otp.yml е в работния клон, не е повторно изпълняван след отказа.

Следва лично административно добавяне на One-time PIN в Cloudflare One, запазване на built-in Cloudflare, после включване на двата метода само за текущото приложение с вече одобрения домейн. Не се заменя и не се трие ЕГМАСТЕР policy. Не се променят TEAM_DOMAIN/AUD/ORIGIN, D1 или кодът. След това инкогнито личен вход с имейла от поканата и реален тест на активация/права/журнал. КТ125 остава отворена; КТ126 не е започната.

Ключова дума: WOW-КТ125-FORM94-ПОКАНА-ГОТОВА-ДОМЕЙН-ЗАПАЗЕН-ЧАКА-OTP
