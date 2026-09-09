# Verification — 2026-09-09

## Passed

- All four four-character fragments match the updated clue letters and join to `MAKE3PUTSONHOLE1`.
- All four game flows complete: select clues, identify the category, order clues, publish.
- Solved players receive each new fragment automatically; unsolved players stay in their puzzle.
- All four solved views automatically show the final code and exact requested instruction.
- No code-entry inputs or Assemble button remain.
- Refresh restores the current round and does not duplicate an existing fragment write.
- One admin reset restarts online players and clears all fragments.
- An offline player discards old progress after reconnecting.
- A queued offline fragment does not repopulate a reset round.
- A racing submission from an earlier round is rejected by the simulated epoch enforcement.
- One fixed session; the admin action has no confirmation or prompt.
- JavaScript syntax, JSON syntax, and local HTML/module asset references checked.
- Existing Field Dossier rules compared to the supplied reference and preserved exactly.

## Scope

`node tests.mjs` uses a minimal event harness and simulated Firebase adapter; it is not a real browser, Firebase emulator, security-rule integration test, or live four-phone test. Live Firebase permissions and network synchronization must be checked after publishing the included rules and uploading the package.
