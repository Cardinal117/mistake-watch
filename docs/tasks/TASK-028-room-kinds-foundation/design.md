# Room kind contracts and architecture

Status: 028.1 through 028.6 implemented locally; see slice evidence. Integration/release review remains.
Product direction is agreed; engineering choices below require slice review.

## 1. Shared architecture

Supabase remains durable authority for room identity, ownership, memberships,
settings and policy records. SpacetimeDB remains canonical for active playback,
queue, presence and control permissions. R2 access stays independent of room kind.

Use the existing room ID and routes. Do not create five copies of the room shell,
queue or transport. Room kind is stable product metadata; Watch/Listen mode remains
mutable presentation state. In v1 there is no generic change-kind action.

One server-side kind policy must be called at every admission boundary. A client
field, room ID, stale guest cookie or possession of an invite is insufficient to
enter a Personal room. Live grants derive from validated durable policy and the
existing trusted issuer; clients cannot seed their own kind or permissions.

## 2. Behavior matrix

| Kind | Identity and access | Lifetime | Future learning/recommendations |
| --- | --- | --- | --- |
| Legacy | Existing owner/member/guest rules | Existing saved and idle lifecycle unchanged | Existing behavior unchanged |
| Personal | One authenticated owner account; its devices share membership; no invitations | Persistent across idle/leave | Owner-attributable learning; personal taste/context |
| Shared | Persistent invited/approved membership; current playback permissions still apply | Persistent | Opted-in participating accounts; independent room and individual signals |
| Themed | Owner-directed; existing invitation/permission mechanisms | Persistent | Explicit theme restricts automatic candidates, including after off-theme manual playback |
| Temporary | Session access; guest use remains supported | One-hour inactivity/rejoin grace; cleanup eligible after 24h closed | Session-only implicit signals; separately attributable explicit Likes may persist |

Proposed initial creator eligibility: authenticated active accounts for Personal,
Shared and Themed; accounts or guests for Temporary. Anonymous/guest identity is
not a Personal account, even when an auth library uses an authenticated role for
anonymous users. Reuse existing account eligibility validation. Shared creation
and joining are confirmed active-account-only in 028.4. Themed creation is
active-account-only in 028.5; invited guests retain Legacy admission rules.

## 3. Additive data model

Propose a constrained `room_kind` field on durable rooms with the five values.
Backfill existing rows to `legacy`, including closed and unsaved rows; preserve
IDs, names, saved flags, ownership, status, invitations, queues and deadlines.
Keep a compatibility default of `legacy` during staggered rollout. New recognized
kinds must be explicit server-validated inputs; unknown non-null values fail closed,
not silently become Legacy. Old payloads are interpreted as Legacy only within
the defined compatibility contract.

Personal requires a non-null eligible owner and database-enforced uniqueness on
the owner for that kind. Recommended uniqueness covers closed rooms too: one
canonical identity cannot be silently duplicated after closure. Ordinary Leave
does not close/delete it. Restore an idle/closed Personal room only through a
validated lifecycle action; never reopen an administratively blocked room.
Final DDL, indexes and closed-room reasons must be reconciled with current schema
in 028.2. Account deletion must not leave an ownerless public/guest Personal room.

Create the room, owner membership and required initial settings atomically; on
concurrent requests return the same canonical room. Avoid a client check followed
by independent insert. Personal creation must not start by issuing a transferable
guest invite and then attaching the account, as existing generic creation does.

Persistent kinds must not depend on the star/save toggle for survival. Audit both
`closeIdleUnsavedRooms` and SQL `private.close_idle_unsaved_rooms` plus their callers
and scheduled jobs. Keep Legacy predicates unchanged, exclude persistent new kinds,
and implement Temporary rules only in its reviewed lifecycle slice.

Use separate records for theme direction/version and taste consent when their
slices are approved. Do not prebuild a large speculative schema in 028.1.

## 4. Access and privacy

Check kind and account eligibility in room page/snapshot loading, creation/resume,
invite creation/acceptance, guest reclaim, account attachment, account projections,
durable mutations, media-session authorization and live grant issue/renewal.
Keep page and live admission consistent with the existing shared membership resolver.
An old guest cookie must neither bypass Personal privacy nor kick an eligible
account's second device. A stale or revoked account session must fail normally.

Document table-specific grants and RLS predicates before migration: owner-only
Personal visibility/mutation; approved-member access for collaborative kinds;
existing Legacy access unchanged; theme edits owner-only; consent owned by its
subject account. Privileged server clients still require explicit authorization.
Test direct database/API access as well as rendered routes. Profile contents and
raw private taste must not be broadcast into public room state.

Personal has no invite/share-members action. Its owner can use multiple devices;
live presence may track device sessions, but membership and taste identity remain
one account. Catalogue permission is never granted by room ownership or kind.

## 5. Learning boundary before later kinds activate

Store or derive a trusted versioned learning policy, separate from presentation
mode and theme. Events retain authoritative room/session, occurrence and actor
attribution; never trust a supplied account target. Enforce policy during event
capture, durable outbox ingestion/replay and profile aggregation. UI suppression
alone does not protect Temporary rooms.

Consent to join, control playback, contribute to the Shared blend and update an
individual taste profile are separate decisions. No implicit opt-in from an invite.
The future blend counts eligible accounts once and tolerates brief disconnects;
the grace interval remains to be measured. New joins must not reshuffle manually
chosen or already prepared playback.

Delayed/retried events must not cross policy boundaries: record enough trusted
policy provenance to reject disallowed historical training, and honor current
revocation for future use. Specify withdrawal/erasure treatment before Shared
activation. Missing attribution stays neutral. Temporary events may support
bounded operational recovery but must not enter durable taste training.

Themed can store owner description, representative items and exclusions, with an
explicit versioned direction update. These are constraints for a later engine,
not evidence of working classification. Until filtering is proven, do not serve
unconstrained recommendations as "on theme". Off-theme manual items neither edit
the direction nor become theme-training evidence without deliberate approval.

## 6. UX scope

Initially add Open personal room to the existing eligible-account entry surface,
with pending, retry and sign-in states; repeated activation is safe. Show a small
Legacy grouping in Saved Rooms without auto-saving every old unsaved room or
removing access elsewhere. New persistent rooms have kind-specific grouping when
introduced. Existing bookmark/star behavior is preserved for Legacy.

Preserve accepted Watch/Listen navigation, compact players, gestures and settings.
Kind labels must not consume another permanent toolbar. No global hub redesign
or automatic playback merely from creating/resuming a room; browser playback
restrictions still apply. Preserve room's last mode after first Personal creation.
Explicit invitation destinations take precedence over preferred-room startup.

## 7. Rollout and rollback

1. Characterize existing behavior on the latest merged code in an isolated checkout.
2. Add Legacy metadata and compatible readers; expose no new kind yet.
3. Add all Personal guards, atomic creation and lifecycle changes behind a disabled gate.
4. Pass local migration, authorization, concurrency and two-session QA before exposure.
5. Enable only the reviewed kind in an approved preview/release; later kinds stay disabled.

Do not deploy an older server that treats Personal as a generic invite room.
Rollback after Personal creation must keep privacy and cleanup protections in
place while disabling new entry/creation. Never roll back by relabelling Personal
as Legacy, dropping kind metadata or deleting users' rooms. Reconcile both
authorities if live contracts change; regenerate bindings, do not hand-edit them.

Instrument only bounded outcome/error categories and sanitized timing. No private
media URLs, invite tokens, credentials or raw taste in ordinary logs. Kind loading
must not add per-tick database work, provider calls or media remounts.

## 028.4 reviewed Shared contract

See [implementation and QA](implementation-028.4.md). Membership decisions are private and persistent, independent of live presence and bookmarks. A valid invite creates an owner-review request. Joining, playback authority, contribution and individual learning remain separate. Owner removal closes consent, removes durable membership and retires the old live member ID across devices. Reapproval waits for live acknowledgement and creates a new identity without restoring prior permissions/consent. Removal and consent-save validation share a transaction lock. Owner deletion deletes the owned Shared room. Both creation gates default off. No blended-ranking quality is implied by these admission and learning controls.

## Temporary lifecycle implementation (028.6)

Activity, expiry and cleanup serialize through durable room locks. Dashboard
cookie enumeration does not refresh grace. Expired media/admission checks deny
access before scheduled cleanup. Trusted live retirement precedes durable purge;
pending explicit preferences prevent purge until persisted. Account Likes and
catalogue files stay; room queue/chat/session data does not. Minimal private UUID
receipts support stale-grant denial and a graceful home-page explanation after
purge. A reopened or resumed tab receives that explanation; connection failures
alone do not trigger it. Scheduled deletion follows eligibility and may be delayed
by maintenance cadence or retry, as detailed in the slice report.
