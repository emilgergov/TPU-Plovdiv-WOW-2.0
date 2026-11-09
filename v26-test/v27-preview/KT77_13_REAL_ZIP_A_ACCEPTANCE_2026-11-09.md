# KT77-13 — Real ZIP scenario A acceptance (09.11.2026)

Input: user-submitted TPU_Plovdiv_V27_AI_RABOTEN_PAKET (13).zip, compared against prior (12).zip.

## Confirmed PASS — generated DOCX
- Classic A: 42 paragraphs, including exactly one independent ZT finding at paragraph 25; PDF-rendered to **2 pages**. Director signature remains on page 2 with the final substantive text and footer.
- Expert Word: 50 paragraphs, including exactly one independent ZT finding at paragraph 26; PDF-rendered to **3 pages**. Director signature remains on page 3 with the final substantive text and footer.
- Both ZT findings: no-ZT-intersection variant for three test parcels; cadastral identifiers are **not bold**, aligned to existing ZZ parcel style.
- All **42 Classic** and **50 Expert** paragraph texts are unchanged relative to ZIP (12); paragraph ordering unchanged.
- In both generated DOCX, the ONLY changed internal package resource is word/document.xml. Other DOCX package resources (images, headers, footers, relationships, etc.) are byte-identical.
- The GIS PDF and normative-reference PDF ZIP members are byte-identical between (12) and (13). README changed (run metadata); both Word members changed only in document.xml.
- Visually inspected rendered final pages: no isolated signature page, no obvious footer or signing block clipping.

## Scope
**Scenario A / formatting and pagination PASS**. These checks do not establish independent truth of spatial data, legal correctness of substantive decisions, or scenario B integration PASS. Original locked Word exemplars untouched.

## Next gate
Generate a real scenario B ZIP through the same familiar Expert Analysis screen (KT77-13) and repeat checks: ZT cases, ZZ findings, one ZT paragraph in Classic B and Expert Word, paragraph fidelity, no extra signature page, 2/3 page target if contents support those lengths. Do not force page counts at the expense of content or layout.
