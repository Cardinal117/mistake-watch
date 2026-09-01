# Product Intake Archive

Move an entry here only after it is resolved, deliberately not planned, or
superseded. Preserve its ID, original-report link, decision reason, verification
evidence, commit, and deployment reference where applicable.

## MW-BUG-008 Like control is missing from TV mode

- **Final status:** Resolved
- **Decision date:** 2026-09-01
- **Task:** TASK-020
- **Evidence:** Focused TV/preference/direct-source tests; 516-test full suite;
  desktop and compact interaction QA; separate two-participant continuity;
  signed-in production Like/Unlike reload and tab-reopen persistence; merge
  commit `a6747f8`; production deployment
  `dpl_79vfekpDWSrzBr1mqivyYdUbAFL7`.
- **Original report:**
  [[archive/MW-BUG-008-tv-mode-like-control-missing|Archived item]]

## MW-QOL-008 Open TV settings without leaving TV mode

- **Final status:** Resolved
- **Decision date:** 2026-09-01
- **Task:** TASK-020
- **Evidence:** TV settings overlay, immediate presentation updates, Escape
  ordering, focus restoration, idle reveal, desktop and compact layout,
  separate-participant playback continuity; merge commit `a6747f8`; production
  deployment `dpl_79vfekpDWSrzBr1mqivyYdUbAFL7`.
- **Original report:**
  [[archive/MW-QOL-008-tv-mode-settings-access|Archived item]]

## MW-QOL-010 Direct Play Now action parity

- **Final status:** Resolved
- **Decision date:** 2026-08-31
- **Task:** TASK-022
- **Evidence:** Focused tests 18/18; refreshed full suite 512/512; Opera desktop
  and compact Add Media QA; guest catalogue denial; pasted-link Play Next
  ordering; two-participant continuity; signed-in direct-source Like and Unlike
  refresh persistence; merge commit `bbe77e6`; production deployment
  `dpl_DNQVK18gyshf5AiPZ7oJoTCFLBn4`.
- **Original report:**
  [[archive/MW-QOL-010-direct-play-action-parity|Archived item]]

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

## MW-FEAT-008 Shared rhythm visualizers

- **Final status:** Resolved
- **Decision date:** 2026-08-25
- **Task:** TASK-019
- **Evidence:** Extension `0.6.2`; commit `75f33ef`; deployment
  `dpl_A1TzXCpKJtJ6ySHD7QF5HYtW28En`; 474 local tests; production host and
  extension-free participant QA promoted sustained shared Siri Ribbon,
  synchronized behavior, bounded Static Artwork fallback, and stable desktop
  and narrow Personalization interaction.
- **Original report:**
  [[archive/MW-FEAT-008-shared-rhythm-visualizers|Archived item]]

## MW-FEAT-009 Responsive Listen room redesign

- **Final status:** Resolved
- **Decision date:** 2026-08-27
- **Task:** TASK-021
- **Evidence:** Atomic implementation checkpoints through `be1c8bf`;
  documentation checkpoint `8a534bf`; production commit `a1f6b1c`; deployment
  `dpl_8Qfx6zZ8rLeiDZbT9TAGPnpt8Gwr`; 503-test integrated gate; owner visual,
  responsive, permissions, uploaded-media, queue, and two-participant QA.
- **Original report:**
  [[archive/MW-FEAT-009-responsive-listen-room-redesign|Archived item]]

## MW-QOL-012 Avatar permissions entry point

- **Final status:** Resolved
- **Decision date:** 2026-08-27
- **Task:** TASK-021 Batch B
- **Evidence:** Responsive avatar cluster and numeric blip; owner/member/guest
  authority checks; keyboard focus restoration; integrated live permission QA;
  production commit `a1f6b1c`; deployment
  `dpl_8Qfx6zZ8rLeiDZbT9TAGPnpt8Gwr`.
- **Original report:**
  [[archive/MW-QOL-012-avatar-permissions-entry-point|Archived item]]

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
