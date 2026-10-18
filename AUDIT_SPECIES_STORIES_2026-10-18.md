# WOW species and story audit — 18.10.2026

Source inspected: `WOW_APP.html` blob `e601ae5b69d3ea12c18f33d536b6ae72083bfd75` in stable/recovery branch.

## Confirmed in source

- The separate router tracks `state.zone` and `state.species`, and `selectZone(z)` sets the zone before opening its profile.
- The router's `species` view renders **one zone representative species** (`z.heroName`), not the full list of all species for that zone.
- The router's `species-detail` view displays a placeholder: “Видово-специфичен разказ се представя само при наличен проверен текст.”
- The GIS marker's `tpuLearnMoreBtn` displays a placeholder: “Индивидуалният образователен разказ за този вид предстои да бъде включен от проверените авторски чернови.”
- Therefore the existence of the 792 species-specific stories in the deployed interface is **not confirmed**. Do not report the stories as completed.
- `back()` uses a stack of view names, while `selectZone` changes the selected zone. This is not proof that back/forward restore the complete zone context.
- The successful recovery Playwright workflow validates video/navigation smoke tests, not 792 unique stories, per-zone species counts or context-aware back/forward.

## Required before declaring content complete

1. Identify and load the authoritative per-zone species list and verified individual stories, preserving the locked TPU source; never invent species occurrences.
2. Render only species linked to the selected zone, with explicit empty/pending state if none is confirmed.
3. Show the verified story per selected species, maximum 35 words, or clearly mark PENDING.
4. Test switching zones (including BG0002057), back/forward, and returning to the tree without leaking the previous zone's species.
5. Keep stable video and tree behavior unchanged.

This file is a source-code audit, **not** a certification of content completeness.
