# Field Dossier — One active game

Updated 2026-09-09.

## Install

1. Upload this folder’s contents to your existing FieldDossier directory on GitHub Pages.
2. In Firebase Realtime Database → Rules, publish **firebase.rules.json from this package**.

These combined rules support both Field Dossier and Connections. The Connections rules are preserved exactly. Field Dossier adds a round check to reject delayed submissions from erased runs. Use these latest rules instead of those from the earlier packages. No Connections code update is needed. Preserve any unrelated live rule branches if you have added them.

## Players

All pages use one fixed active game. Old session URL parameters are ignored. No session names or session controls remain in the interface.

Player links:

- index.html?persona=scarlet
- index.html?persona=peacock
- index.html?persona=mustard
- index.html?persona=plum

The existing evidence tasks, persona colors, numbered stops, Cipher Library, and 20-second four-person Cipher Engine/replay remain.

## Reset

Open **facilitator.html** in the FieldDossier directory. When connected, click **Reset game** once. There is no name entry, confirmation dialog, or second click.

Reset clears evidence, team results, engine attempts and recovered ciphers. It returns online players to the first evidence stop and closes open entry/recall/animation screens. Offline phones discard old queued entries when they reconnect. Database rules reject old-round records already in flight. Identities and reset metadata remain so phones stay connected and recognize the fresh round.

Field Dossier reset affects only Field Dossier. Connections reset remains at Connections/admin.html and affects only Connections.

This revision starts with a fresh fixed active game. Previous named test records are left unused, without migration or deletion. All future testing and play use the one active game and its reset button.

The facilitator page retains the lightweight family-game access model used previously: it is not password-protected and is not linked from player screens.

## Verification

Run `node tests.js` and `node reset-tests.cjs` from this folder. The existing 12 logic tests and the new simulated-client reset checks pass. The latter cover four-player evidence/engine behavior, one-click reset, offline reconnection, new-round writes and stale in-flight writes.

These are logic tests with a simulated Firebase adapter, not a live permissions or browser test. Test the actual phones after uploading the app and publishing the rules.
