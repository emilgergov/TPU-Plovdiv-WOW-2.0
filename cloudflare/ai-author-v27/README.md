# TPU Plovdiv — Cloudflare AI Author V27

Isolated Cloudflare Worker deployment. Does not modify GitHub Pages or the expert module.

## GitHub Actions secrets (repository settings → Secrets and variables → Actions)
- `CLOUDFLARE_API_TOKEN`: scoped token with Workers Scripts: Edit for the target account.
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account identifier (not an API key).

The `OPENAI_API_KEY` must remain a **Cloudflare Worker Secret**, not a plain-text variable or GitHub file. Existing Worker secrets should be checked after deployment.

Run **Actions → Deploy Cloudflare AI Author V27 → Run workflow** after setting the GitHub secrets.

`GET /health` returns deployment health and whether the OpenAI key is configured (not its value).

**Security gate:** `POST /author` intentionally returns 503 until authentication, abuse limits, data minimization, and expert-review workflow are implemented. Do not put a paid OpenAI endpoint on the public Internet without those protections. No dossiers are sent to OpenAI in this bootstrap.

## V27 — еднократна парола за достъп (Cloudflare)

Публичният интерфейс показва „Парола за AI автор“, но **не съхранява паролата**. Съществуващият Worker проверява подадената стойност срещу Cloudflare Secret `AI_AUTHOR_ACCESS_TOKEN`. Не въвеждайте паролата в GitHub, HTML, чат или публични настройки.

Еднократна настройка от собственика на Cloudflare акаунта:
1. Cloudflare Dashboard → Workers & Pages → `tpu-plovdiv-ai-author-v27` → Settings → Variables and Secrets.
2. Добавете или редактирайте **Secret** `AI_AUTHOR_ACCESS_TOKEN` със силна избрана парола (поне 20 случайни знака). Запазете я в личен password manager; Cloudflare няма да показва стойността впоследствие.
3. Уверете се, че съществуващият `OPENAI_API_KEY` остава конфигуриран като Secret; не го заменяйте.
4. Проверете `/health`: `aiGenerationEnabled: true` показва наличие на двете настройки, но **не** удостоверява успешна платена AI заявка.

Това е еднократна настройка; не генерирайте нова парола при всяка преписка. При изгубена парола се подменя само `AI_AUTHOR_ACCESS_TOKEN`. За споделен достъп помнете, че всички ползват една и съща парола; при компрометиране я сменете за всички. За продукционна употреба добавете ограничаване на заявките и индивидуално удостоверяване.
