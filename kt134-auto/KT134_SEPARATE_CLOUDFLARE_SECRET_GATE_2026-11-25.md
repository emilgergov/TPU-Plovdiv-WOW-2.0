# КТ134 — изолиране на Cloudflare API токена за staging
Дата 25.11.2026 г.; клон `kt134-auto-mode-isolated`.

- Променена `.github/workflows/kt134-isolated-staging-provision.yml` да използва **само** `secrets.KT134_CLOUDFLARE_API_TOKEN`, а не продукционния `secrets.CLOUDFLARE_API_TOKEN`.
- Променен `kt134-isolated-cloudflare-provision.mjs` да чете `KT134_CLOUDFLARE_API_TOKEN`.
- Ако липсва новият секрет: автоматичният GET-only `plan` се пропуска без заявки/промени; изрично избраният ръчен `create` отказва с грешка.
- Проверка на новата конфигурация: https://github.com/emilgergov/TPU-Plovdiv-WOW-2.0/actions/runs/45519555627, изходът потвърди `KT134_CLOUDFLARE_API_TOKEN is not configured`. Няма опит за операции с Cloudflare.
- Нужна е еднократна потребителска стъпка: **нов, отделен account token** за същия Cloudflare акаунт, с минималните необходими разрешения за Workers/D1/R2; запис на стойността **единствено** в GitHub repository Actions secret `KT134_CLOUDFLARE_API_TOKEN`. Не се публикува токен в чат/репо/снимка; не се подменя продукционният secret.
- След това се изпълнява read-only plan, преценяват се точните Cloudflare права, и чак след изрично разрешение — ръчен изолиран provisioning. При потребление на платени ресурси се изисква отделна осъзната преценка.
- КТ133, KT125, D1, R2 и EG Автор в продукция не са променяни с този commit.
