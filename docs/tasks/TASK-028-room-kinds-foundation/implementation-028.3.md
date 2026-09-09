# 028.3 Learning policy and attribution

Status: implemented and verified locally on 2026-09-08. High effort. No Git or hosted writes.

## Path inventory and implementation contract

Capture is in Spacetime recommendation-events/tables: trusted reducers emit bounded operational events with room/session/occurrence, actor member and server time. Outbox claim/drain/ack is trusted-server-only and idempotent. It does not aggregate account taste. Durable ingestion is persistence.ts -> service-only ingest_recommendation_events RPC. That RPC currently aggregates all attributed activity; room-service.ts consumes those aggregates. Explicit preferences also flow through the same outbox; preference-service reads durable and live likes. No separate recommendation trainer exists.

Keep that capture contract and Legacy ingestion unchanged. Derive new-kind policy provenance from immutable durable room kind, server event time and a version activation timestamp at ingestion; never accept policy/account/consent fields from the client. Missing or older-than-activation provenance cannot acquire new-kind implicit learning. A guest's pre-sign-in events cannot become account training retroactively.

For new kinds, store a service-only event eligibility record alongside operational events, including kind/version, actor account and separate account/room eligibility. An event is evidence about its verified actor only, not every listener or its queue contributor. Queue remove/reorder, playback failures, automatic replay/start/skip and ambiguous completion remain neutral. Initially only explicit queue choice/Play Next and explicit Like/Unlike qualify. Richer listening inference needs later measured rules.

Personal learns only eligible owner actions. Shared implicit learning requires separate contribution/individual consents at event time AND current use. Consent intervals are append-only; withdrawal closes the interval, immediately removes old contributions from reads, and re-grant never revives them. Explicit Likes/Unlike remain personal actions independent of Shared consent; erasure is a separate account operation. Shared consent mutation derives auth.uid() and requires active account membership; no UI or Shared creation is exposed in this slice. Themed implicit learning stays denied until direction/version eligibility is implemented in 028.5. Temporary implicit events are acknowledged without storing durable event/training rows; only opaque expiring deduplication tombstones remain. Its live outbox remains bounded operational transport, not taste storage. Explicit attributable Likes may persist.

Keep Legacy materialized aggregates untouched. New-kind aggregates are read from the eligible event ledger with current consent/account checks, rather than adding irrevocable counts to mixed Legacy totals. This preserves provenance for withdrawal. Bound queries by room/account, retention and result limit; no media-tick database calls. Bypass the ranker's result cache when new-kind policy applies so withdrawal is not hidden by a stale cached response. Existing ranking weights are unchanged.

Deduplicate implicit occurrence evidence by room/session/account/media/action/occurrence, independent of device or retry ID. Explicit preference revisions retain chronological Like/Unlike semantics. Do not collapse unrelated manual choices simply because they are on the same media.

RLS/grants: eligibility and consent history in private schema, no direct anon/authenticated grants. Public read RPC is service-only and must receive already authorized room/account context. Self-consent wrapper is authenticated only, derives identity, validates Shared membership and active non-anonymous account, and exposes no other user's consent. Unknown kinds and missing/deleted/ineligible accounts fail closed. Existing Legacy statistics remain historical; no migration rewrites their values.

## Validation plan

First reproduce Personal failure telemetry creating an account aggregate and Temporary implicit activity reaching durable storage using the existing ingestion RPC. Then SQL matrix tests for attribution, policy timing, consent withdrawal/regrant/replay, duplicate devices, explicit Likes and Legacy compatibility. Unit coverage for server aggregate routing/cache behavior, existing outbox/reducer suites, local schema replay/advisors, typecheck/lint/build. No new scoring or recommendation-quality claims; Shared/Themed/Temporary stay disabled.

## Implementation and review

Migration `20260908124308_recommendation_learning_policy.sql` adds versioned eligibility and consent intervals, integrates them into the existing service-only ingest RPC, and cascades event retention into eligibility. It leaves the Legacy aggregation branch and ranking weights intact. `room-authorization.ts` carries the trusted room kind; `room-service.ts` selects the revocable projection, and `room-service-core.ts` bypasses cached ranked responses for new kinds. Database types include the two public RPC signatures.

The eligibility helper and aggregate projection use narrowly granted SECURITY DEFINER functions with empty search paths to validate Auth identities without granting the service role direct access to `auth.users`. Neither is callable by anon/authenticated roles. The authenticated consent wrapper derives the caller and cannot mutate another account's consent. The migration follows the project's private-schema pattern; [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security) was checked. Local database lint and security/performance advisors reported no issues.

Before activation the migration refuses existing non-Legacy recommendation events or materialized room aggregates. Such data needs a reviewed reconciliation rather than silently becoming Legacy training. This safeguard must be resolved before a hosted rollout if earlier Personal experiments produced data. Apply policy before enabling new-kind learning. Do not roll back to the unrestricted old ingest function while new kinds remain enabled.

## Verification evidence

- Test-first SQL baseline: four of the original six assertions failed against the old ingestion behavior (Personal failure aggregation, Temporary event storage/aggregation, Shared aggregation without consent). Legacy behavior and explicit Like checks already passed. A fixture setup error was corrected before recording this baseline.
- Cache regression initially failed: two new-kind requests performed only one aggregate read. The policy-aware bypass now reads twice; existing Legacy cache tests still pass.
- Full Node suite: **651 passed**, zero failures.
- Local SQL suite: **98 assertions passed across four files**, including 37 learning-policy assertions. Coverage includes event-time attribution, missing/forged/anonymous actors, neutral failures/skips/removals, consent withdrawal/re-grant, old-event replay, duplicate occurrence reports, Temporary explicit Likes, Themed manual neutrality, and retention cleanup.
- The first real HTTP drain exposed an Auth-table privilege error despite SQL checks passing as postgres. Fixed the function privilege boundary and added explicit **service_role** ingest/read assertions. This was an integration defect found and resolved during QA.
- Browser suite: **three tests passed**. Existing Personal multi-context access/resume/playback/mode checks and desktop/mobile Legacy grouping remain green. The Personal test now adds a real queue item, drains the actual local Spacetime outbox through HTTP into Supabase, verifies account evidence, and calls the recommendation API twice successfully with fresh policy reads. Synthetic candidate metadata avoids external YouTube calls.
- Replayed the final migration through the CLI from a clean local database at 028.2 with populated Legacy fixtures, then reran all 98 assertions, database lint and advisors successfully.
- Typecheck, lint and production build all passed. See final command logs in `.tmp/task028-3-*.log`. Logs and browser traces are local ignored QA artifacts, not release attachments.

Reproduction uses the isolated setup documented in [028.2](implementation-028.2.md): Supabase `mistake-watch-task028` (API 55421, DB 55422), unchanged Spacetime module on 5376, Next app on 5384. Run `supabase test db`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`; browser tests use `PERSONAL_ROOM_QA=1` and `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5384`. Never reset a hosted or unrelated database. Browser-created accounts are synthetic and cleaned up.

## Limits and next slice

This establishes enforceable learning boundaries, not recommendation quality. Implicit full-listen/completion inference is intentionally not enabled without reliable attribution rules. Shared/Themed/Temporary remain disabled outside rolled-back SQL fixtures. Shared consent UI/persistent membership is **028.4**; theme eligibility is **028.5**; Temporary lifecycle/deletion UX is **028.6**. Keep **High** effort for 028.4 because admission, removal, account identity and independent consent interact.

Projection output is capped at 250 groups and uses existing room/account event indexes plus retention; no database work is added per media tick. Larger-history load measurements and a consent-aware materialization strategy belong to later optimization if needed. Explicit Likes remain until changed/erased; withdrawing Shared implicit consent does not erase Likes or historical operational events. Existing account/event deletion cascades and bounded event retention still apply.

No hosted migrations, production provider playback, physical-device QA, Git staging/commit/push or deployment occurred in this slice. Earlier accepted production remains untouched. The root checkout receives only this TASK-028 Markdown packet mirror; implementation lives in the isolated worktree.
