# Listener receipt implementation evidence — 030.10b/c

Updated 2026-09-11. Local implementation/QA evidence; hosted application and
database releases are recorded separately by the release owner. This slice
implements direct/HLS and uploaded-asset listener receipts. YouTube listener
collection remains inactive behind the approved measurement-origin gate.

## Measurement origin and use review

The mounted observer is `lib/recommendations/use-local-listener.ts`, used only by
`DirectMediaPlayer`. It reads the browser's `HTMLMediaElement.currentTime`,
`paused`, `ended`, `seeking`, `readyState`, `muted` and `volume`, plus corresponding
local state-change events. These are local element observations described by the
[HTML media specification](https://html.spec.whatwg.org/multipage/media.html).
Canonical room position, occurrence, duration and server time provide validation;
no YouTube search, statistics, title parsing, audio extraction or enrichment
provider supplies these observations. Background playback may qualify. The
method describes observed application playback, not human attention or OS/device
audibility, and cannot prove an unmodified browser reported truthfully.

The current [YouTube developer policies, III.E.4.h and III.L](https://developers.google.com/youtube/terms/developer-policies)
restrict API-derived metrics and make additional allowances conditional on
explicit approval. No project-specific approval was verified. Calling an
API-player measurement first-party does not resolve that condition. Therefore
YouTube is rejected both by the runtime observer reducer and durable ingestion;
the new hook is not mounted in `YouTubeMediaPlayer`. Existing Personal recorded
play badges retain their legacy scope. The new private `account_listener` counts
are separate; this work does not assert complete account-wide YouTube learning.

Source identifiers are exact-URL SHA-256 digests for direct/HLS, or stable uploaded
asset UUIDs. Different direct URL query strings remain distinct. Durable receipts
contain neither raw URLs nor media, thumbnail bytes, titles, view/Like statistics,
or lyrics. The private transient outbox briefly carries the canonical source
reference, bounded to 2048 characters, and retry eligibility expires after seven
days. This never extends the separate 28-day provider metadata cache.

## Runtime and durable boundaries

- A verified server route grants an admitted device a maximum 120-second private
  lease. Runtime checks the exact member, admission and live connection. Browser
  observations cannot select an account, consent epoch or history generation.
- Five-second local observations form intervals only when both endpoints are
  audible/playing, the canonical anchor is unchanged, source/occurrence match,
  and local progress fits server elapsed time and playback rate. First arrival,
  seek, pause, buffer, mute, stale session, long gap and reconnect do not fill
  missing coverage. Rapid audible-state transitions bypass ordinary throttling.
- Distinct coverage unions across devices by account/occurrence/permission epoch/
  history generation. A partition must independently reach 90%; intentional new
  occurrences may count again. Operational actor events are never fanned out to
  every member. Partial evidence creates no negative preference signal.
- Per-room limits: 128 grants, 2048 coverage partitions and 512 queued receipts;
  each partition has at most 128 disjoint intervals and a six-hour inactive TTL.
  Unknown/live or over-six-hour duration does not qualify. Full outbox pressure
  retains an un-emitted active partition for retry, without evicting other receipts;
  an occurrence ending while capacity remains full can conservatively go uncounted.
- Indexed bounded cleanup removes expired grants/cursors, coverage and receipts
  during trusted delivery. Durable reads exclude evidence outside 180 days; the
  existing maintenance path physically prunes expired durable receipts.
- The existing delivery lease and scheduler handle receipts in batches of at
  most 100, at most four batches/eight seconds per listener pass. Writes precede
  acknowledgement. Revoked/cleared/expired receipts are rejected and acknowledged
  rather than retried forever; transport/database failure retains pending work.
  Existing delivery counters include this work. Grant renewal and normal private
  reads trigger bounded background delivery; the existing daily 01:00 UTC cron
  is the fallback after the final listener leaves. No new cron was created.
- Supabase migration `20260911123251_listener_receipts.sql` follows permission
  migration `20260911123235_listening_permission_history.sql`. Receipts use a
  partitioned primary key, indexed account/source/time, room/member foreign keys,
  RLS with no browser grants, and service-only RPCs. Ingestion checks consent at
  both interval bounds inside the consent/history advisory-lock transaction.
- Private count reads call the historical eligibility helper, preserving already
  qualified owned-room counts after closure; live grants/new ingestion still need
  an open room. Shared withdrawal, account status, membership and generation
  remain authoritative. Reader results deduplicate account/occurrence again.

The endpoint is `GET /api/recommendations/listening/counts?roomId=...`, optionally
with up to 200 repeated `sourceId` filters. It derives the subject from verified
room access, returns private/no-store results, and reports unavailable rather
than fabricating zero on configuration/database errors. Counts include source,
room-kind breakdown, last qualified observation, 180-day window and method v1.

Conservative limits: terminal nonplaying observations do not credit the final
interval, and canonical clock updates break a pair. Short tracks or sessions with
uncertain continuity may therefore remain uncounted. A qualified receipt can be
created at 90% before a track ends; this is independent of operational manual-next
classification. Partial coverage is transient, so a runtime reset before
qualification can lose partial evidence without creating a false count.

## Verification

Risk classification: permissions, private data, live playback attribution,
idempotency and migrations require focused test-first coverage plus protocol QA.

- Coverage policy: four pre-feature failures, then seven passing cases.
- Count route: three pre-feature failures, then four passing cases, including
  forged account query, denied access, malformed filter and sanitized failure.
- Durable delivery integration: failed because listener receipts were not drained;
  passed after adding the existing leased delivery integration.
- SQL receipt contract: initial five assertions failed before migration, then
  passed. Expanded suite now has 32 assertions, including 5000 receipts under an
  eight-second statement timeout, account isolation, repeat/delivery deduplication,
  overlap rejection, unknown duration, grant/epoch/generation mismatch, future and
  expired receipts, Shared revoke/regrant, history clearing, private grants and
  physical expiry. Closed-owned history regression failed (0 versus 100 retained
  sources), then passed using the separate historical helper.
- Actual reducer harness adds ten cases for two subjects, absent members, device
  union, mute/buffer/seek/disconnect, admission binding, new occurrence, epoch
  partition, private transport and capacity pressure. Most are post-implementation
  integration verification; rapid-mute and repeat-start defects were observed
  failing and fixed before their final passing runs.
- Listener conversion/delivery adds four passing cases for URL/token removal,
  source identity, withdrawn receipt discard and database failure without ack.
  The existing delivery/event regression suite contributes 22 passing cases.
- `scripts/verify-listener-reducers.mjs` passed against the actual local Spacetime
  protocol in `task030-like-proof-listeners` on loopback port 5372. Two admitted
  devices reported 0→5 seconds after a real 5.1-second interval and produced one
  receipt. Ordinary clients could neither read nor acknowledge it; trusted read
  and acknowledgement succeeded. No media or provider request occurred.
- Runtime TypeScript, application typecheck and scoped ESLint passed. Browser
  observer/settings and final full application checks belong to the integrating
  release owner; this file does not substitute for those receipts.
- Local Supabase security/performance advisors ran against isolated
  `task030_catalogue_replay`. Two missing receipt foreign-key indexes were fixed.
  The final scan has no WARN/ERROR findings. Remaining receipt INFOs are two new
  unused FK indexes on the empty post-rollback fixture and intentionally denied
  browser RLS access without policies. Hosted advisors must run after release.

No hosted data, provider scopes, production playback, Git or deployment was
changed by the receipt implementation assistant.

## Data-preserving runtime upgrade proof

The release guard rejected the initial placement of `client_action_id` inside
the existing queue table. The corrected schema appends the optional column at
the end. `scripts/verify-listener-schema-upgrade.mjs` then passed an actual local
upgrade from deployed source `2f3c399` to the corrected module. Both publishes
used `--delete-data=never`; the script rejects non-loopback servers.

- Two real queue rows retained their IDs, order, status and metadata unchanged.
- Two existing recommendation outbox rows survived; the new receipt table began
  empty, and existing queue rows received the optional `None` default.
- The regenerated client added a third row with its new action correlation ID.
- The migration plan added one optional column and four private listener tables.
  It warned that existing clients would disconnect; `--break-clients` was used.
- Evidence: `.tmp/listener-schema-upgrade-uubV3I/current-upgrade.txt` and
  `proof.json`. The repeatable proof script also passed scoped ESLint.

This proves the local schema upgrade, not hosted deployment. A frontend rollback
should retain this additive runtime schema rather than remove populated tables
or columns.
