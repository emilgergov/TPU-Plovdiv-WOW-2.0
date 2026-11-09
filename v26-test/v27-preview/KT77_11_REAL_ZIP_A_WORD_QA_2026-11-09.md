# KT77-11 — real A ZIP Word acceptance QA (09.11.2026)

## Input
User-provided TPU_Plovdiv_V27_AI_RABOTEN_PAKET (10).zip, README package timestamp 2026-11-09T10:58:09.429Z. Scenario A, GIS no intersection. Package: Classic DOCX, Expert DOCX, GIS PDF, normative PDF, README. This assessment concerns this ZIP only; scenario B not tested.

## Automated content inspection
- ZIP and both nested DOCX files readable; nested ZIP integrity test passed.
- Classic DOCX: **42** body paragraphs; ZT at **#25** immediately after Natura 2000 zone declaration paragraph #24. Original approved KT35 A has 41 body paragraphs. Verified original A minus the added ZT paragraph: **41 preserved positions**, **37 text-identical**, 4 data/requisite changes in original paragraph positions #7, #8, #11, #17 (recipient placeholder, address placeholder, subject/location, incoming registration line). No other old A paragraph changed in text.
- Expert DOCX: **50** body paragraphs; ZT at **#26** immediately after Natura 2000 zone declaration paragraph #25. Expected V27-R02 baseline 49 (not independently byte-diffed in this check).
- For both generated DOCX: ZT paragraph correctly states **no protected-territory overlap** for parcel IDs 56784.13.102 / 56784.13.105 / 56784.13.106, all three IDs bold; Classic has classic opening, Expert has expert opening. These are generated assertions; independent cadastral/spatial truth not re-validated from first principles in this report.
- Classic has five separate List Paragraph impact-direction paragraphs following the ZT insertion.
- The README identifies output as a working draft and includes an AI-authored source hash; successful inclusion of Expert DOCX establishes generation in this submitted ZIP, not ongoing provider credential health.

## Visual render
- Classic rendered to **3 pages**; Expert rendered to **4 pages**. The final page in each contains only the signature block/line and the repeating footer (or mainly whitespace), a pagination-quality issue. **Visual layout acceptance: NOT PASS** until clarified or corrected without moving content or altering protected Word standards.
- No obvious major text clipping found in thumbnail overview; full fidelity including exact fonts/bold/headers/footer should be reviewed at native page scale before release.

## Decision
**PARTIAL PASS — ZT insertion and original A paragraph preservation; FINAL VISUAL PASS NOT GRANTED.**
Pending: correct/check isolated signature page, verify Expert binary against V27-R02, compare formatting/header/footer/media, check real scenario B ZIP, PDF content, and independent ZT record verification. Do not alter the three immutable DOCX etalons. Avoid hardcoded copy of sample GIS conclusions.
