# Mistake Watch Roadmap

Snapshot date: 2026-08-17

This is the compact product-state index. Task packets remain the detailed
requirements and evidence record.

## Live Foundations

- Guest-first rooms and optional Google identity.
- Watch and Listen room experiences.
- SpacetimeDB playback, presence, queue, permission, and chat authority.
- Large-queue performance and virtualization.
- YouTube search, metadata, playlist review/import, and provider availability.
- Uploaded-media library, R2 storage, processing, room-scoped playback, and
  owner/allowlist catalogue controls.
- Media Session metadata and room transport wiring.
- Private Mistake Watch Likes, authoritative recommendation events,
  deterministic ranking, and explainable Listen Room Picks.

## Completed Integrity Work

TASK-009 consolidates:

- object-private uploaded catalogue delivery;
- Add Media playlist-selection correctness;
- typed room startup and operational readiness;
- Supabase migration/advisor reconciliation;
- aggregate, route, and browser test foundations;
- current documentation and roadmap truth.

The Supabase migration, R2 public-access shutdown and cache purge, production
deployment, signed owner delivery, public denial, and live owner/guest QA are
complete. Merge commit `5c5ab4b` passed the full gate and is live in production.

## Completed Media Hub Performance

TASK-010 is complete, released, and user accepted:

- uploaded catalogues progressively render in bounded batches;
- private poster routes lazy-load near the Media Hub viewport;
- owner catalogue and room-session authorization remain unchanged;
- the controlled median opening improved by 64.5% and initial poster requests
  fell by 95.2% for the 250-item fixture.

## Active Release Verification

TASK-011 is implemented, deployed, and merged to `main` through `a163a4b`.
Functional production QA passed, including attached-account provider search.
The scheduled drain has run, and a 2026-08-17 read-only production query
confirmed four durable liked preference rows for one account. The final gate is
deploying and live-testing the local `MW-BUG-005` active-client reconciliation
follow-up.

## Active Product Intake

The repository now tracks owner findings in `docs/product-intake/`. The current
highest-priority confirmed behavior is `MW-BUG-005`: the tested attached room
retrieves the expected Like after refresh, but another already-open device does
not update without refresh. The scoped fix is implemented locally and awaiting
release QA. Other P1 reports remain explicitly marked for reproduction rather
than being presented as confirmed root causes.

## Planned Product Sequence

1. **Close TASK-011 active-client synchronization**
   Release `MW-BUG-005` and prove a same-account Like reaches another already-
   open client without refresh. Durable Supabase account state is confirmed.
2. **Account Rooms projection**
   Replace the placeholder account Rooms surface and reconcile guest/account
   saved-room discovery, linked from `MW-FEAT-003` and `MW-BUG-002`.
3. **Consented YouTube account signals**
   Add incremental OAuth only for approved playlist/subscription capabilities.
   Provider tokens remain server-only and revocable. Do not claim access to the
   private YouTube home recommendation feed.
4. **Add/Discover redesign**
   Turn Add Media into a fast search/import/discovery workspace using the
   recommendation foundation, clear source states, and compact mobile flows.
5. **Watch discovery overhaul**
   Evolve the Watch room media surface toward a streaming-style browse and
   recommendation experience without weakening the synchronized room focus.
6. **AI DJ / session intelligence**
   Explain session patterns and offer host-approved suggestions. AI output is
   advisory and cannot mutate the queue without an explicit action.
7. **Social graph and incremental provider features**
   Friends, invites, notifications, and provider-aware features remain separate
   permission and privacy work.

TASK-008 Spatial Cinema remains a separate unapproved draft and is not part of
this sequence until explicitly activated.

## Product Guardrails

- First-party behavior data is the primary recommendation source.
- Deterministic ranking and observable events precede AI-generated commentary.
- Google/YouTube scopes are requested incrementally for a named feature.
- Guests remain fully usable without provider-account pressure.
- Recommendations never bypass host/room permission authority.
- UI overhaul work must preserve queue performance and mobile ergonomics.
