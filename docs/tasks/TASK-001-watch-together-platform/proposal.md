# Proposal: Mistake Watch

## Problem

People want a simple way to watch videos, browse together, and listen to music in sync, but each capability has different technical constraints. Direct media playback can be synchronized through room state. Arbitrary web browsing requires a remote browser stream. Music queueing needs durable room state, permission rules, and a low-friction queue UI.

## Goal

Build Mistake Watch, a polished room-based website at `watch.mistakestudios.com` that supports a dashboard-first entry experience, guest-friendly synchronized direct media playback, host-led music listening with queue management, and a phase-two shared remote browser experience where control can be granted to exactly one user at a time.

## User Value

- Hosts can start a room quickly and guide the experience.
- Friends can join as guests without complex setup and stay synchronized automatically.
- Account users can eventually see and join friends' open rooms from the dashboard.
- Groups can switch between watching, browsing, and music without learning separate tools.
- Queue management keeps group listening and watching collaborative without making control chaotic.

## Recommended Tech Stack

- Frontend: Next.js with React and TypeScript for app routing, polished UI, and future server-rendered public pages if needed.
- Styling: Tailwind CSS plus a small design-token layer for consistent spacing, color, typography, and responsive behavior.
- UI primitives: Radix UI or shadcn-style primitives for accessible dialogs, menus, tooltips, tabs, sliders, and popovers.
- Icons: lucide-react.
- Database/Auth: Supabase Postgres and Supabase Auth.
- Media object storage: Cloudflare R2 for owner-uploaded raw media files and HLS assets, with Supabase storing metadata and access records.
- Live room engine: SpacetimeDB for room-authoritative playback state, queue reducers, presence, control handoff, and subscriptions.
- Media playback: HTML5 video/audio, hls.js for HLS streams, YouTube iframe/player integration after direct media, and a dedicated player abstraction around drift correction.
- Playback devices: Google Cast as a later integration after browser playback is stable.
- Remote browser: Playwright or Chromium workers running isolated sessions, streamed to clients through WebRTC or a low-latency media transport.
- Background/session orchestration: Node.js worker service for browser lifecycle, room cleanup, and resource limits.
- Deployment: Vercel for the Next.js frontend if desired, plus SpacetimeDB hosting for live room state and a separate container host for remote browser workers. Browser workers should run on infrastructure that supports long-lived processes and Chromium.
- Observability: Sentry for frontend/backend errors and structured logs/metrics for sync drift, reconnects, room counts, and browser worker resource usage.

## Scope

- Define the product architecture and implementation phases.
- Build the initial app foundation after this spec is approved.
- Support room creation, joining, presence, roles, and host authority.
- Use a polished dashboard as the first screen, based on the Home Page reference.
- Support joining friends' open rooms from the dashboard once accounts and friending exist.
- Support direct invite-link room joining for guest-first use.
- Support guest-first joining for the early friends-and-family release.
- Support direct media URL playback with synchronized play, pause, seek, and playback position correction.
- Support Cloudflare R2 as the selected future storage backend for uploaded personal media and generated HLS assets.
- Support music mode with host playback and queue management.
- Support YouTube and YouTube Music playlist import into the room queue through an explicit preview/import flow.
- Support advanced queue behavior modes such as Normal, Shuffle, Smart Shuffle, Loop Queue, and a placeholder-ready Autoplay Related mode once the core queue is stable.
- Prototype shared browser mode in phase two with one active controller.
- Add host-managed per-user permissions for queue, playback, and future browser-control capabilities.
- Include polished responsive UI and accessibility requirements.

## Non-Goals

- Do not promise playback of DRM-protected content.
- Do not bypass third-party platform restrictions, paywalls, or terms of service.
- Do not support simultaneous browser controllers.
- Do not make shared browser mode part of the first MVP.
- Do not build native mobile apps in the first phase.
- Do not build a full social network, public discovery, or recommendation engine in the first phase.
- Do not require friends' room discovery before the guest-first room and invite flow works.
- Do not integrate every music/video provider before the core synchronization model is proven.
- Do not integrate Spotify unless the product direction is explicitly reopened later.
- Do not build voting or approval mode before the core queue is stable.
- Do not fake algorithmic recommendations; Autoplay Related must remain a clearly labeled placeholder until a real provider-backed recommendation path exists.

## Risks

- "Perfect sync" is technically bounded by network latency, browser timers, media buffering, and device behavior.
- Remote browser streaming can be costly and resource-intensive.
- Arbitrary websites may block automation, detect remote browsers, block media, or require login flows.
- Autoplay restrictions can prevent playback until users interact with the page.
- Provider terms may prohibit rebroadcasting, automation, or shared account usage.
- Queue and control permissions can become confusing if not modeled clearly.
- Uploaded media storage needs signed upload/download strategy, size limits, content cleanup, and private-room access control so friends-and-family usage does not become an unbounded public file host.
- Supabase Realtime alone may not be ideal for low-latency playback control; SpacetimeDB should own live room sessions while Supabase remains the durable source of truth.
- SpacetimeDB is a stronger fit for low-latency shared state, but it adds a specialized backend boundary that needs explicit schema, reducer, deployment, and data-sync planning.
- Guest-first access needs careful room tokens and host controls so private rooms remain private enough for early use.

## Success Criteria

- The product has a clear MVP path that avoids the highest-risk browser streaming work until core sync is solid.
- Supabase-backed data models are defined for users, rooms, membership, queues, and session metadata.
- Playback sync has measurable targets and correction rules.
- The UI plan prioritizes the active media experience and keeps controls understandable.
- Remote browser work is isolated behind a prototype phase with resource and security requirements.
- The MVP supports guest joining, direct media/HLS sources, and host-owned queue control.
- The product direction includes a dashboard-first first screen at `watch.mistakestudios.com`, with friends' open rooms as an account/friending feature.
