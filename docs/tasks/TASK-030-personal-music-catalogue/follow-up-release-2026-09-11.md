# 030.6–030.8 follow-up release — 2026-09-11

Owner authorized the four ordered follow-ups and two assistants. Delivery repair
030.5 is published as `55b4837` on main and the task branch. Remaining release
is in progress; do not treat local evidence as deployment acceptance.

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

Final combined recommendation/YouTube suite **162 passed**. Typecheck,
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

Publish additive trusted account-intent reducer before frontend; old reducers
and table contracts stay compatible. Deploy a clean Git archive, verify protected
health then promote, preserving live user playback. Requeue previously excluded
referenced catalogue jobs once under the unchanged global worker budget, with
the two supplied IDs first. Verify saved Likes, country-eligible projection,
counts and live application response without synthetic user actions. The toast
auto-dismiss follow-up must pass before the final frontend release.
