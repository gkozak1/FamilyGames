# The Jewel of the Lochs — FieldDossier

This folder is designed to be uploaded directly to a GitHub Pages directory. GitHub Pages serves the static app; Firebase Realtime Database provides the shared four-phone state.

## What this version does

- Four persona-specific phones share one evidence record in real time.
- Each phone records only its own persona evidence; all four records become visible at Team Convergence.
- Kopp's and the Kenosha Dunes include explicit team-convergence steps before the Cipher Engine unlocks.
- The Cipher Engine will not run until **all four personas press `Ingest Evidence` within 5 seconds of the first press**.
- A failed attempt returns to the ready state and displays: **All four sleuths must ingest evidence within 5 seconds of each other.**
- Every successful run can be replayed. A replay again requires four `Ingest Evidence` presses inside the five-second window.
- The four persona-colored evidence records visibly feed into the animated Cipher Engine, which then displays **CIPHER CREATED** and a configured letter/number pair.
- Recovered ciphers are shared across phones and displayed in numeric order only.
- Device-local storage preserves the most recent synchronized record and queues evidence entered while connectivity is unavailable; queued writes are pushed when Firebase reconnects.

## Firebase setup — required for four-phone synchronization

1. Create a Firebase project and add a Web App.
2. In **Authentication**, enable **Anonymous** sign-in.
3. Create a **Realtime Database**.
4. Copy the Firebase Web App configuration into `firebase-config.js`. Make sure `databaseURL` is included.
5. Replace the database rules with the contents of `firebase.rules.json` and publish them.
6. Upload the entire `FieldDossier` folder to the desired GitHub Pages location.

The app uses Firebase's browser-module SDK from Google's CDN. No npm build step is required.

If Firebase is not configured, the app opens in local-device mode so the interface can still be inspected, but the shared four-person Cipher Engine is intentionally disabled.

## Four player URLs

The session identifier keeps the four phones in the same hunt. Use one shared session value and a different persona value on each phone:

- `?session=JOTL-2026-FIELD&persona=scarlet`
- `?session=JOTL-2026-FIELD&persona=peacock`
- `?session=JOTL-2026-FIELD&persona=mustard`
- `?session=JOTL-2026-FIELD&persona=plum`

For the real event, use a harder-to-guess session ID if desired and encode these URLs into the four QR codes.

## Five-second Cipher Engine logic

The first `Ingest Evidence` press opens a shared attempt with a five-second deadline. Each of the four persona phones writes its own press to that same attempt. A successful attempt requires one press from each of Scarlet, Peacock, Mustard, and Plum and a maximum timestamp spread of 5,000 ms.

A short network grace period is allowed after the deadline so a click made just before five seconds is not discarded merely because the database update takes a fraction of a second to propagate. The actual press timestamps must still fit inside the five-second window.

If the attempt fails, the shared record is marked failed and each open Cipher Engine returns to its pre-button state. The next press begins a new attempt.

## Cipher mapping

The current A–G / 1–7 mapping is a working prototype mapping in `config.js`. It is intentionally independent of the evidence values. Once the seven physical Murdle clue groups are labeled A–G and their correct order is known, update the seven `cipher` entries in `config.js`.

## Files

- `index.html` — GitHub Pages entry point
- `styles.css` — responsive field-dossier / Cipher Engine design
- `config.js` — personas, evidence challenges, working cipher mappings
- `core.js` — validation and evidence utilities
- `coordination-core.js` — pure five-second four-person quorum logic
- `firebase-sync.js` — Firebase authentication, shared evidence, ciphers, and synchronized Cipher Engine attempts
- `firebase-config.js` — paste Firebase Web App settings here
- `firebase.rules.json` — recommended Realtime Database rules
- `diamond-logo.svg` — Jewel of the Lochs four-color diamond asset
- `FIELD_EVIDENCE_TABLE.md` — source-of-truth challenge table
- `tests.js` — automated logic tests
- `TEST_REPORT.md` — current test results
