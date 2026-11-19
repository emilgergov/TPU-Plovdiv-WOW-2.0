# KT131 — restore regression fix

Observed failure: opening an archived case showed its correct registry number, but subject/procedure appeared unconfirmed and Stage5 had no document. Read-only structural diagnostics confirmed the saved full checkpoints and archived output still existed; no restoration of database rows or new case import was required.

Cause: the KT131 feedback integration added Stage5 to an early return in overlayModule. That returned the presentation/session overlay before the existing registry overlay could install KT117Document.checkpoint/restoreCheckpoint and the confirmed registry-number integration. The restore client waited for the missing method and stopped before applying saved workflow data.

Fix: apply the Stage5 session/feedback overlay without returning; continue through the existing registry checkpoint overlay. The accepted identity/reference checks and archive contract are unchanged. No normative, GIS, numbering or saved-document changes.

Regression coverage:
- Execute the API declaration from the fully composed Stage5 module, restore five synthetic document versions and confirmation, reject foreign-case/reference changes.
- Chrome executes the actual composed Stage5 module (only evidence collection is stubbed with synthetic data), restores visible version5/confirmation/Word readiness and verifies expert editing creates a new unconfirmed draft with the intelligent editor available.
- Existing source anchors, transport handling, editor, registry and reset/race suites continue to run before the isolated preview rollout.

No private case content is included in fixtures or diagnostic logs. The diagnostic outputs only snapshot structure. Production public versions remain unchanged; fix is deployed to the existing KT131 test route after checks.
