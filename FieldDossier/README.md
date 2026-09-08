# The Jewel of the Lochs — FieldDossier

This folder is designed to be uploaded directly to a GitHub Pages directory. GitHub Pages serves the static app; Firebase Realtime Database provides the shared four-phone state.

## What this version does

- Four persona-specific phones share one evidence record in real time.
- Each phone records its own persona evidence; all four records become visible at Team Convergence.
- Kopp's and the Kenosha Dunes include explicit team-convergence steps before the Cipher Engine unlocks.
- The Cipher Engine will not run until **all four personas press `Ingest Evidence` within 20 seconds of the first press**.
- A failed attempt returns to the ready state and displays: **All four sleuths must ingest evidence within 20 seconds of each other.**
- Every successful run can be replayed. A replay again requires four `Ingest Evidence` presses inside the 20-second window.
- The four persona-colored evidence records visibly feed into the animated Cipher Engine, which displays **CIPHER CREATED** and a configured letter/number pair.
- The **Cipher Library** is shared across phones and displays created ciphers in numeric order only.
- Device-local storage preserves synchronized evidence and queues evidence entered while connectivity is unavailable.
- A separate **Facilitator Console** can reset a test session without deleting the four connected player identities.
- A reset clears evidence, team synthesis, engine attempts, and recovered ciphers. Player devices detect the reset and purge stale locally queued run data before synchronizing again.

## Firebase setup

The Firebase Web App configuration and Realtime Database URL are already present in `firebase-config.js`.

Before deploying:

1. In Firebase **Authentication**, enable **Anonymous** sign-in.
2. In Firebase **Realtime Database → Rules**, replace the rules with the contents of `firebase.rules.json` and click **Publish**.

   **Required for this revision:** republish these rules even if you published an earlier FieldDossier rules file. This version separates facilitator authorization from player identity so the same browser can serve both purposes.
3. Upload the entire `FieldDossier` folder to the desired GitHub Pages directory.

The app uses Firebase's browser-module SDK from Google's CDN. No npm build step is required.

## Four player URLs

Use one shared session value and a different persona value on each phone:

- `index.html?session=TEST-1&persona=scarlet`
- `index.html?session=TEST-1&persona=peacock`
- `index.html?session=TEST-1&persona=mustard`
- `index.html?session=TEST-1&persona=plum`

For the real event, use a new production session ID, for example:

- `?session=JOTL-2026-PRODUCTION&persona=scarlet`
- `?session=JOTL-2026-PRODUCTION&persona=peacock`
- `?session=JOTL-2026-PRODUCTION&persona=mustard`
- `?session=JOTL-2026-PRODUCTION&persona=plum`

A fresh production session ID ensures that test evidence cannot appear in the real run even if old test sessions remain in Firebase.

## Facilitator Console and resetting tests

Open:

`facilitator.html?session=TEST-1`

The facilitator page anonymously signs into Firebase and registers that browser under a separate `facilitators` branch for the session. This means the same browser can previously have been used as Scarlet/Peacock/Mustard/Plum and still open the Facilitator Console without overwriting its player identity. The console shows:

- evidence count out of 28
- cipher count out of 7
- player identities that have joined
- the last reset time
- copyable URLs for all four player personas
- **Reset Current Session**

Reset requires two safeguards:

1. type the current session ID exactly
2. confirm the destructive reset

The reset clears only the run-state branches for that session:

- evidence
- team synthesis
- Cipher Engine attempts
- ciphers shown in the Cipher Library

It deliberately keeps `participants`, so four phones that are already connected do not need to rejoin. A reset timestamp is written to Firebase. Each player phone sees that timestamp and deletes stale local/queued test data before allowing further synchronization.

### Recommended workflow

**Testing**

1. Use `session=TEST-1` on all four phones/windows.
2. Run the game as far as desired.
3. Open `facilitator.html?session=TEST-1`.
4. Press **Reset Current Session**.
5. All four player devices should return to a clean Site 1 state.

You can also use a fresh test ID such as `TEST-2` instead of resetting.

**Production**

Use a brand-new production session ID in the final QR codes. Do not reuse a test session ID.

## Important facilitator-security note

This is a private family-game app, not a public administrative system. The Facilitator Console is intentionally lightweight. Anyone who knows the facilitator URL and session ID could identify themselves as a facilitator. Do not publish or distribute the facilitator URL to players. The regular player interface does not link to it.

For this use case, the protection against accidental loss is:

- the facilitator console is separate from the player UI
- the session ID must be typed exactly before a reset
- a second confirmation is required
- production uses a fresh session ID

## Twenty-second Cipher Engine logic

The first `Ingest Evidence` press opens a shared attempt with a 20-second deadline. Each of the four persona phones writes its own press to that same attempt. A successful attempt requires one press from each of Scarlet, Peacock, Mustard, and Plum and a maximum timestamp spread of 20,000 ms.

A short network grace period is allowed after the deadline so a click made just before 20 seconds is not discarded merely because the database update takes a fraction of a second to propagate. The actual press timestamps must still fit inside the 20-second window.

If the attempt fails, the shared record is marked failed and each open Cipher Engine returns to its pre-button state. The next press begins a new attempt.

## Cipher mapping

The current A–G / 1–7 mapping is a working prototype mapping in `config.js`. It is intentionally independent of the evidence values. Once the seven physical Murdle clue groups are labeled A–G and their correct order is known, update the seven `cipher` entries in `config.js`.

## Files

- `index.html` — player GitHub Pages entry point
- `facilitator.html` — facilitator/reset console
- `app.js` — player interface
- `facilitator.js` — facilitator console and protected reset workflow
- `styles.css` — responsive field-dossier / Cipher Engine / facilitator design
- `config.js` — personas, evidence challenges, working cipher mappings
- `core.js` — validation and evidence utilities
- `coordination-core.js` — pure configurable four-person quorum logic
- `firebase-sync.js` — anonymous auth, shared evidence, ciphers, reset awareness, and synchronized Cipher Engine attempts
- `firebase-config.js` — configured Firebase Web App settings
- `firebase.rules.json` — Realtime Database rules, including the separate facilitator identity branch and facilitator reset permissions
- `diamond-logo.svg` — Jewel of the Lochs diamond asset
- `FIELD_EVIDENCE_TABLE.md` — source-of-truth challenge table
- `tests.js` — automated logic tests
- `TEST_REPORT.md` — current test results


## Facilitator/player same-browser fix

This revision stores player identities at `sessions/<session>/participants/<uid>` and facilitator authorization separately at `sessions/<session>/facilitators/<uid>`. A browser that has already joined a session as a player no longer has to change roles to use the Facilitator Console.

If the console cannot connect, it now reports the underlying authentication or database-registration error instead of the generic `Firebase sign-in failed` message.

After uploading this revision to GitHub Pages, publish the included `firebase.rules.json` in Firebase Realtime Database before testing the facilitator reset.
