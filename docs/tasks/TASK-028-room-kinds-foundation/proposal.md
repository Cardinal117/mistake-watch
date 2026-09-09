# TASK-028: Room kinds foundation

Date: 2026-09-08

Status: 028.1-028.6 and the 028.7 R3 persistent-room retirement correction are implemented and verified locally; hosted acceptance and release remain pending.

Scope: full packet, because identity, privacy, persistence and learning cross multiple authorities.

Start with [the implementation sequence](tasks.md). Read [design](design.md),
[acceptance criteria](acceptance-criteria.md), [owner intent](brain-dump.md) and
[review notes](review-notes.md) before implementing a slice.

## Goal

Give rooms a durable purpose without duplicating the working Watch/Listen
playback system. Establish five kinds: Personal, Shared, Themed, Temporary and
transitional Legacy. Saved Rooms is a navigation grouping, not a sixth kind.

The [recommendation direction](../../recommendation-engine-direction.md) remains
the source for future ranking, learning and Autoplay decisions. This packet
establishes the contracts those features will consume. Research-informed choices
still need evaluation; neither a kind label nor a stored theme is a working engine.

## Delivery boundaries

The first milestone is **Legacy compatibility followed by secure Personal
create/resume**. It includes minimal entry controls on existing surfaces, not a
new home hub. A returning account should reach its Personal room without creating
another room, while existing rooms continue to work normally.

Later slices establish learning-policy enforcement, Shared membership and taste
consent, Themed direction, and Temporary lifecycle. Each slice has its own review
gate. Do not expose unfinished kinds merely because the database can store them.

Four intended creation choices eventually exist. Personal is an Open/Resume
action once created. Legacy is never an intentional new-room choice; old clients
may create Legacy rooms during the documented compatibility window.

## Non-goals

- New ranking algorithms, provider quota increases, Google account scopes or playlist imports.
- Continuous queue refill, theme classification, taste-match percentages or recommendation-quality claims.
- Desktop redesign, replacing accepted mobile interactions, or a second playback backend.
- Automatic conversion/deletion of Legacy rooms, a retirement deadline, or bulk migration of taste history.
- New public room discovery, friend network, account provider or catalogue permissions.
- Production migration, Git operations or deployment during specification work.

## Principal risks

| Risk | Required mitigation |
| --- | --- |
| Personal room admitted through an old guest/invite route | One enforced kind-aware access policy across durable and live admission paths |
| Duplicate Personal rooms from two devices | Database-enforced owner uniqueness and atomic idempotent creation |
| Persistent rooms closed by existing idle jobs | Audit both application and database cleanup before exposing the kind |
| Temporary or Shared activity contaminates private taste | Server-side attribution, consent and replay-safe policy enforcement before activation |
| Older application rollback ignores Personal privacy | Maintain compatible denial guards; never roll back to an unsafe reader |
| Metadata change restarts playback | Preserve the existing media instance and live playback authority |

## Definition of success

First-milestone acceptance is safe migration of existing room metadata plus one
private, resumable Personal room per eligible account. Existing playback, saved
room access and multi-device identity remain intact. Later kinds must pass their
own behavioral and privacy gates before becoming selectable. Approval of this
plan does not declare recommendation quality, live migrations or later tasks complete.
