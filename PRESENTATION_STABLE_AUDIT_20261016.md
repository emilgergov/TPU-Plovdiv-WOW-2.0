# WOW 2.0 — Presentation stable candidate, 16.10.2026

## Locked baseline
- Publication branch: `fix/navigation-gis-20261016` (do not change before QA).
- Candidate branch: `fix/presentation-stable-20261016`.
- Official TPU and original approved media remain untouched.

## Verified audit findings
- Prior navigation evidence: 22 PASS / 0 FAIL; these are route tests, not content completeness tests.
- Audited WOW_APP.html: 32 SDF zone records; species arrays empty in 31 SDF records; one contains 29 entries. This is not proof of the entire species database.
- "Какво знаеш за мен?" still displays pending-story text in audited module.
- Working measure/target/indicator/finance structures exist; completeness and primary-source traceability are unverified.
- 792 complete, individual verified stories are NOT confirmed.
- Presentation screenshot: measures, indicators, financing share inappropriate "no measures" fallback; zone context may not sync with typed code.

## Required before merging candidate
- Inspect source archives (including ~324 MB Library packages) and verify 792 unique species against exact identifiers and narratives; never count duplicate zone-species rows as unique species.
- Distinguish measures, objectives, indicators, financing missing-data messages and validate filtered-zone context.
- Audit links, zone profiles, species stories, photo archives, media, and mobile navigation.
- Preserve current passing navigation tests and add content-aware assertions.
- Mark missing content "ПРЕДСТОИ" without fabricating facts.
- Review candidate visually; merge into publication branch only after explicit QA approval.

## Completed in candidate
- Hide duplicate fixed `#backTree` overlay while keeping in-module navigation.

## Status
IN PROGRESS. No merge or publication performed.