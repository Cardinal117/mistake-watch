# Stage 1 release and natural-use trial

Status: **Stage 1 deployed, 2026-09-11**, under the owner's full rollout approval.
PR #18 merged as `d4b2b89`; the reviewed migration and bounded Personal
reconciliation are applied. See [live rollout](live-rollout-2026-09-11.md) for
deployment, maintenance, access checks and the 6-of-24 candidate coverage limit.
The [preflight](production-preflight-2026-09-11.md) preserves the earlier baseline.

## Candidate and prerequisites

- Review the complete Stage 1 diff and local QA evidence in review-notes.md.
- Additive migration: `20260911055006_personal_music_catalogue.sql`.
- Server RPC types and application candidate must ship together after the
  migration. Keep TASK-028 room permissions and TASK-029 feedback intact.
- Use existing server YouTube credential; no new Google scopes/accounts.
- `MUSIC_CATALOGUE_METADATA_DAILY_LIMIT` defaults to 100 batch requests per UTC
  day; 0 disables refresh while retaining cleanup. The DB also caps at 100.
  This is separate from manual search and existing provider-call budgets.

## Reviewed production sequence (executed; receipts linked above)

1. Inspect hosted migration parity, new names/constraints and current room/account
   counts before applying the migration. Do not assume the local clone is live.
2. Apply the reviewed additive migration transactionally. Run security/performance
   advisors and verify browser roles cannot access new tables/functions.
3. Preview bounded reconciliation for the approved Personal pilot account, retain
   the exact ID list privately, and review counts/eligibility. No provider calls
   occur during preview. Apply only that list with current eligibility rechecks.
4. Deploy the reviewed application. Its existing daily recommendation cron calls
   catalogue maintenance before room transport; manual playback stays available.
   Discover also schedules one bounded background preparation pass after reads.
5. Verify freshness expiry, public-only admission, queue/feedback and observed
   request counts on desktop/mobile. Confirm existing rooms/accounts unaffected.
6. Monitor cleanup failures, pending work, batch reservations and cache hit/miss
   behavior. Read-time expiry alone does not physically delete expired data.
   The 28-day operational expiry provides margin below the 30-day refresh/delete
   requirement, not permission to ignore failed cleanup indefinitely.

## Disable and rollback

- Set catalogue worker daily limit to 0 to stop new provider fetches. Continue
  cleanup; do not remove its schedule while cached data remains.
- If application rollback is necessary, retain a working maintenance path or
  explicitly purge the provider cache before removing maintenance. Older
  application code can restore the unwanted per-song search, so prefer a scoped
  corrective release or honest unavailable Personal suggestions instead.
- Migration is additive. Do not roll back by deleting Likes, rooms, history,
  consent or feedback. Registry/cache/decision cleanup is separate from preference
  ownership and live SpacetimeDB state.

## Pilot and next-stage decisions

The owner listens normally in their own Personal room. No mandatory unfamiliar
listening session or rating homework. Start with existing favourites/rediscovery.
Review real candidate coverage, whether returned versions are welcome, catalogue
reuse and the proportion of provider calls caused by maintenance versus explicit
search. Do not claim listening quality from synthetic pass counts.

Use server decision IDs to inspect what was offered and why, and distinguish
browser shown/requested/observed records from actual trusted queue events.
Temporal proximity is not exact causal attribution. Do not turn non-selection,
network failure, tab inactivity or an organizational queue removal into dislike.

Stage 2 requires a bounded identity/enrichment evaluation against Fantasy/
orchestral, Classical performances and phonk edits. Validate permitted provider
use, correct-version precision, coverage and uncertainty before strict-theme
activation. Stage 3 separately defines community contribution controls, withdrawal,
cohort sufficiency and honest explanation thresholds. Autoplay is not included.
