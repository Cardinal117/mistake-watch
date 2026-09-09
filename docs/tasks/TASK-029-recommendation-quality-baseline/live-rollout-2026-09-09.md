# TASK-029 production rollout — 2026-09-09

Status: deployed. The owner explicitly instructed proceeding with the full rollout
after source publication. No additional approval gate was required.

## Release identity

- Feature commit: `3563b73184220128fdf858e0918ab19f758ff3f0` (43 reviewed files).
- [PR #17](https://github.com/Cardinal117/mistake-watch/pull/17) merged at
  2026-09-09 16:13:14 UTC as `14f8f6c7cbfb7a24293d74c7a0b58ff44d5ce494`.
  Merged tree equals the reviewed feature tree. No hosted CI checks were configured;
  local QA evidence is in implementation.md and backend-verification.md.
- Vercel project `mistake-watch`, deployment `dpl_2fGQVj3WQDuqCkqYz61XpuupEufz`,
  READY and promoted. Deployment metadata identifies the exact merged SHA.
- Live: https://watch.mistakestudios.com. Its alias API resolves to that deployment.
- Built from a clean Git archive of the merged source with the existing hosted
  production environment. No local `.env.local`, synthetic backend configuration,
  or QA fixture flag was uploaded. No SpacetimeDB publish was required.

## Durable migration

Applied exactly `20260909150143_personal_discover_feedback.sql` to the existing
production Supabase project `qzmivwhzotuleivzphhm` using apply_migration. Reviewed
SHA256: `bc8d6caaa5051727ba1c22dc925dc724a7d4f12e242f352c330896db70e6df36`.

The MCP recorded application as `20260909160834`; a guarded transaction aligned
only that new history row to repository version `20260909150143`, preserving its
statements and all 27 earlier migration records. Final history contains 28 entries.
Room count remained 132 and account count remained 2. Both new private tables
were initially empty; no owner history or preferences were fabricated.

RLS is enabled on both new tables. Anon/authenticated have no direct SELECT or
RPC execution; service-role access is present. Public wrappers remain invoker
functions; private Discover functions use the reviewed owner checks and fixed
empty search path. The previous cleanup function remains under
`prune_recommendation_data_before_discover` and is invoked by the new wrapper.

Post-migration advisors reported no new warning/error. Two expected RLS-without-
policy INFO findings reflect intentionally service-only private tables; two new
unused-index INFO findings reflect the empty interaction table. Existing six
unindexed-FK findings and the disabled leaked-password-protection WARN remain.
The latter is an existing Auth configuration follow-up, not changed by this release:
https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Verification

- Pre-release: 699 Node checks, 19 browser checks, 39 SQL assertions, two-connection
  CAS/idempotency checks, typecheck, lint and production build passed. Three
  responsive checks were rerun after extending lower-page reachability coverage.
- Live `/api/health` and `/api/ready`: 200; Supabase and SpacetimeDB ready.
- Live `/dev/listen-design` and `/dev/room-kinds`: 404.
- Valid Personal Discover request without a session: 403, active membership required.
- Existing signed-in owner browser: Personal room loaded eight actual liked
  regulars with metadata, truthful zero recorded Personal plays, seven provider
  suggestions, and the correct empty Rediscover state. Count explanation and
  feedback menu (Not now / Don't suggest / Wrong version) opened correctly.
- Discover/Visualizer tab switching worked. The Personal queue remained empty.
  No tracks were played, enqueued, rated, or suppressed as release test data.

## Trial limits and follow-ups

The new Personal room has no retained completed plays yet, so zero counts and an
empty Rediscover section are expected; account Likes already populate regulars.
With no current source/history, the existing ranker supplied broad recommendations,
including short clips. This is a cold-start quality limitation to evaluate during
normal listening, not evidence that recommendations already match the owner's taste.

A transient existing participant-ownership heartbeat toast appeared while entering
the room in another browser tab, then disappeared. No TASK-029 reducer changed;
multi-tab room identity remains a separate observation if it recurs.

Desktop signed-in production UI was inspected. Mobile/landscape/tablet, dynamic
song-gradient continuity, queue confirmations and feedback persistence have local
browser/backend proof; they were not re-created against owner production data.
Physical-device playback and normal-listening usefulness remain unverified.
Fantasy/orchestral strict-theme eligibility, Classical/phonk boundary evaluation,
and continuous Autoplay remain later scope. Nothing is automatically enqueued.

Next: ordinary owner listening in the Personal room, followed by an explicitly
requested read-only diagnostic review. No scheduled monitoring was created.

Raw release receipts remain ignored under `.tmp/recommendation-baseline/`.
