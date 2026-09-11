# Stage 2 foundation: references, corrections and strict evaluation

2026-09-11. Owner accepted the preceding live rollout and authorized Stage 2 with
one independent reviewer. This document covers local 030.11a/b implementation;
provider activation and natural-listening pilot remain subsequent gates.

## Implemented boundary

- Private, account-owned recording/version references, entered explicitly. An
  internal UUID identifies the reference; it is not an externally verified MBID.
  Display text is independently authored, never copied/inferred from YouTube.
- Source links require existing eligible account evidence. Revisions survive
  unlink/relink and catalogue expiry/re-registration. Exact link retries are
  payload-bound; changed payload or stale expected revision fails.
- Private classification assertions distinguish theme, instrumentation, genre
  and mood. Each has evidence reference, polarity, status, review/expiry dates,
  provenance, private-use label and revision. Withdrawal cannot be overwritten
  by a stale save. Assertion retries require refetch on conflict, not blind retry.
- Evidence readers intersect account eligibility and the current source registry.
  They return complete assertion sets and assertion revisions. A future cache
  must include both link and assertion revisions; no cache is introduced here.
- The offline selector filters eligibility before result limits, keeps versions
  separate, prioritizes favourites/rediscovery, and includes strict Fantasy only
  with supported theme AND orchestral instrumentation. Contradictions, uncertain
  links and unusable evidence abstain. Genre alone never proves theme.

No UI, live ranking, scheduler, provider calls, schema deployment or external
recording verification is introduced. There is no automatic title matching,
global correction publication or transfer of Likes/counts between uploads.
The evaluator receives typed trusted inputs; it is not a public JSON endpoint.
Its caller must independently supply admitted country/availability and metadata
expiry, and cannot feed it the existing prelimited live candidate window when
implementing the future strict pilot.

## Field/use review

| Field/path | Origin/use | Retention and activation |
| --- | --- | --- |
| Internal recording ID and display identity | Explicit independent owner entry for one performance/version | Account-private; account deletion cascades; no automatic external match |
| Link source ID and correction revisions | Existing eligible catalogue reference plus owner correction | Compact tombstone/audit survives source cache expiry; current reads still require source existence; no cached provider metadata copied |
| Private assertion | Owner-authored classification/reference; private-use label is provenance, not a third-party licensing grant | 180-day maximum evidence validity; expired evidence abstains; no global reuse |
| Synthetic identities/assertions | Labelled unit fixtures | Test files only; SQL forbids synthetic origins; selector requires explicit fixture mode |
| YouTube title/channel/views/likes/art | Existing Stage 1 display cache only | Existing expiry unchanged; no Stage 2 derivation/enrichment path enabled |
| MusicBrainz core recording identity | Potential later independently confirmed recording lookup | Inactive until adapter field mapping, meaningful contact User-Agent, shared rate control and reference-entry path are reviewed |
| MusicBrainz tags/genre associations | Supplementary data | Inactive; not treated as unrestricted core identity data |

Official review: [MusicBrainz database licensing](https://musicbrainz.org/doc/MusicBrainz_Database)
distinguishes core identity from supplementary tags/genre associations.
[YouTube policies](https://developers.google.com/youtube/terms/developer-policies)
remain the provider-use gate; app permission does not settle provider permission.
[Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security)
was checked together with the changelog. No GraphQL, Studio, server upgrade or OAuth
change from the listed breaking changes is involved in this additive local schema.

## Database access and correction contract

Four new private tables have RLS, no browser policies and no direct service-role
table mutation grants. Narrow service-only functions validate active accounts;
the future application caller must derive that account from a verified session.
No new HTTP endpoints expose these functions. Global reviewed records are deferred
instead of overloading null ownership or silently promoting personal assertions.

`enter_recording_reference` creates an immutable account-scoped reference; an
identical retry succeeds and conflicting identity text fails. Corrections create
a separate reference and use `revise_recording_link` with the current revision.
`revise_recording_assertion` changes private evidence using its current revision.
`read_recording_evidence` returns at most 96 requested eligible source links and
at most 64 assertions per recording. Mutation enforces the assertion capacity;
overflow is explicitly incomplete rather than silently dropping contradictions.
Always read current state after a retry: an old operation result describes that
operation, not necessarily the latest link revision.

## Verification chronology

Baseline `b66c2b5`, clean worktree. New selector scaffold returned no candidates.
Its behavioural tests first failed on expected strict inclusion, familiar-first
ordering and performance preservation; 15 then passed after implementation.
SQL tests first failed all 8 intended link/reference behaviours against absent
capabilities. Three subsequent assertion tests failed before assertion mutation
was added. Later access/pruning/reader checks are post-hoc regression coverage.

Commands:

```powershell
node --test tests/recommendations/recording-selection.test.mjs
node --test tests/recommendations/*.test.mjs
npm run typecheck
npx eslint lib/recommendations/recording-selection.ts tests/recommendations/recording-selection.test.mjs
```

SQL runs use only `task030_catalogue_replay` in local
`supabase_db_mistake-watch-task028`, with rollback fixtures and `ON_ERROR_STOP=1`.
pgTAP failure lines must be inspected: psql exit zero alone is not a test pass.
The migration was iterated only in this isolated database, not the live local
app database or production. Initial result: 20 SQL assertions, 176 recommendation
tests, typecheck and scoped ESLint passed. Independent review confirmed the
revision/ownership boundaries and identified blank `owner: ` provenance. That
finding was reproduced in both SQL and selector tests before fixing all three
database reference constraints and requiring a nonblank owner reference plus
the exact private provenance label in selection.

Final focused SQL: 21 assertions pass. The recommendation suite now contains
177 passing tests (16 Stage 2 selector cases). Database public/private lint has
no errors; local security/performance advisors have no WARN/ERROR findings.
No UI changes or route integration occurred, so browser/build repetition is
not a meaningful gate for this isolated foundation. Typecheck and scoped lint
cover the new TypeScript; source file-length checks have no new violations.

Independent real concurrency proof:

```powershell
node scripts/verify-recording-identity-concurrency.mjs --local-fixture
```

Two simultaneous edits expecting revision 1 produced exactly one success and
one SQL `40001`, a revision-2 head and two audit rows including the original.
The script permits only the fixed isolated local database and removes its random
synthetic account/source fixtures. Production was not modified.

## Remaining gates

030.11c needs an approved usable field mapping and independently confirmed real
recording references before enabling enrichment. 030.11d needs live eligibility
filtering before existing candidate limits and an owner-visible evidence review
path. Synthetic fixture success does not establish real classification quality.
Proceed to that integration only after these foundations pass review; do not
present this local foundation as an activated Fantasy/orchestral recommender.
