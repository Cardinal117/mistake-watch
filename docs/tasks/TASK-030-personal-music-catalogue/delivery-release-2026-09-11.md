# Delivery reliability repair — 2026-09-11

Status: **deployed, live backlog cleared; Git publication pending**. Owner
approved fixing/resolving the confirmed slowdown when safe. No Like/queue/playback
test mutation or synthetic production event was used. Existing trusted events
were persisted by the deployed worker and then acknowledged through the existing
authority contract.

## Cause and repair

Inspection found 4,503 pending SpacetimeDB events. The daily recommendation drain
processed one oldest-first batch of 50, while normal queue/playback/Like activity
produces several events per track. Cleanup can also drain bounded batches, but
this is insufficient for prompt delivery. Successful HTTP maintenance responses
were not evidence of an empty queue. No overflow records were reported.

The repair uses one trusted connection for batches of at most 100, up to 20
batches and a shared absolute 20-second event-operation deadline per invocation.
Failed or timed-out persistence never triggers a subsequent acknowledgement.
Already committed writes can replay safely through existing tombstones. Source
timestamp/event-ID ordering prevents an older Like overwriting a newer unlike.

A service-only singleton lease uses DB time, a 120-second deadline and fenced
completion. Success cooldown is 10 seconds, failure cooldown 30. Authenticated
preference GET/PUT and Personal Discover GET schedule event-only delivery after
the response. Existing UI polling supplies activity without new client timers.
Pruning and provider work remain outside this event-only path; daily maintenance
retains its existing housekeeping. Diagnostics record last state, processed count,
finish time and oldest pending timestamp when observed. Partial or failed is not
reported as empty. No new SpacetimeDB module publication or provider credentials.

This is activity-driven delivery plus a daily fallback, not a permanently running
worker. Hidden/offline clients may wait for another active request or maintenance.
The current response can precede delivery; a later poll reads the new count.
Malformed events stop the worker with a failure receipt instead of being dropped.
The cron's total time also includes its existing catalogue maintenance; only the
event window has the new shared deadline. Larger future traffic requires measured
capacity and potentially a dedicated scheduled worker.

## Verification

- Test-first red at base `53065af`: multi-batch test processed 100 rather than
  250; second-batch failure was never reached; retry left events pending.
  These exact tests passed after implementation.
- Independent review caught an in-flight duration gap. A slow-persistence test
  reproduced late acknowledgement before the shared deadline fix; it passes now.
- Final Node suite: **148 tests passed**. Route/worker integration coverage was
  added after integration (post-hoc), checking authorization, after-response
  scheduling, busy leases, failed/stale finish and no provider/prune dependency.
- Local migration gate: missing capabilities failed before migration; **45 SQL
  assertions** passed after applying to isolated `task030_catalogue`.
- Eight concurrent lease attempts produced exactly one owner; stale/expired
  tokens could not clear a replacement lease. Cooldowns and browser denials passed.
- **193 existing SQL assertions** passed for learning/audit, Personal Discover
  and catalogue; **4 additional real-ingestion assertions** proved old Like versus
  newer unlike ordering and duplicate replay. Missing historical fixture seeds
  and pgTAP grants were supplied only within rollback test transactions.
- Typecheck, targeted ESLint and final build passed. File-length check: zero
  violations, 22 existing warnings. No UI layout change, so no new visual suite.

## Production receipt

Supabase project `qzmivwhzotuleivzphhm`: applied tested delivery lease migration.
Tool-assigned history version **20260911085543** is used as the local filename;
no hosted migration history was rewritten. There are now 30 migrations. File
SHA256: `e9d175f28b65361f596e0ece7cbeaa33f557af9a3fc6ca4eabb98c86308222bc`.
Hosted RLS/browser-denial checks passed. Rooms **131**, accounts **2**, unchanged.
Advisors: 21 INFO service-only RLS notices, 6 INFO unindexed foreign keys, 15 INFO
unused indexes and the existing leaked-password protection WARN. No new warning
or error; existing [Auth follow-up](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
was not changed. Current Supabase [function guidance](https://supabase.com/docs/guides/database/functions)
and [changelog](https://supabase.com/changelog) were checked before implementation.

Deployment **dpl_2wHwwMjnrAsXRiC9uFrPwRQhfB7e**, production URL
[watch.mistakestudios.com](https://watch.mistakestudios.com), built successfully at
08:57:44 UTC and promoted after protected-deployment health/readiness 200, hidden
QA route 404 and unauthenticated preference access 403 checks. Production
health/readiness returned 200 JSON after promotion. The prior live alias was
verified unchanged before promotion. No error/5xx appeared in the bounded
100-entry deployment log sample inspected during recovery.

Source is a clean archive of `53065af4541a9dd9deadc397e4e1459bc25726d3` plus exactly
the nine runtime/migration files in [delivery-runtime-manifest.json](delivery-runtime-manifest.json).
Manifest SHA256: `0c07c91eaf67fb6127c5247f35808904cb3188e41ae0ab95dc59de673b8ed14a`,
also verified in deployment metadata. No local environment file or unrelated
uncommitted UI notes were included. This is an auditable patch deployment, not a
claim that the repair exists in a published Git commit. Source/tests/docs remain
uncommitted; do not redeploy old main and reintroduce the defect.

## Live outcome and limits

The first observed run processed 2,000 events in approximately 13 seconds and
reported partial. Subsequent normal authenticated activity reduced the backlog to
975 and then **zero**. A later delivery receipt at 09:01:40 UTC reported empty,
processed 0, oldest pending null. No manual repeated combined-cron calls were used.

Both supplied uploads now have durable account Likes:

| Upload | Durable Like timestamp (UTC) | Personal completed plays |
| --- | --- | ---: |
| `vlrN8Mso-6Y` | 2026-09-11 08:29:45.238 | 1 |
| `FqvZVGL1_Vk` | 2026-09-11 08:26:57.902 | 0 |

These timestamps match the pending live Like events. This proves current delivery
recovery, not the history of the owner's earlier remembered Likes. The second
upload had no qualifying completed play in the checked data; zero is expected.

Both uploads were separately classified unavailable by the existing conservative
catalogue worker, with no cached metadata; neither appears in the Personal
catalogue projection despite its saved Like. Do not label the reason more
specifically than the retained job evidence permits. Investigating admission
coverage is separate from this repaired transport. Live UI continued playing
without agent intervention and gained cached candidates with "You chose this
before" reasons as data arrived; this does not prove visible nonzero counts for
the two excluded uploads. No false UI acceptance claim.

Further work: catalogue admission diagnostics, original-Like consistency audit,
then the captured regulars/Add next UI changes. Account-wide completions,
classification, community learning and Autoplay remain separate scoped work.
