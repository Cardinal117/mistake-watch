# Product Intake Archive

Move an entry here only after it is resolved, deliberately not planned, or
superseded. Preserve its ID, original-report link, decision reason, verification
evidence, commit, and deployment reference where applicable.

## MW-FEAT-006 Private local audio companion extension

- **Final status:** Resolved
- **Decision date:** 2026-08-21
- **Task:** TASK-018
- **Evidence:** Private extension `0.5.1`; commit `b60bc69`; 423 local tests;
  focused extension tests 33/33; Opera GX owner QA promoted capture, analyser,
  visual fidelity, paused idle, bounded Constellation, lifecycle, audio, and
  privacy behavior.
- **Original report:**
  [[archive/MW-FEAT-006-local-audio-companion-extension|Archived item]]

## MW-BUG-005 Like state remains stale on another active device

- **Final status:** Resolved
- **Decision date:** 2026-08-17
- **Task:** TASK-011
- **Evidence:** Commit `444b78f`; deployment
  `dpl_3Z6mYK4tyqLtowcppLK6e2tSSz8t`; 329 local tests; production health and
  readiness; owner two-device QA observed four-second no-refresh convergence.
- **Original report:**
  [[archive/MW-BUG-005-cross-device-like-state|Archived item]]

## MW-BUG-010 Account owner can lose host authority after rejoining

- **Final status:** Resolved
- **Decision date:** 2026-08-19
- **Task:** TASK-012 A3/B
- **Evidence:** Commit `7cd92a9`; Maincloud admission-schema publication;
  deployment `dpl_7Z8GWwA5XunM3rBcVfPAZejXyahn`; 373 local tests; production
  health/readiness; owner two-machine QA covering concurrent control, Account
  Rooms re-entry, and guest authority/catalogue denial.
- **Original report:**
  [[archive/MW-BUG-010-account-owner-rejoin-loses-authority|Archived item]]

## MW-BUG-012 Recommendation preference reconciliation reaches shared rate limit

- **Final status:** Resolved
- **Decision date:** 2026-08-19
- **Task:** TASK-016
- **Evidence:** Commit `6987738`; clean-install metadata commit `fe9788b`;
  deployment `dpl_7Z8GWwA5XunM3rBcVfPAZejXyahn`; fixed-window and cooldown tests;
  owner two-machine QA confirmed correct Like behavior and a clean console.
- **Original report:**
  [[archive/MW-BUG-012-recommendation-preference-rate-limit|Archived item]]

## MW-BUG-013 Previous then Next loses the return item

- **Final status:** Resolved
- **Decision date:** 2026-08-19
- **Task:** TASK-017
- **Evidence:** Commit `5792328`; deployment
  `dpl_4UZdgUmuWQfY8APy3mkvd5pPuoy9`; 377 local tests and complete local gates;
  owner two-participant production QA confirmed Previous followed by Next
  preserves the return item.
- **Original report:**
  [[archive/MW-BUG-013-previous-next-loses-return-item|Archived item]]

## Archived Entry Shape

```md
## MW-BUG-000 Short title

- **Final status:** Resolved | Not planned | Superseded
- **Decision date:** YYYY-MM-DD
- **Task:** TASK-### or Inbox-only
- **Evidence:** Tests, manual QA, commit, deployment, or decision reason
- **Original report:** Link to the intake source
```
