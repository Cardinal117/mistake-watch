# Mistake Watch Roadmap

Snapshot date: 2026-08-27

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

## Completed Recommendation Intelligence

TASK-011 is implemented, deployed, and merged to `main` through `a163a4b`.
Functional production QA passed, including attached-account provider search.
The scheduled drain has run, and a 2026-08-17 read-only production query
confirmed four durable liked preference rows for one account. The final gate is
complete: commit `444b78f` is deployed as
`dpl_3Z6mYK4tyqLtowcppLK6e2tSSz8t`, and owner two-device QA measured a
four-second no-refresh Like update.

## Active Product Intake

The repository now tracks owner findings in `docs/product-intake/`.
`MW-BUG-005` is resolved and archived with its implementation and production QA
evidence. Other P1 reports remain explicitly marked for reproduction rather
than being presented as confirmed root causes.

## Listen Visualizer Workstream

- TASK-018 is complete. Private extension `0.6.2` provides explicit local tab
  capture, bounded first-party rhythm analysis, and local-only detailed visual
  frames without network or persistent audio data.
- TASK-019 is complete at its production gate. The host-authoritative bounded
  room rhythm profile reached an extension-free participant and expired safely
  when capture stopped.
- TASK-015 remains active because every animated mode is still experimental.
  Static Artwork remains the safe default and Off remains the lowest-complexity
  option.
- TASK-015C commit `7951355` introduced bounded five-lobe Siri geometry. Its
  visibility refinements are included in the released Listen composition, but
  the affected-laptop performance/timing matrix remains open.
- TASK-021 is complete, merged to `main`, and released through `a1f6b1c` as
  Vercel deployment `dpl_8Qfx6zZ8rLeiDZbT9TAGPnpt8Gwr`. The immersive shell,
  multi-shelf Discover surface, Visualizer stage, player artwork, fuller Up Next
  rail, floating queue, responsive states, and MW-QOL-012 participant entry
  point passed user and integrated regression QA.
- MW-BUG-003 now has bounded provider-startup recovery in production. The item
  remains open only until the affected participant verifies the automatic or
  manual recovery path without queue or authority changes.
- TASK-020 TV mode control parity is complete on `main`. TV mode now reuses the
  canonical active-media Like state and established display settings; signed-in
  owner persistence and two-participant continuity passed production QA.

## Uploaded Playback Reliability Blocked

MW-BUG-004 is confirmed and promoted to TASK-023. Uploaded room playback issues
one 30-minute R2 signature while the room-media session remains valid for 12
hours. TASK-023 must keep the visible media source stable and renew future or
previous byte-range authorization without page refresh, permanent object URLs,
or canonical playback mutation. Accelerated-expiry evidence rejected the stable
redirect candidate: Chromium and Opera GX reused the expired redirected object
for later Range requests instead of revisiting the stable route. No production
code changed. A Cloudflare R2 Range gateway requires separate architecture and
security approval before work can continue.

## Account Rooms Lifecycle In Progress

TASK-014 is deployed from commit `d415362`. Attached-room cross-browser QA
passed, but owner testing found that signed-in create/save could remain tied to
the browser guest identity. TASK-014B implements account-aware create, invite
join, and save behavior plus explicit Unsave, Leave, Close, and Archive
controls. Local automated, build, authority, desktop, and mobile gates pass;
commit `a0cf709` is deployed as `dpl_2kBX4Eg2iS7R6ve46RBhNfQVSjWd`, with health
and readiness passing on both public aliases. It is not owner-accepted yet.

## Planned Product Sequence

1. **Decide whether to scope the MW-BUG-004 Range gateway**
   Candidate A failed. Candidate B needs a separate Cloudflare R2 architecture,
   authorization, cost, deployment, and security review before implementation.
2. **Verify MW-BUG-003 in the affected profile**
   Exercise normal YouTube startup and the bounded recovery path on production.
   Resolve only after confirming no retry loop or room-state mutation.
3. **Complete TASK-015C evidence**
   Measure active/idle cost and shared timing for experimental Siri Ribbon.
   Keep Static Artwork as default.
4. **Plan MW-QOL-007 artwork composition**
   Define per-mode artwork enablement, clarity bounds, right-side framing, and
   browser-local persistence without weakening the safe rendering budget.
5. **Account Rooms release reconciliation**
   Verify signed-in create, invite join, save, lifecycle controls, cross-browser
   discovery, dashboard persistence, and room re-entry before resolving
   `MW-FEAT-003`, `MW-BUG-002`, and `MW-BUG-007`.
6. **Consented YouTube account signals**
   Add incremental OAuth only for approved playlist/subscription capabilities.
   Provider tokens remain server-only and revocable. Do not claim access to the
   private YouTube home recommendation feed.
7. **Add/Discover redesign**
   Turn Add Media into a fast search/import/discovery workspace using the
   recommendation foundation, clear source states, and compact mobile flows.
8. **Watch discovery overhaul**
   Evolve the Watch room media surface toward a streaming-style browse and
   recommendation experience without weakening the synchronized room focus.
9. **AI DJ / session intelligence**
   Explain session patterns and offer host-approved suggestions. AI output is
   advisory and cannot mutate the queue without an explicit action.
10. **Social graph and incremental provider features**
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
