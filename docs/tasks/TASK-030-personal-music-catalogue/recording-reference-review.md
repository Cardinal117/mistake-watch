# 030.11c — explicit recording reference review

Owner approved continuation and confirmed non-commercial friends-and-family use.
One independent reviewer checks this slice. Existing uncommitted 030.11a/b work
is preserved and remains the prerequisite migration.

Deliver a Personal Discover “Recording details” action. The owner submits an
explicit MusicBrainz recording URL; the server validates account/source eligibility
and queues a bounded lookup. GET never calls a provider. A compact review displays
core title, credited artist, disambiguation and optional duration. Confirming
“same performance and version” binds fresh server evidence to that account's
selected source with revision checking. A user may remove a link. No genre
inference, title search, automatic merge or automatic queue addition occurs.

Use only CC0 core recording ID/title/artist credit/disambiguation/duration from
[MusicBrainz database](https://musicbrainz.org/doc/MusicBrainz_Database). No tags,
ratings, annotations or genre associations. Store compact fields only, never full
provider payloads. Lookup uses a fixed endpoint, no redirects, and sends no app
account/source identity. Unexpected/moved MBID abstains. Duration is informational.

The [API](https://musicbrainz.org/doc/MusicBrainz_API) free non-commercial service
gate is satisfied by the owner's explicit answer. Use a versioned app User-Agent
with the verified public GitHub project contact URL. A shared database lease
covers the in-flight request and cooldown; timeout is shorter than the lease.
Hard daily limit 100, maximum three attempts, bounded Retry-After/backoff. One
job per MBID, shared core cache with 30-day freshness and on-demand refresh only.
No periodic polling of provider metadata. Existing drain scheduler and response
background work process queued requests; no second scheduler is added.

Runtime flag `MUSICBRAINZ_IDENTITY_ENABLED=true` controls API/worker activation;
default disabled until migrations/configuration are installed. UI stays accessible
with an honest unavailable state. No synthetic evidence is imported into production.

Risk gates (test-first): URL/SSRF boundary, invalid/oversized/moved provider result,
request failure, global rate/lease fencing, budget/retries, unauthorized source,
stale confirmation, private reader and explicit exact-version confirmation.
Use existing dialog, room accent and compact controls; verify mobile/desktop,
focus return, close/Escape and failure/retry. Live strict-theme pilot remains after
real classifications and filtering before the current candidate limit exist.

## Local implementation and verification

Implemented the Personal Discover overflow action, native dialog, verified-account
API, compact core-data adapter, private selection/review, shared jobs/rate gate,
exact-version confirmation and link removal. Confirmation also binds the exact
`fetchedAt` snapshot; a refreshed core response requires reviewing again. A newly
selected reference is clearly distinguished from an older saved link.

Reviewer findings resolved: third-attempt worker crashes no longer stay pending;
terminal results can retry on an explicit request after a one-day cooldown; core
field types cannot be coerced; claims return their expiry; malformed/near-expiry
claims never dispatch. Worker has a 40-second time budget, at most three iterations,
and reserves time for an eight-second lookup plus bounded database calls.

Tests: 192 recommendation tests, 42 SQL assertions across both Stage 2 migrations,
two actual concurrency proofs, typecheck, full lint and production build passed.
Seven browser cases cover desktop/mobile review, required confirmation, conflict,
close/focus return and existing card/queue controls. Screenshots at 390px/1440px
were inspected; no horizontal overflow. Dialog controls use the documented 0.5rem
radius. Existing approved regular-card width transitions/compact badge typography
were not changed in response to repeated design-hook reminders.

Test chronology: provider parsing and request boundary tests failed before the
adapter; route tests failed before routes; initial SQL queue/claim tests failed
before migration. Additional review, browser and failure-path cases are post-hoc
coverage. Browser testing caught a malformed fixture response being accepted and
focus returning to a collapsed card's hidden control; both paths were hardened.

Both migrations were replayed together only in isolated `task030_catalogue_replay`.
Local security/performance advisors reported no WARN/ERROR and public/private SQL
lint no errors. Synthetic concurrency fixtures were removed. No hosted data or
production runtime changed. Current sources remain uncommitted with the prior
foundation work, ready for a separately recorded release.

Two non-commercial smoke requests used the recording ID from the official
[API example](https://musicbrainz.org/doc/MusicBrainz_API/Examples), without user
account/source data or any catalogue write. They returned retry outcomes (first
request timed out; subsequent response requested retry). Successful live provider
identity retrieval is not yet established; default activation remains false.
Do not claim the Fantasy/orchestral pilot is active or use provider failure to
fabricate recording/classification evidence.
