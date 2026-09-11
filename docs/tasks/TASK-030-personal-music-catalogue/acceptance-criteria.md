# Acceptance and verification

## Required behavior

- AC1: Same trusted video reference produces one registry row and one refresh job;
  source metadata is reused across independent sessions/users referencing it.
- AC2: Public metadata admission requires server-verified public and playable
  status. Unlisted, private, unknown, absent and expired metadata cannot be served
  as shared recommendations; manual access and saved preferences remain intact.
- AC3: Personal reads recheck active owner/account/room and never return another
  user's candidates, history, feedback, counts or explanation. Browser roles
  cannot enumerate or mutate catalogue tables/RPCs.
- AC4: Existing Like, consent/withdrawal, Temporary exclusion, clear-history and
  event idempotency contracts remain. Browser impressions are not preferences or
  catalogue-use facts. No provider metadata contributes to own-app taste scores.
- AC5: Bounded backfill preview does not write/call providers; apply matches its
  eligible IDs, is idempotent and does not resurrect expired/withdrawn evidence.
- AC6: Foreground Personal reads and known-track changes call zero YouTube search
  or synchronous provider metadata. Batch refresh is bounded, deduplicated,
  budgeted globally and fenced against stale concurrent completion.
- AC7: Failed refresh never renews stale metadata. Read-time expiry excludes it;
  cleanup works during SpacetimeDB failure and leaves Likes/exclusions intact.
- AC8: Suggestions originate from owner evidence and fresh catalogue rows. Missing
  evidence gives sparse/empty results, not generic popular or fake related music.
  Blocks/snoozes/version exclusions apply before pool/output limits.
- AC9: Explanations correspond to actual first-party evidence; completion counts
  retain their recorded-occurrence wording and never claim lifetime/attention.
  Bounded server-owned decision records persist reason/version and correlate
  browser observations without promoting them to trusted queue facts. Original
  decision survives an in-flight queue request across recommendation refresh.
- AC10: Current item is excluded, queue-confirmed rows show their state, explicit
  actions retain permissions; no autoplay/refill/queue mutation on a read.
- AC11: Accepted desktop/mobile Discover layout, bottom-scroll accessibility,
  tabs and per-song gradient are preserved. Expired mounted data is removed.
- AC12: No new provider accounts, production writes, user profile exports, media
  blobs, external genre claims, community learning or Git publication.

## Testing strategy

Owner-approved 030.6–030.8 scope and release supersede the original local-only
AC12 gate for these follow-ups. Acceptance includes country filtering before
limits and decisions, freshest account Like/CAS/identity isolation, compact
regular controls and visible Add next. See [follow-up acceptance](approved-follow-ups.md).

Risk: high (privacy, durable data, external API costs and concurrency). Required
test-first at SQL and pure server boundaries; browser test-first for automatic
search regression. Existing queue/feedback/layout tests provide characterization.
Documentation/copy do not require invented automated tests.

Record baseline revision and real red/green assertions in review-notes.md. Missing
module/syntax/fixture errors are not behavioral red evidence. SQL baseline can
assert absent catalogue capability via a schema capability assertion before
migration; substantive behavior tests then validate the implementation, honestly
labelled where they are post-hoc. Browser no-search test must fail against the
existing seed-triggered implementation before it is removed.

Local test layers: unit reader/ranking/worker, pgTAP access/expiry/consent and
concurrency, targeted existing suites, desktop/mobile actual component route.
Real listening usefulness, real provider quota consumption, production schema/
scheduler health and physical-device checks are separate release/pilot evidence.

## Follow-on account-wide and Stage 2 gates — approved September 11

The [030.10 contract](account-wide-listening-contract.md) and
[030.11 Stage 2 plan](stage-2-identity-and-classification.md) provide the acceptance
criteria for subsequent authorized work. They do not change Stage 1's completed
QA claims. Required additions cover listener/actor separation, fresh Shared
permission, Themed ownership, device deduplication, consent/history generations,
legacy count distinction, private account reads, recording-version identity and
classification provenance. Implementation and those new tests are pending.
