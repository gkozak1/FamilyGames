# FieldDossier — Test Report

Build date: 2026-09-08

## Automated logic tests

Command: `node tests.js`

Result: **ALL TESTS PASSED**

Validated:

- all 28 persona challenges accept their intended evidence
- Kopp's pair values produce 16 and 15, with team difference 1
- all seven working cipher letters are unique
- all seven working cipher positions are unique and lie from 1–7
- recovered ciphers sort numerically
- four distinct persona presses inside 5,000 ms qualify the Cipher Engine
- a press after the five-second deadline does not join an expired attempt
- duplicate persona presses do not substitute for a missing sleuth
- replay starts a fresh Cipher Engine attempt after success
- site completion requires team synthesis when configured

## Static validation

Passed:

- `app.js` JavaScript syntax check
- `firebase-sync.js` JavaScript syntax check
- `facilitator.js` JavaScript syntax check
- `firebase.rules.json` JSON parse validation

## Reset architecture review

The reset design now:

1. keeps Firebase `participants` so the four phones remain associated with the session
2. atomically deletes `evidence`, `synthesis`, `ciphers`, and `engine`
3. writes a shared `meta/resetAt` timestamp
4. makes each phone wait for a current Firebase session snapshot before flushing queued offline writes
5. discards queued/local run data if it sees a newer `resetAt` value
6. requires the facilitator to type the session ID exactly and confirm a second time
7. keeps production isolation by supporting a separate fresh production session ID

## Firebase live test still required after deployment

Because the Firebase database is an external service, complete the following after uploading the new rules and GitHub files:

- open Scarlet, Peacock, Mustard, and Plum URLs in four browsers/devices
- enter evidence and confirm cross-device synchronization
- run one four-person Cipher Engine sequence inside five seconds
- open `facilitator.html?session=<test-session>`
- reset the session
- verify all four player screens return to a clean Site 1 state and no old evidence reappears
- enter new evidence after reset to verify continued synchronization

