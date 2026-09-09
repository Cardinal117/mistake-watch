# Acceptance and verification plan

> **2026-09-09 audit corrections:** All five findings in the [task-by-task audit](audit-2026-09-09.md) are fixed and verified locally. See [corrections and final evidence](fixes-2026-09-09.md): 674 Node tests, 191 SQL assertions and four combined browser tests passed. Earlier results below describe their respective checkpoints; release/hosted acceptance remains outstanding.

Status: 028.1-028.6 local slice evidence is recorded in their implementation reports.
[028.7 integration review](implementation-028.7.md) adds cross-participant playback
and release checks, but **holds release for R3**: durable room closure does not
retire already-admitted live sessions. Temporary X1-X4 local tests pass; physical,
hosted/provider and future recommendation-quality acceptance remain outstanding.

## Testing approach

Documentation-only work is exempt from application tests. Implementation is
**characterization-first** for Legacy preservation and **test-first** for new
authorization, uniqueness, lifecycle and learning rules. Record real failing and
passing results; never invent a red-test chronology after implementation.

First meaningful Legacy coverage: a populated saved account room and unsaved
guest room retain membership, invitation access and existing cleanup behavior
after metadata migration. First new-behavior failure: simultaneous Personal
create/resume calls must return one room and owner membership, while a different
account using its room ID/invite/guest cookie is denied at durable and live entry.

## Required observable outcomes

| ID | Slice | Pass condition |
| --- | --- | --- |
| L1 | 028.1 | Every pre-existing row is Legacy; no IDs, queue contents, owner, saved state, permissions, invitations or deadlines changed |
| L2 | 028.1 | Saved Legacy remains reachable in its grouping; unsaved rooms are not silently saved; existing closed rooms stay closed |
| L3 | 028.1 | Old creation payloads remain compatible in the transition; unknown/disabled kinds cannot bypass server validation |
| L4 | 028.1 | Existing schema readers and rollback-compatible readers handle additive metadata without session resets |
| P1 | 028.2 | Two concurrent eligible same-account calls return one canonical Personal room with a complete membership/settings state |
| P2 | 028.2 | Other account, guest, stale guest cookie and forged invite cannot view/join/control Personal through pages, APIs, grants or direct exposed tables |
| P3 | 028.2 | Owner's devices remain admitted across heartbeat, sign-in and reconnect; one account membership, no duplicate-room creation |
| P4 | 028.2 | Leave, idle cleanup and star changes do not delete/expire Personal; blocked/deleted accounts cannot reopen it |
| P5 | 028.2 | First creation defaults Listen; resume preserves selected mode; mode/kind metadata does not restart media or reset local volume |
| P6 | 028.2 | Failed creation leaves no half-created room; repeat/retry safely recovers the same identity |
| E1 | 028.3 | Missing attribution, buffering, reconnects, duplicate removal and another user's skip do not become a personal dislike |
| E2 | 028.3 | Delayed/replayed events respect trusted policy/consent; devices do not multiply account weight |
| S1 | 028.4 | Approved members can leave/return; removal denies renewed access; presence is distinct from durable membership |
| S2 | 028.4 | Membership/playback authority is separate from taste consent; no private profile exposed in room broadcasts |
| T1 | 028.5 | Off-theme manual play does not edit direction or silently retrain theme; only owner can explicitly update direction |
| T2 | 028.5 | No unrestricted recommendations presented as theme-safe; insufficient classification evidence is handled honestly |
| X1 | 028.6 | Temporary implicit activity never updates durable personal/room taste, including outbox retry/replay |
| X2 | 028.6 | Explicit Likes require attributable account intent; expiry/cleanup matches the reviewed retention policy and is idempotent |
| X3 | 028.6 | Expired active tabs, reopened links and purged-room links return home with a visible dismissible explanation; network failures do not falsely report expiry |
| X4 | 028.6 | Pending Like/unlike ingestion blocks purge; account Likes/catalogue assets survive; late activity cannot resurrect the room |
| R1 | All | Catalogue rights remain separate from ownership/kind; Listen automatic candidates exclude uploads, manual access unchanged |
| R2 | All | Queue mutations and transport retain one live authority; room metadata updates do not remount the player |
| R3 | Release correction required | Persistent room closure/deletion retires every admitted live session, rejects stale rejoin grants, retries retirement failures and returns clients home with an appropriate explanation; open-room and Temporary behavior preserved |

## Evidence layers

1. Unit/contract tests: policy matrix, kind parsing, lifecycle decisions, attribution.
2. Local database integration: populated migration, constraints, atomic concurrent
   creation, grants/RLS using account A, account B and guest sessions. Mocked tests
   alone cannot establish database concurrency or access enforcement.
3. Live-authority integration: signed admission/rejoin and revocation, same-account
   devices versus different accounts, no duplicate playback authority.
4. Browser interaction QA on actual room routes, not only design previews:
   create/resume, Legacy grouping, denied entry, loading/retry, Watch/Listen switching,
   queue and playback. Desktop plus narrow mobile and landscape; keyboard/focus,
   touch targets, no clipping or inaccessible error feedback.
5. Approved deployed/device QA: two participants, distinct identities plus duplicate
   account devices, refresh/rejoin and direct/YouTube media. Explicitly label anything
   not physically tested. Provider failure must not count as failed recommendation taste.

No provider calls or new per-heartbeat database reads are required just to display
a kind. Compare admission and resume timing against the same local baseline;
investigate added round trips instead of inventing latency guarantees.

Before release, run documented project commands and required database/Spacetime
checks for changed systems. Show known blockers and safe rollback state. A passing
room foundation does not certify future recommendation quality or Autoplay.

## R3 persistent-room retirement verification (2026-09-09)

Local pass: Account Close stops authority for connected sessions; owner deletion
is captured transactionally and detected by existing healthy activity checks;
closed/deleted links return home with an explanation. Stale grants cannot recreate
retired sessions. Failed retire/purge work remains retryable, deletion supersedes
closure safely, and pending explicit Likes prevent purge. Legacy save/idle policy
and the existing Personal erroneous idle-timeout recovery exception are preserved.
See [R3 evidence and limitations](implementation-028.7-R3.md). Hosted acceptance
and rollout are still pending; local tests are not production certification.
