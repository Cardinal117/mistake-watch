# TASK-029 approved Discover implementation design

2026-09-09. Owner approved the image reference and functionality, with one required
override: **retain the existing song-driven accented/gradient background**.
The darker neutral image canvas is not authority to remove that behavior.

## Scope and composition

Personal Listen Discover adopts the reference: compact four-column wrapping
regulars grid on wide screens, flat recommendation rows and subordinate Rediscover
column; small screens use a compact wrapping grid and a single vertical content
flow. No horizontal carousel or inner section scrollers. View all expands a
collection with Back and focus restoration. Keep desktop player rail, provider
viewport, compact mobile playback and manual queue authority.

Desktop Discover/Visualizer becomes a left-aligned underline tab bar with correct
tab semantics and keyboard navigation. Existing mobile toolbar already follows
this language; preserve it. Non-Personal rooms keep their existing data/learning
behavior; shared stage tabs can receive the approved visual treatment.

Use existing --listen-primary and artwork-theme variables, translucent surfaces,
tokens and typography. Do not remount playback to update Discover or gradients.
Buttons remain visible and reachable by touch/keyboard; long names wrap/truncate
with full accessible names. Grid/list UI uses loading, empty, failure and retry states.

## Regulars and counts

Create a separate Personal Discover projection. Do not change existing taste
aggregation to invent full listening signals. Authenticate the current participant,
then revalidate active Personal room ownership inside the database function.
Read explicit account YouTube Likes and retained trusted playback-completed
occurrences from the Personal room, deduplicating occurrences within the rolling
180-day window. Completion events are not proof of uninterrupted listening:
seeking can qualify and repeated playback may count. Display "recorded plays"
with the window/definition accessible; never claim lifetime totals. Zero/absent
history remains honest. Repeats do not become explicit Likes.

Hydrate a bounded set of YouTube IDs through existing metadata access/cache.
Do not import external account data, persist private URLs, or assume live queue
metadata is mirrored to durable queue_items. In-memory UI can merge current queue
metadata. Unavailable metadata yields an honest fallback, never invented track names.
Rediscover uses recorded history older than seven days as the initial explicit
policy, not an agreed quality threshold. All automatic Personal items exclude
uploaded catalogue assets. Likes stay independent of recommendation suppression.

## Feedback and observable actions

Private account+media feedback states: neutral, not_now (7 days), do_not_suggest
(until undone), wrong_version (that YouTube video until undone). State changes
are server-authorized, revision-checked and durable across devices. Undo is a new
neutral transition with matching expected revision; stale undo cannot overwrite
a newer choice. No automatic replacement for wrong-version feedback; no artist
or entire recording block inferred from one upload.

Filter feedback from Personal automatic results. Unavailable Personal ranking
must not fall back to raw provider candidates because durable exclusions may be
unavailable. Manual
queue playback/search and Likes are not prohibited by a recommendation block.
Explicit dismissals have Undo and a reachable correction/history path. Never
turn lack of selection into dislike; queue removal does not imply permanent block.

Bounded private interaction ledger records visible impressions, add/play requests,
client-observed queue presence, and feedback. All presentation telemetry is
untrusted diagnostic evidence and cannot train aggregates or prove a canonical
queue write. IDs/accounts come from verified session, not body identity fields.
Shown requires viewport intersection and visible Discover/document. Coalesce
duplicate impressions per mounted discovery session; use idempotent action IDs.
Retain a bounded window and support account deletion. No request per heartbeat.

Queue additions use existing handlers. A click displays Adding; only canonical
queue projection yields Added/In queue. Timeout/failure permits retry without false
success. Existing queued identities cannot be added twice by rapid clicks. Keep
successful items visible long enough to understand their status; ranking changes
must not silently refill or mutate the queue. Autoplay remains out of scope.

## Boundaries and release

Supabase stores durable private feedback/projection inputs. SpacetimeDB remains
queue/playback authority. Migration and API use service-only access, RLS and grants
with client denial tests. Local schema-only clone tests preserve active local data.
No production migration, production accounts/permissions changes or deployment. New database
functionality needs the reviewed migration at eventual release; missing schema
must fail honestly, not silently fall back to fake counts or local-only blocks.
