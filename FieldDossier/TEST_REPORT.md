# FieldDossier v2 — Test Report

Date: 2026-09-08

## Automated logic tests

`node tests.js`

- PASS — all 28 persona challenges accept their configured expected evidence
- PASS — Kopp's pair evidence derives 16 and 15, then difference 1
- PASS — cipher map has seven unique letters and seven unique positions
- PASS — recovered ciphers sort numerically
- PASS — four distinct persona presses inside 5,000 ms qualify
- PASS — a press after the 5,000 ms deadline does not join the expired attempt
- PASS — duplicate presses by one persona do not substitute for a missing sleuth
- PASS — replay begins a new shared attempt after a successful attempt
- PASS — site completion requires synthesis at Kopp's and the Dunes

Result: **ALL TESTS PASSED**

## Static checks

- `node --check` passed for `app.js`, `firebase-sync.js`, `config.js`, `core.js`, and `coordination-core.js`.
- `firebase.rules.json` parses as valid JSON.
- Player site tabs contain only numbered circles.
- Player site title is `Evidence Gathering`; location names are not rendered on the site view or Cipher Engine.
- Removed `Active field dossier` and `Seven sites...` copy.
- Cipher Engine result copy is `CIPHER CREATED`; `Correlation Recovered` is absent.
- Cipher Engine supports replay through a new four-person quorum attempt.

## Deployment-dependent test still required

A true four-phone timing test requires a real Firebase project because the ZIP intentionally does not contain the user's Firebase credentials. After inserting `firebase-config.js`, test with four devices using the same `session` query parameter and four different `persona` parameters.
