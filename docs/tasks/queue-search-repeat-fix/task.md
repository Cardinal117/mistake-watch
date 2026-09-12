# Queue search repeat correction

Approved 2026-09-12: fix YouTube search Add next, audit equivalent queue additions,
verify, commit/push and deploy. No recording-review changes are included.

Cause: Listen header search omits allowDuplicate; the live client defaults it to
false. The server rejects existing sources without throwing, leaving an optimistic
placeholder. Personal-room error records contain queue_duplicate_ignored.

Scope: allow intentional manual additions, including repeats and concurrent adds.
Preserve explicit playlist skip-duplicate choices, queue authority, action-ID
idempotency, and existing warning/confirmation preferences. Keep uncertainty on
timeouts; never treat an unconfirmed placeholder as playable.

Verification: execute production search command handlers against a duplicate
rejecting sender before/after the fix, run queue tests and browser repeat/recovery
checks, typecheck/lint, then deploy a clean committed export. No server or schema
change is planned.

## Implementation and QA

- Listen header Add/Next now explicitly permit repeated sources. Listen history,
  Watch history, Watch browse/details and library/folder additions had the same
  missing flag and now supply it as well.
- Single Add Media commands permit repeats after local warning/confirmation.
  Playlist imports carry an explicit allow-duplicates choice to the server;
  skip-duplicate imports retain the server check and local filtering.
- Regulars and recommendations already explicitly allow repeats. Queue priority
  actions act on existing occurrences and do not need a queue-add flag.
- Server rejection/defaults, permissions and idempotency remain unchanged. Real
  rejected promises already remove pending rows; uncertain timeout/retry behavior
  remains deliberately separate from confirmed playback.
- Test-first baseline: 302e23c with unrelated recording-review changes present.
  `node --test tests/queue/search-repeat.test.mjs` failed both original search
  cases (1 canonical row instead of 3), before production edits, then passed.
  Three additional executed-handler tests are post-hoc audit coverage for Add
  Media race handling and library conversions.
- Queue suite: 78 passed. Browser: 7 repeat/recovery cases passed, including 1440
  and 390 widths, rejection rollback, late confirmation and same-action retry.
  Dedicated header-search browser test passed: two Next clicks and one Add emit
  three unique action IDs with repeat permission and correct priority.
- Typecheck and scoped ESLint passed. Release build/status recorded below.
- Design hook font-size findings are pre-existing compact metadata/control styles
  in untouched markup, not introduced by these payload-only edits; no typography
  changes or suppressions are included in this bug fix.
- No real playback or queue mutation was performed in the owner's room during QA.
  Refresh the released app, dismiss the old local placeholder, and add again.
