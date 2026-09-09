# The Jewel of the Lochs — Connections

Revision: 2026-09-09, automatic four-player sharing and one-click admin reset.

## Install this revision

1. Upload **all contents of this Connections folder** to your existing `FamilyGames/Connections` directory on GitHub Pages. Include the new `.mjs` files, `firebase-config.js`, and `admin.html`.
2. In your existing Firebase project **fielddossier**, open **Realtime Database → Rules** and publish the included `firebase.rules.json`.
   - This combined file preserves the Field Dossier rules from `FieldDossier_PermissionFix.zip` and adds a separate `connectionsSessions` branch.
   - If you have since changed other live rules, merge just the `connectionsSessions` object from `connections.rules.patch.json` into the existing top-level `rules` object instead. Preserve other branches.
   - Anonymous sign-in is the same Firebase setup used by Field Dossier. No new project or API key is needed.

Uploading the app alone is not enough: Firebase needs the new rules before phones can share fragments or the admin can reset them. The package does not publish rules or change your live app automatically.

## Play

The existing four QR codes still work:

- Mustard: https://gkozak1.github.io/FamilyGames/Connections/?facet=mustard
- Peacock: https://gkozak1.github.io/FamilyGames/Connections/?facet=peacock
- Plum: https://gkozak1.github.io/FamilyGames/Connections/?facet=plum
- Scarlet: https://gkozak1.github.io/FamilyGames/Connections/?facet=scarlet

Each sleuth finds their connection, identifies it, and orders the four clues. Correct ordering earns and automatically shares that persona’s fragment. Solved players see new fragments arrive in their colored blocks. Players who have not finished remain in their own puzzle.

| Block | Persona | Fragment |
| --- | --- | --- |
| 1 | Mustard | MAKE |
| 2 | Peacock | 3PUT |
| 3 | Plum | SONH |
| 4 | Scarlet | OLE1 |

After all four fragments have been shared, every solved player automatically sees a brief highlight, the complete diamond, “The four facets are united.”, and `MAKE3PUTSONHOLE1`. There is no manual code entry or Assemble button.

The exact final instruction is:

> When you understand Nigel’s instruction, state it to his erstwhile assistant.

Clue names and ordering tasks are preserved. Plum’s clue letters are now PARIS (S), REYKJAVIK (O), DUBLIN (N), ROME (H). Scarlet’s are GREEN KNIGHT (O), BILLIKIN (L), FIGHTING IRISH (E), MAROON (1).

## One-click reset

Open https://gkozak1.github.io/FamilyGames/Connections/admin.html

Wait for the connection message, then click **Reset game** once. There is no session selector, confirmation dialog, or typed confirmation.

The button clears all four shared fragments and advances the current round. Connected players return to the first puzzle screen. An offline phone discards its old round and queued fragment when it reconnects. Browser refreshes within the current round preserve progress.

There is one fixed session, `JEWEL-CONNECTIONS`. The app ignores session URL parameters. You can test and reset this same session as often as needed. The printed QR codes never need to change.

Reset affects Connections only. Field Dossier evidence, ciphers, and other records are untouched. Anonymous participant identities and a round counter remain so phones can recognize a reset and stay connected. The player’s “Start this facet over” button is available before earning a fragment; after sharing, use the admin button to restart the whole game.

The admin page is intentionally a lightweight family-game control, following the Field Dossier pattern. It is not password-protected. Keep its URL for the facilitator; it is not linked from the player screens.

## Connection loss

Progress is saved locally. A solved fragment shows “Sharing…” until acknowledged by Firebase; the app retries interrupted connections automatically. A reset counter is checked before retrying queued submissions, and the database rules reject submissions from previous rounds. Keep the phone connected long enough for its fragment to be shared. If the page itself cannot load without internet, reconnect and reopen it.

## Verification

Run `node tests.mjs` from this folder. The included tests exercise the game event handlers and synchronization through a simulated four-client Firebase adapter, including reset and offline cases. They do not contact your live Firebase database or replace a real four-phone deployment check.

Firebase implementation reference: https://firebase.google.com/docs/database/web/read-and-write
