# KT48 — reconstructed mosaic report (4 November 2026)

Scope: isolated v26-test/v27-preview only. Stable public Block 06 not intentionally changed.

## Provenance assembled
- KT42 (5489a189): evidence-gating of legal conclusions and no cross-dossier specimen facts.
- KT44 (7701c589): original four styled runs in 'Относно', original headers/footers and paragraph runs.
- V27-R02: approved legal argumentation structure (Art. 2 (1) (1)-(2), Art. 2 (2), Art. 31 ZBR) and five impact headings.

## Changes applied, in order
- 31512816: preserve 5 original approved Classic A impact directions and 5 Classic B directions verbatim; condition evidence-specific legal findings; prevent false spatial intersection wording in A.
- f76e372b: replace unrelated KT44 legal fallback in Expert Word with the R02-specific article structure, conditional on verified GIS scenario.
- 37ffaa04: reuse exact approved Expert R02 impact headings and remove generic placeholder impact writer on absent evidence.
- e94fd20d: restore binary-original user-approved Classic A and Classic B DOCX (exact Git blob IDs below). No rollback of other code.
- 407c4012: activate one cache-busted KT48 mosaic Word bridge in isolated preview, removing duplicate script load.
- 32bd48bd: require published Pages HTML to serve one KT48 bridge and byte-identical three original DOCX files.
- Dedicated CI workflow: .github/workflows/v27-kt48-mosaic.yml; test: v26-test/v27-preview/kt42-approved-word-regression.cjs.

## Immutable user-approved DOCX SHA-1 Git blob hashes
- KT35-A.docx: 1a495fc2d6047a6377e48dfb963a737502404087
- KT39-B.docx: 508402ce5a631617bdc0da4ca9d9cd535b6b3b7c
- V27-R02.docx: 335634ab930253671dc090391ed366867ca7e438

## Regression results as last read
- GitHub integrated DOCX regression: PASS / exit code 0.
- 10 original classical impact directions unchanged and exact.
- A/B scenarios correctly distinguished by GIS, no unverified crossing in A legal text, B uses its own verified zone.
- 5 Expert R02 impact headings in both synthetic A and B.
- R02 legal architecture retained (Art. 2 (1) (2), Art. 2 (2), ZOOS); unsupported final conclusion not inserted.
- All three original DOCX binaries exact and header/footer formatting checks PASS.
- GitHub Pages KT48 live verifier created, result not yet observed at checkpoint writing.
- A/B live ZIP test AFTER this implementation NOT YET PERFORMED. Do not claim V27 STABLE.

## Follow-up
Check v26-test/v27-preview/KT48_LIVE_VERIFIED.json; require LIVE_PAGES_VERIFIED. Then test A three PIs 56784.13.102/.105/.106 and B 36676.129.457 from isolated Pages with actual dossier ZIPs; compare all generated Word/PDF1/PDF2 against originals and verify technical descriptions are source-confirmed. The goal is editorial likeness plus evidence safety, not simply format PASS.
