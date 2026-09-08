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
- Cipher Library entries sort numerically
- facilitator identities have a dedicated `facilitators/<uid>` branch rather than overwriting player identities
- session read access recognizes either a registered player identity or facilitator identity
- configured Cipher Engine window is exactly 20,000 ms
- four distinct persona presses inside 20 seconds qualify the Cipher Engine
- a press after the 20-second deadline does not join an expired attempt
- duplicate persona presses do not substitute for a missing sleuth
- replay starts a fresh Cipher Engine attempt after success and receives a fresh 20-second deadline
- site completion requires team synthesis when configured

## Static validation

Passed:

- `app.js` JavaScript syntax check
- `firebase-sync.js` JavaScript syntax check
- `facilitator.js` JavaScript syntax check
- `config.js` JavaScript syntax check
- `firebase.rules.json` JSON parse validation

## Facilitator same-browser fix

The prior build stored both players and the facilitator under `participants/<uid>`. Firebase Anonymous Authentication reuses the same anonymous UID within a browser profile, so a browser that had already joined as a player could be blocked when the facilitator console attempted to replace that role.

This build now:

1. stores players under `sessions/<session>/participants/<uid>`
2. stores facilitator authorization independently under `sessions/<session>/facilitators/<uid>`
3. allows the same Firebase UID to exist in both branches
4. leaves the player persona unchanged when the Facilitator Console is opened
5. authorizes reset operations from the dedicated facilitator branch
6. reports the actual Firebase authentication/registration error instead of always saying `Firebase sign-in failed`

## Reset architecture review

The reset design:

1. keeps Firebase player identities so the four phones remain associated with the session
2. atomically deletes `evidence`, `synthesis`, `ciphers`, and `engine`
3. writes a shared `meta/resetAt` timestamp
4. makes each phone wait for a current Firebase session snapshot before flushing queued offline writes
5. discards queued/local run data if it sees a newer `resetAt` value
6. requires the facilitator to type the session ID exactly and confirm a second time
7. keeps production isolation by supporting a separate fresh production session ID

## Required Firebase action for this build

Republish the included `firebase.rules.json` under Firebase **Realtime Database → Rules**. The code change alone is not enough because the live Firebase database must know about the new `facilitators` branch and permissions.

No other Firebase configuration change is required if Anonymous Authentication and the authorized GitHub Pages domain are already working.

## Recommended live test after deployment

- upload the revised `FieldDossier` folder to GitHub Pages
- publish the revised Realtime Database rules
- open one player URL in a normal browser window
- in that **same browser profile**, open `facilitator.html?session=TEST-1`
- confirm the Facilitator Console reports Firebase online rather than a role-registration error
- reset `TEST-1`
- verify all four player screens clear evidence/ciphers without stale data returning
- verify the 20-second Cipher Engine and replay window still work
