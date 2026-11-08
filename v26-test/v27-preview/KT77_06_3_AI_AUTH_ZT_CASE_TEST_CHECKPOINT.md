# КТ77-06.3 — original expert screen, authenticated AI error diagnosis · 08.11.2026

## User-approved immutable scope
- Only one constatative ZT paragraph in each generated Classic A, Classic B and Expert DOCX, immediately after the ZZ order paragraph.
- PI IDs, ZT category/name bold like ZZ.
- Three original Word etalons unchanged: KT35-A.docx, KT39-B.docx, V27-R02.docx.
- NO modification to existing paragraphs, A/B scenario logic, procedural conclusions, PDF1/PDF2 and GIS.
- Real ZIP dossier testing only, original familiar Expert Analysis screen.

## Observed previous test / genuine blocker
- Scenario A dossier: 3/3 PIs found, GIS and PDF2 present, ZIP not generated.
- AI Cloudflare Worker returned HTTP 502 with providerStatus 401 (AI provider authorization failure). In worker.js, POST to https://api.openai.com/v1/responses returns HTTP 401, wrapped in 502.
- This failure is outside the Word templates. A genuine providerStatus 401 cannot be cured by retry or changing DOCX. Cloudflare Worker Secret OPENAI_API_KEY requires owner verification/rotation if this persists. Do not expose the key to browser, repository, chat or screenshots.
- Fail-closed guarantee: no unverified placeholder Expert Word substitutes an AI-authorized generation.

## Isolated adjustments
- kt77-06-3-ai-client-diagnostic-retry.js: one bounded retry only on transient HTTP 502/503/504/429, not if providerStatus is 401/403. Distinguish provider auth 401/403 from EG token auth 401/403 in on-screen error message; preserves original V27 AI headings and 9000-char guard.
- V27_27_KT77_06_3_EG_ZT_WORD_CASE_TEST.html: cloned original normal Expert Analysis page; only loads new AI client and retains KT7706ZTConstatation post-processor; corrects misleading invalid-password handling for provider 401.
- No modifications to main Word generators or etalons, PDF1, PDF2, worker secret or API endpoint.

## Current acceptance
- Static code inspection and JS syntax check passed.
- The new Pages deploy and full ZIP generation should be checked before declaring PASS.
- If test continues to display AI provider HTTP 401, required next step is to confirm Cloudflare Worker OPENAI_API_KEY, then rerun same dossier. No hidden automatic workaround.

### Public screen
https://emilgergov.github.io/TPU-Plovdiv-WOW-2.0/v26-test/v27-preview/V27_27_KT77_06_3_EG_ZT_WORD_CASE_TEST.html
