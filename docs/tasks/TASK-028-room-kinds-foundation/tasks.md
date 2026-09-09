# TASK-028 implementation sequence

## Current status — production rollout

028.1–028.7 including R3 are implemented and deployed with owner authorization. All four gates are enabled; production entry/access smoke checks passed. See [live rollout](live-rollout-2026-09-09.md). Earlier local-only and no-Git/deployment statements below describe historical checkpoints. The owner reports live QA passed except desktop Shared request access. That access fix is now verified locally; see [desktop membership access](desktop-membership-access.md). It is committed as `de25e89`, pushed on the task branch and deployed; main merge remains outstanding. Recommendation quality and the hub are follow-on work.

> **2026-09-09 audit corrections:** All five findings in the [task-by-task audit](audit-2026-09-09.md) are fixed and verified locally. See [corrections and final evidence](fixes-2026-09-09.md): 674 Node tests, 191 SQL assertions and four combined browser tests passed. Earlier results below describe their respective checkpoints; release/hosted acceptance remains outstanding.

Status: 028.1 approved and implemented locally on 2026-09-08; local QA passed.
028.2 approved and implemented locally on 2026-09-08; local QA passed. 028.3 approved and implemented locally on 2026-09-08; local QA passed. 028.4 approved and implemented locally on 2026-09-08; local QA passed. 028.5 approved and implemented locally on 2026-09-09; local QA passed; 028.6 approved and implemented locally on 2026-09-09; local QA recorded in its report. 028.7 local integration review and approved R3 retirement correction completed; hosted acceptance and release remain pending.
No commit, push, production migration or deployment has been performed.

Read [proposal](proposal.md), [design](design.md), [acceptance criteria](acceptance-criteria.md)
and [review notes](review-notes.md). See [028.1 evidence](implementation-028.1.md). See [028.2 evidence](implementation-028.2.md). See [028.3 evidence](implementation-028.3.md). See [028.4 evidence](implementation-028.4.md). See [028.5 evidence](implementation-028.5.md): 677 Node tests, 219 SQL assertions and five combined browser tests passed. See [028.6 evidence](implementation-028.6.md): 683 Node tests, 267 SQL assertions, six combined browser tests and fresh migration replay passed. See [028.7 review and release hold](implementation-028.7.md). [R3 correction](implementation-028.7-R3.md) passes locally: 690 Node tests, 290 SQL assertions, seven combined browser tests and a separate owner-deletion run. Next: user acceptance and, when requested, atomic commit/release preparation; retain High for the cross-system rollout.

## 028.1 — Legacy compatibility foundation

- Refresh current main and select an isolated checkout; preserve all unrelated work.
- Characterize saved/unsaved, account/guest, invite and cleanup behavior before edits.
- Add additive room-kind metadata, Legacy backfill, generated types and compatible readers.
- Record complete room/admission/cleanup path inventory; no new-kind creation enabled.
- Add the small Legacy grouping to the existing Saved Rooms projection without
  changing saved membership or creating a new dashboard.
- Test migration on populated local data, run it through the migration tooling,
  compare before/after IDs and all preserved fields, and review rollback compatibility.

Likely files: `supabase/migrations/`, generated database types, `lib/rooms/data.ts`,
`lib/account/room-projection.ts`, `room-data.ts`, existing saved-room components/tests.
Confirm concrete paths and local Next.js docs before code/UI edits.

Gate: old rooms behave identically; no Personal/Shared/Themed/Temporary can be
created by forged inputs. Review the diff and evidence before proceeding.

## 028.2 — Personal creation, access and resume

- Implement owner uniqueness, atomic creation and idempotent resume; validate account eligibility.
- Enforce owner-only access across every boundary listed in design, including
  stale guest cookies and server-issued live grants.
- Exclude Personal from both idle-cleanup implementations; define closed/blocked
  resume semantics before implementing them.
- Add minimal Open/Resume entry and first-use Listen default, preserving last mode thereafter.
- Disable invitations for Personal. Keep catalogue authorization unchanged.
- Test concurrent same-account devices, different-account denial, logout/rejoin,
  direct route/API access and uninterrupted mode switching.

Likely files: `lib/rooms/actions.ts`, `membership.ts`, `live-admission.ts`,
`lifecycle.ts`, `lib/identity/`, `lib/account/`, room routes, migrations and tests.

Gate: one private persistent room per account, no new autoplay/ranking claims.
Local QA first; production migrations and release separately authorized.

## 028.3 — Learning-policy and attribution enforcement

- Inventory existing event, outbox, replay and aggregation paths.
- Add trusted policy provenance and account/room/session attribution contracts.
- Preserve Legacy behavior; prevent duplicate device signals and disallowed updates.
- Define consent withdrawal/replay rules and operational versus training storage.

Likely files: `lib/recommendations/events.ts`, `persistence.ts`, outbox drains,
aggregation/service modules, relevant Spacetime events and migrations.

Gate: policy tests prove Temporary exclusion and Shared consent semantics before
either kind is exposed. This is plumbing, not a new scoring implementation.

## 028.4 — Shared persistent membership and consent

- Confirm creator eligibility and membership approval UX.
- Reuse invitation/member/permission machinery; persist return access separately from presence.
- Add separate taste-contribution and individual-learning controls; no consent inferred from joining.
- Test host, invited account, rejected account and multiple-device combinations.

Gate: stable membership, clear consent and no unauthorized taste exposure.
Fair blended ranking remains a follow-on engine milestone.

## 028.5 — Themed direction contract

- Define bounded owner-editable theme input and explicit direction-change action.
- Persist direction/version and distinguish manual additions from training/candidate eligibility.
- Integrate only safe recommendation behavior; suppress unverified theme claims.

Gate: off-theme manual playback cannot mutate room direction. Automatic on-theme
quality requires the later filtering/evaluation milestone before advertised activation.

## 028.6 — Temporary lifecycle

- Approved: one-hour inactivity grace, then closure; purge eligibility 24 hours after closure.
- Expired links and returning tabs go home with a persistent, dismissible explanation.
- Support guest/account sessions, bounded recovery and explicit Like attribution.
- Enforce no durable implicit learning in normal, delayed and replayed event paths.
- Make expiry understandable; clean up operational state safely and idempotently.

Gate: expiry behavior and storage retention verified with time-controlled tests;
no account taste contamination and no Legacy lifecycle changes.

## 028.7 — Integration and release review

- Validate kind/mode/access matrix across desktop/mobile and two independent participants.
- Run task tests, typecheck, lint, build, database security checks where applicable,
  and Spacetime build/generated bindings if its contract changed.
- Document exactly what is implemented, hidden, deferred and verified.
- Prepare atomic commit review only when requested; approve preview/migration
  and production rollout separately. Keep rollback protections operational.

Suggested eventual commit boundaries: Legacy schema/read compatibility; Personal
security/lifecycle; Personal entry UI; then each independently verified later slice.
Do not split a security invariant into a deployable unsafe intermediate release.

## Follow-on work, outside this packet

Recommendation candidate sourcing and quality evaluation → reliable authoritative
Autoplay → Rooms Hub/startup preferences. Optional discovery gestures, taste-match
cards and assistant/plugin integration follow demonstrated core behavior.
