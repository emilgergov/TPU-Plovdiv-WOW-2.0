# WOW 3.0 — navigation contract (release gate)

## Required flow
Every fruit is an independent linear route: Fruit → Step 1 → Step 2 → Step 3 (when applicable).
Back moves exactly one step to the previous screen in the same fruit. It must not jump to another fruit or reset the selected zone.
Only an explicit "Tree" action returns to the tree and clears context.
No separate global "Main screen" action in a fruit route; no duplicate floating Back controls.

## Zone context
Select zone once within a fruit; subsequent species, maps, photos, measures, indicators and documents are scoped to that zone.
Never display the global 792-species list as the species list for a selected zone.
Switching fruits starts a new route; no stale zone, history or species is carried across fruits.

## Content protection
Keep approved species narratives unchanged. Preserve the representative TPU and original Tera MP4. Missing confirmed official data are labeled ПРЕДСТОИ.

## Release gate
1. Replace the legacy iframe's parallel navigation/history with a single step-state controller shared by all fruits.
2. Verify forward/back for each fruit and each zone-scoped route; no cross-fruit jumps.
3. Verify photo/video choice, Tera playback, map selection, documents reader, and selected-zone species.
4. Run desktop/mobile automated tests and verify the deployed page visually.
5. Only after all checks pass, publish as WOW 3.0; do not equate branch creation with deployment.
