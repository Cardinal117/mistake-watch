# Ordered implementation

Stage 1 was released under subsequent explicit owner approval on 2026-09-11.
The local slice boundaries below record implementation chronology. See
[live rollout](live-rollout-2026-09-11.md) for production evidence and remaining
natural-use evaluation; the local-only gates no longer describe release status.

## 030.0 Planning and review — complete

Owner approved planning followed by Stage 1 implementation on 2026-09-11.
Review packet against TASK-011/028/029 and independent source/privacy audit.
Resolve material findings before source work. Markdown docs are sufficient;
no HTML report needed. Preserve untriaged owner inbox text.

## 030.1 Durable catalogue and maintenance — complete locally

Test-first: schema privacy/public admission, preview/apply idempotency, owner
isolation, source registration, lease fencing/budget and expiry preserving Likes.
Implement additive migration, minimal RPC/type contracts and local fixtures.
No production database writes. Isolated synthetic local database only.

Evidence: 77 new SQL assertions, 239 existing regression assertions, real
concurrency checks, clean migration replay and local advisor/function lint checks
passed. See review-notes.md for test chronology and isolation boundaries.

## 030.2 Cached Personal discovery — complete locally

Test-first: candidate reader can return owner catalogue results without invoking
YouTube search; broader eligible candidates survive suppression/freshness limits.
Implement bounded batch worker and pure normalization/reader/ranking boundaries,
then service adapters. Foreground reads do not wait on provider I/O. Retention
must run even when room event transport fails.

Evidence: 133 recommendation/YouTube Node tests passed; actual SQL snapshot
accepted by the application reader without provider calls. Typecheck/build passed.

## 030.3 Personal panel integration — complete locally

Remove seed-triggered provider lookup and browser-candidate reranker in Personal.
Keep other room kinds unchanged. Preserve visual design, count wording, explicit
queue actions and feedback. Browser test: mount/change current song/refresh with
known candidates => zero automatic YouTube search/recommendations requests.
Test sparse/cold/expiry, queued/pending/feedback/undo and desktop/mobile scrolling.

Evidence: 18 browser checks passed using the actual Personal component with
synthetic API fixtures; desktop/mobile screenshots inspected. This is local
component evidence, not a claim of production or physical-device acceptance.

## 030.4 QA and handoff — complete locally

Independent review of changed source and SQL against acceptance criteria; fix
material findings. Run targeted tests, existing recommendation/room-kind SQL
regressions, typecheck, lint, build and browser interaction/visual checks.
Document test-first chronology, local DB advisor results, exact limits and
remaining real-listening/deployment gates. No automatic Git or hosted rollout.

Final gate passed: independent reviews resolved, Node/SQL/browser checks green,
typecheck/lint/build passed, file-length gate has no violations. Browser fixture
extraction and expiry timer stabilization were followed by all 18 browser tests
and typecheck/lint. See review-notes.md for warnings and release limitations.

## Approved follow-ups

Owner-approved 030.9: [intentional repeats and coordinated card transitions](queue-and-card-follow-up.md).
Supersedes the Personal duplicate-blocking behavior; implementation in progress.

Approved follow-up completed: **030.5 delivery reliability repair**. Shared lease,
bounded multi-batch event-only pumping after authorized requests, daily fallback
and status receipts are implemented and deployed. See
[release and QA evidence](delivery-release-2026-09-11.md). The live backlog reached
zero; supplied Likes and completion are durable. Broader original-Like history,
stale room precedence, large-library reads and catalogue admission remain distinct
investigations. Git publication is complete: `55b4837` on main and the task branch.

The owner subsequently approved 030.6 catalogue admission, 030.7 account Like consistency and 030.8 compact Discover controls. Implementation, QA and deployment are complete, including the additional claim timeout and persistent Undo notice fixes. See [scope and acceptance](approved-follow-ups.md) and [live release receipt](follow-up-release-2026-09-11.md). The live catalogue reached 308 ready references and zero pending. Final source `4d6d515` is published on main and promoted as `dpl_7MoZvQqUPzXKBcQ48RdVYSoUFthi`.

Stage 2 identity/enrichment/theme verification and Stage 3 community consent/
similarity need new approved slices. Autoplay remains separate. Do not create
placeholder claims, fake tags or fabricated related listeners to fill the UI.
