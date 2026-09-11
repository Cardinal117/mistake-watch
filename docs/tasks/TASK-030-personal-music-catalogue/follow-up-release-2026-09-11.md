# 030.6–030.8 follow-up release — 2026-09-11

Owner authorized the four ordered follow-ups and two assistants. Delivery repair
030.5 is published as `55b4837` on main and the task branch. Remaining release
source was published as `5bcd7d0`, built from a clean Git archive and promoted as
`dpl_FUaaRwQMAfFBHfdB5okKgtzPELpv`. Custom-domain alias and protected health200
were verified. Live Personal UI shows compact regulars and Add next. No live
queue, playback or preference test actions were performed.

## Catalogue cause and repair

One bounded videos.list diagnostic ran in an unpromoted deployment build because
Vercel's sensitive YouTube key cannot be exported. No public diagnostic endpoint,
full environment export or raw provider payload was created. At09:24:26UTC both
supplied IDs were public, processed, embeddable, not age-restricted. Their allowed
country arrays contained248 and249 entries, respectively, including ZA. The old
blanket region exclusion caused their absence, independently of saved Likes.
Diagnostic deployment: `dpl_3VF1XLNUDJWLu3gf9trsTTXqZgav`; custom domain was verified
still serving the delivery repair afterwards. Do not promote that diagnostic.

Country metadata now stays with the private28-day cache; per-viewer filtering
happens before candidate limits, counts and decision reuse. Unknown country is
conservative, legacy RPCs safe, manual playback unchanged. Sources:
[YouTube region semantics](https://developers.google.com/youtube/v3/docs/videos#contentDetails.regionRestriction),
[Vercel request country](https://vercel.com/docs/headers/request-headers#x-vercel-ip-country).

Migration `20260911093623_catalogue_country_admission.sql` applied to production.
File SHA256: `cee05215b223f94823a5a63250f74164845f50138ee47ee66fe6137c60b688fc`.
No account preferences, events or room rows changed by this migration.
Advisor categories/counts remain the existing21 service-only RLS notices,
1 leaked-password warning,6 unindexed foreign keys and15 unused indexes.
No new security/performance category was introduced; the existing auth warning
is described in [Supabase's guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Local proof

Baseline `55b4837`: country worker test failed expected public/actual unavailable.
Database admission lives_ok failed SQL22023 Invalid catalogue result fields
(psql itself exited0; pgTAP reported1 failed of10). After implementation the same
cases passed. Additional country filtering/ownership/expiry/legacy/starvation
checks are post-hoc strengthening:40 SQL assertions green plus77 existing.
Worker10 tests green. Country header contract tests are post-hoc.

Final combined recommendation/YouTube suite **164 passed**. Typecheck,
build and file-length gate passed (0 violations,22 pre-existing warnings).
Full lint exited0; temporary release archives introduced80 generated warnings;
source-only rerun excluded ignored .tmp/test-results and passed with no warnings
after the hook dependency was cleaned. The final25 browser checks passed,
including the added toast and stale catalogue Like regressions.

See [Like evidence](like-consistency-evidence.md) and
[Discover controls evidence](discover-controls-evidence.md) for actual tests,
runtime isolation, browser dimensions and limitations.

## Release order and remaining checks

SpacetimeDB additive reducer published successfully to `mistake-watch-rooms`
before frontend, without `--break-clients`; CLI found no breaking changes.
Bindings regenerated afterwards, root/module TypeScript passed. The CLI's
missing module-local tsc warning is covered by the explicit module check.
Production database read-back confirms131 rooms/2 accounts preserved,
browser access to country RPC denied and unknown-country restriction enforced.

The additive reducer preceded the frontend. A bounded one-time requeue admitted
269 existing referenced retries under the unchanged daily budget, prioritizing
the two supplied IDs. Live verification then exposed the claim bottleneck below.

## Backlog query repair

With 308 eligible owner references, claim recomputed account evidence for every
due job and exceeded the eight-second database timeout (57014). Migration
`20260911100302_catalogue_claim_reference_batch.sql` materializes evidence once
per relevant account, preserving canonical consent checks, full due-job coverage,
ordering, 50-item leases, concurrency fencing and one batch budget reservation.
Applied to production on September 11. Independent SQL review found no blocker.

The old query timed out with 4,500 fixture events, 308 referenced jobs and 400
older orphan jobs. New regression: 10/10 passed in a 3.002-second transaction,
including two claims, 50-item completion and withdrawn/inactive evidence checks.
Existing 77 SQL assertions and concurrency checks passed. Production rolled-back
service-role claim returned 50 within the same 8-second statement timeout;
the measured 6.217-second tool round trip includes network overhead.

Normal live activity resumed hydration: both supplied IDs became public at
10:03:18 UTC. ZA projection now includes `vlrN8Mso-6Y` as liked with one recorded
completion. The other supplied ID has eligible metadata; limited regulars do not
guarantee every liked track is displayed. At the initial recovery read, 189
references were ready and 119 pending, with normal background batches continuing.
All 131 rooms and 2 accounts remain. Advisor categories and counts are unchanged.

Preparation warnings now include a fixed whitelisted failure stage, never raw
SQL/provider errors. The integration regression failed before the logging fix
and passed afterwards; the whitelist secrecy test is additional coverage.
164 Node tests, targeted lint, typecheck and production build passed. Final
observability frontend deployment receipt follows after promotion.
