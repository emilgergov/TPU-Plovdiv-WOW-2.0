# TPU Plovdiv — Cloudflare AI Author V27

Isolated Cloudflare Worker deployment. Does not modify GitHub Pages or the expert module.

## GitHub Actions secrets (repository settings → Secrets and variables → Actions)
- `CLOUDFLARE_API_TOKEN`: scoped token with Workers Scripts: Edit for the target account.
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account identifier (not an API key).

The `OPENAI_API_KEY` must remain a **Cloudflare Worker Secret**, not a plain-text variable or GitHub file. Existing Worker secrets should be checked after deployment.

Run **Actions → Deploy Cloudflare AI Author V27 → Run workflow** after setting the GitHub secrets.

`GET /health` returns deployment health and whether the OpenAI key is configured (not its value).

**Security gate:** `POST /author` intentionally returns 503 until authentication, abuse limits, data minimization, and expert-review workflow are implemented. Do not put a paid OpenAI endpoint on the public Internet without those protections. No dossiers are sent to OpenAI in this bootstrap.
