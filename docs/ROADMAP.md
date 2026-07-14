# Mistake Watch Roadmap

Snapshot date: 2026-07-14

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

## Immediate Engineering Follow-up

Before product expansion, run one bounded Watch Media Hub performance task:

- virtualize or progressively render large uploaded catalogues;
- lazy-load private poster routes near the viewport;
- preserve owner-only catalogue authorization and room-session playback;
- measure signature/request count, open-drawer latency, and mobile behavior.

## Planned Product Sequence

1. **First-party recommendation intelligence**
   Build deterministic recommendation events, explainable scoring, diversity,
   repetition control, and room/session seeds before adding AI presentation.
2. **Consented YouTube account signals**
   Add incremental OAuth only for approved playlist/subscription capabilities.
   Provider tokens remain server-only and revocable. Do not claim access to the
   private YouTube home recommendation feed.
3. **Add/Discover redesign**
   Turn Add Media into a fast search/import/discovery workspace using the
   recommendation foundation, clear source states, and compact mobile flows.
4. **Watch discovery overhaul**
   Evolve the Watch room media surface toward a streaming-style browse and
   recommendation experience without weakening the synchronized room focus.
5. **AI DJ / session intelligence**
   Explain session patterns and offer host-approved suggestions. AI output is
   advisory and cannot mutate the queue without an explicit action.
6. **Social graph and incremental provider features**
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
