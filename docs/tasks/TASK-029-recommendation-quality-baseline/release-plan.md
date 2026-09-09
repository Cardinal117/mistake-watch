# TASK-029 release plan

Prepared 2026-09-09; executed after the owner's subsequent Git and full production
rollout approval. See [live receipt](live-rollout-2026-09-09.md). The sequence below
preserves the original review plan; its approval checkpoints have been satisfied.

## Proposed release

Commit and push the exact scope in [commit review](commit-review.md) on
`codex/task-029-personal-discover`, based on `77c1943`. Proposed commit:
`feat(listen): add personal discover regulars and feedback`.

Release includes Personal Discover, the shared Listen stage tab styling, and
one additive Supabase migration. It introduces no SpacetimeDB schema/reducer change,
worker release, new provider scopes, new environment variables or automatic enqueue.
Other room types keep their existing discovery content/learning behavior.

## Sequence after the relevant approval

1. Recheck approved file scope, remote main and branch identity. Create the named
   branch in this existing worktree; stage only the enumerated files, review the
   staged diff, commit and push. Preserve other worktrees and intake notes. Treat
   push/PR review as source publication, not production acceptance. Verify hosted
   Git deployment settings before push; do not assume a preview has isolated data.
2. For production approval, resolve the existing production Supabase and Vercel
   targets from the TASK-028 release receipt and verify their identities. This
   worktree's ignored `.env.local` points at synthetic LOCAL services and must
   never be uploaded or used as production configuration. Verify QA fixture flags
   such as `WATCH_DESIGN_QA` are absent from production.
3. Inspect production migration history and the prerequisite retention function.
   Confirm only `20260909150143_personal_discover_feedback.sql` is proposed by the
   migration operation; stop if unrelated migrations would be included. Preserve
   existing room/account data. Apply this migration through the approved migration
   workflow with migration history recorded, never a reset or schema dump restore.
4. Verify new table RLS/grants, service-only RPC exposure and private owner checks.
   Confirm the retention wrapper still invokes the previous cleanup implementation
   and adds Discover telemetry retention. Run security/performance advisors and
   distinguish pre-existing warnings from regressions. Missing schema is a stop
   condition before frontend release.
5. Deploy the approved exact frontend revision to the existing Vercel project and
   verify the resulting revision/alias. Merge/main publication requires its own
   approved action and must be coordinated with actual auto-deployment settings.
   No SpacetimeDB module publish is part of TASK-029.
6. Verify health/readiness and authenticated Personal Discover on the live site:
   known Likes/count definitions, provider metadata, queue confirmation, feedback
   and restoration across reload/device, current-source suggestions, gradient
   changes and mobile controls. Verify non-Personal room content remains as before,
   desktop tabs work, and development fixture routes return 404. Do not manipulate
   the owner's queue/history as synthetic test data or fabricate listening events
   in production. Agree on any temporary production QA account before creating it.
7. Record exact Git SHA, migration receipt, Vercel deployment identity, checks and
   observed limits in the task/handoff. Start the owner's normal-listening trial
   only after this verification; no forced listening/rating exercise.

## Rollback and compatibility

The schema is additive to existing room/playback tables. It creates two private
Discover tables and service-only functions, and wraps the existing retention
function. Existing frontend code can run with this schema installed.

If the new frontend fails, restore the last verified TASK-028-compatible frontend
and suspend the trial. Retain Discover tables/feedback for recovery; do not drop
data or revert room-kind infrastructure. The old frontend does not enforce the
new Discover exclusions, so its suggestions must not be presented as continuing
the new feedback trial. Any database corrective migration needs its own review.

## Release notes draft

Personal rooms now have a redesigned Discover page with your regulars, Likes,
recorded play counts, recommendations and rediscovery. Add suggestions to the queue
or use Not now, Don't suggest and Wrong version; saved choices can be reversed.
Discover/Visualizer have clearer controls, and the background still changes with
your music. Nothing is added to the queue automatically.

Recorded counts cover retained completed playback in the last 180 days, including
repeats; seeking can qualify. These are not lifetime totals. Recommendation quality
and real provider behavior still require the live listening trial.

## Original approval checkpoints — now satisfied

- Owner approved branch/staging/commit/push, then proceeding with the rollout:
  merge to main, the reviewed hosted migration, deployment and live verification.
- No production QA accounts, destructive cleanup, messages or automatic monitoring
  were needed or performed for TASK-029.
