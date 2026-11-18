# KT130 pre-release review before expert's final 1–5 test
19.11.2026. Candidate only; panel 0.6 publication awaits the user's final test.

## Scope
Accepted Stage4/5 workflow retained, expert remains decision maker. No new procedure priorities, no paid author calls or live invitation changes in this review.

## Reproduced/fixed
- Map bounds spread Math.min/max over coordinate arrays throws RangeError for large zone/context unions. Reproduced with 220000 coordinates. Streaming extrema + geometry-identity WeakMap cache replaces only bounds traversal for V603 and V22; coordinates and geometric overlay engine unchanged.
- Word subject: a quote embracing locality caused bold location. Presentation moves only title quote boundary and formats location italic; confirmed body unchanged; no hardcoded parcel.
- PDF1 current V600 + V22 renderer is NOT the V27.35 generator. Original comparison checkpoint remains authoritative. Preserve overview, every individual parcel, administrative fields, separate ZZ/ZT tables, verified ZZ area, explicit archival ZT limitation, nearest-ZZ only verified outside. Fix redundant date suffix, structurally derived five-digit cadastral EKATTE fallback, full-width single parcel, table header/first row and short heading grouping. No invented nearest ZT.
- Common unsigned Office signature objects remain; actual KEP signing in desktop Word not yet verified.

## Access and registry
Existing independent tests cover owner/grants/roles/cross-org isolation/revocation, invitation/activation, atomic annual sequence and rollback, 100 simultaneous registrations, request-key retry idempotency, external-number expert confirmation, optimistic revisions/reopen, private originals/immutable Word. Added explicit new-request/same-archive case-versus-reopen regression.
Access-policy workflow's final broad R6 diff guard was outdated: approved KT130 exact-source additions/qualification input parity triggered it although preceding access tests passed. Explicitly scope exceptions to those six known files, keep all other immutable R6 checks and exact author-origin + GIS qualification parity test. No role authorization relaxed.

## Verification and remaining limits
Local unit reproduction and actual source patch syntax passed. Word private sample rendered on two pages with corrected title bold/italic and existing signature fields. Synthetic PDF rendered with actual content/renderer through local canvas image adapter, source/table content checked; browser-native fonts still require user visual acceptance. Real Chromium command test runs in CI (local Linux process socket restriction prevents launching Chrome here).
Known: PDF1 receipt warning seen in earlier Stage4 screenshot remains to confirm during final cycle; long scanned OCR can take minutes; style/source-use issues and nearly empty Word closing page remain recorded; no assertion of complete 32-zone primary-order coverage (server supplement currently one zone). No live expert account session was impersonated. No substantive administrative text certified for issuance.

## User final cycle
Reload the candidate; either create a genuinely new case with its own EG number, or deliberately reopen existing one preserving its number. Verify map Context/zoom/all/selected/overlaps, inspect PDF1, confirm Stage4, inspect Stage5 sources and generate approved text/Word, then save/reopen. Review screenshot + PDF1 + DOCX. Freeze exact commit only after user acceptance; publish panel0.6 with test status and known limits, never merge main implicitly.
