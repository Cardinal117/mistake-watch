# TASK-002 Design: Recovery Roadmap

## Approach

TASK-002 is structured as a dependency-aware recovery queue. Earlier subtasks stabilize current visible product surfaces before later subtasks introduce larger systems.

Implementation rules:

- Work one TASK-002 subtask at a time.
- Do not implement later subtasks while completing an earlier one.
- Preserve SpacetimeDB as the live room authority.
- Preserve Supabase as durable product storage.
- Preserve YouTube compliance and do not hide or fake provider behavior.
- Update `implementation-report.html` after each implemented subtask.

## Dependency Order

1. Listen quality comes first because it affects the current active product surface and user-visible polish.
2. Chat comes before recommendations because it is a clear missing room feature and is smaller than provider discovery.
3. Preload comes before recommendations because queue transitions should be stable before adding more ways to queue media.
4. YouTube availability hardening comes before recommendations because discovery and playlists should not promote media that cannot play in an embedded room.
5. Recommendations come before adaptive card drift because the drift should animate real room-pick/recommendation cards, not placeholder ambience.
6. Adaptive card drift comes before live authority hardening because it closes the current listen-room motion follow-up.
7. Live room authority hardening comes before additional watch-room, voting, media-library, or social work because queue, playback, permissions, and host authority must not depend on browser-provided role fields.
8. Queue authority and Add Media UX stabilization comes before cinematic watch-room work because the watch queue/library drawer should not inherit known permission mismatches, silent duplicate behavior, or broken previous/back history.
9. Cinematic watch-room work comes before waveform and media-library work because the upload/library surfaces need a watch layout that already has a clear purpose, drawer model, and media-first hierarchy.
10. Real waveform architecture comes after listen/watch room surface stabilization because it can affect playback, performance, and mobile behavior. It prepares a resolver for YouTube fallback visuals, direct/HLS analysis, Cloudflare Stream media, and future R2 precomputed peaks, but it does not implement media ingestion.
11. Avatar motion stays after core room features because it is identity polish, not room functionality.
12. Google OAuth and owner authority must precede Cloudflare Stream/R2 media-library work because owner-only upload and source ingestion need a server-verifiable account role before implementation.
13. Cloudflare Stream/R2 media library work, voting, full friends/social features, achievements, AI DJ, browser mode, and broad hardening remain later because they are larger systems with storage, auth, security, provider, or infrastructure consequences.

## Shared Systems

### SpacetimeDB

SpacetimeDB remains the source of truth for:

- live room session state;
- playback state;
- queue state;
- permissions;
- presence;
- chat once TASK-002.2 is implemented;
- future voting and browser control state where appropriate.

### Live Authority Hardening

Live room authority must be derived from durable, server-verified membership rather than arbitrary browser payloads.

Implementation direction:

- replace client-authoritative room session seeding with a trusted authority path;
- preserve guest-first joins while preventing guest-provided role/member fields from establishing host authority;
- align UI permission affordances with reducer-enforced permissions;
- protect playlist imports and high-volume queue actions from duplicate or abusive mutation patterns;
- keep SpacetimeDB as the low-latency live authority, but have Supabase/server-side membership checks provide the trusted identity foundation.

### Queue Authority And Add Media UX

Queue interaction must become explicit enough that a member's granted permissions match both the visible controls and the reducers that enforce room authority.

Implementation direction:

- add explicit queue-management authority instead of treating queue add permission or host role as the only queue operation boundary;
- keep playback authority separate from queue-management authority so playback-granted members can control transport without automatically receiving reorder/remove powers;
- expose enough live permission state for the UI to distinguish add-queue, manage-queue, playback-control, and host/authority-management capabilities;
- make queue reducers emit readable denial, duplicate, and success signals that the client can surface through notifications;
- add server-authoritative playback history so previous/back follows actual played order.

Add Media should become a centered, high-priority modal rather than a small popout trapped near the queue drawer.

Implementation direction:

- render above drawers, panels, and room surfaces using the existing dark Obsidian Lounge layering language;
- auto-preview pasted single-song and playlist URLs before mutation;
- warn on duplicates and allow an explicit add-anyway path;
- store duplicate `Remember my choice` locally until account-backed preferences exist;
- include playlist search, sorting, select all, add all, add selected, and duration filtering in the review flow;
- show visible feedback for song add, playlist import counts, duplicate decisions, permission denial, and provider/preview failures.

### Supabase

Supabase remains the durable store for:

- rooms;
- guest identities;
- memberships;
- saved rooms;
- future auth/profile/friend data;
- future owner-role/account authority data;
- future Cloudflare Stream/R2 media metadata, ingestion/upload jobs, and source matches;
- future durable chat history only if explicitly enabled.

### YouTube

YouTube integration must remain provider-safe:

- metadata and playlist APIs stay server-side;
- YouTube video IDs can be used as source-match keys for existing first-party Stream/R2 assets, but they do not grant automatic download permission;
- if an owner-authorized first-party asset already exists for a YouTube source, playback may prefer that asset;
- when no ready first-party asset exists, YouTube iframe playback remains the fallback;
- availability checks use official provider metadata where possible and runtime iframe errors where necessary;
- unplayable videos are represented as unavailable/blocked rather than silently failing;
- autoplay should skip blocked items only when room autoplay is enabled and the skip is caused by a classified provider failure;
- YouTube iframe remains visible and compliant;
- no hidden duplicate iframes for preloading;
- no fake dislikes or unavailable metrics;
- no claim of direct audio sampling from iframe playback.

### Cinematic Watch Room

Watch mode should become the focused private-theater counterpart to listen mode.

Implementation direction:

- keep the active video as the main character;
- use a quiet top Signal Room band for room identity, connection state, compact controls, and members access;
- use a grounded minimal transport bar instead of a detached control cluster;
- move members and queue/library management into drawer-style surfaces so they are available without competing with the video;
- reserve analytics, discovery, and recommendation-heavy behavior for listen mode or later explicit watch-library tasks;
- make the surrounding room react to the content through slow cinematic ambient glow, not flickering RGB-style lighting.

Ambient palette rules:

- direct/HLS/first-party Stream media can use sampled or precomputed palette data where browser/provider access permits;
- YouTube must use thumbnail or provider-metadata palette fallback because iframe frames cannot be sampled directly;
- transitions should be slow, restrained, and reduced-motion aware.

### Cloudflare Stream And R2

Cloudflare Stream is the chosen fast video processing and playback path for uploaded watch-room video. R2 remains the owner-controlled object storage direction for raw/source archive, supporting artifacts, waveform/analysis JSON, and future non-Stream media needs.

This hybrid direction should not be mixed into earlier listen, chat, preload, recommendation, or watch-room personality tasks unless a specific subtask requires it.

TASK-002.6 may prepare waveform abstractions for future first-party media peak files, but actual upload, storage, processing, and playback preference belong to TASK-002.8.

TASK-002.8 should treat Cloudflare Stream as the primary store/playback service for:

- owner-uploaded watch videos;
- processed playback renditions;
- Stream-generated thumbnails/previews where available;
- stable first-party playback identifiers.

TASK-002.8 should treat R2 as object storage for:

- raw original archive where needed;
- non-Stream supporting artifacts;
- authorized source files that should not live in Supabase;
- waveform peak JSON.

Supabase should remain the durable metadata and authorization layer through tables such as `media_assets`, `media_ingestion_jobs`, and `media_source_matches`.

Upload and source ingestion are owner-only:

- production must verify the owner role server-side;
- non-owner users can add YouTube links and playlists, but cannot upload first-party media or trigger first-party source ingestion;
- a dev/test bypass can exist only as an explicit environment-gated local testing path and must never be enabled by default in public production.

Cloudflare Stream direct upload or an equivalent server-authorized upload flow should support drag-and-drop from the expanded watch queue/library drawer. Custom workers/jobs should be used only for gaps that Stream does not cover, such as R2 archive handling, waveform peaks, or owner-authorized external source ingestion. Any custom worker should run outside Vercel if it needs longer-running media jobs.

Movie/direct-media ingestion means owner-uploaded files or authorized direct media URLs. Do not include hidden-stream scraping, DRM bypass, ad circumvention, anti-bot circumvention, or piracy-site automation.

### Google OAuth And Owner Authority

The Google OAuth and owner-role foundation belongs in TASK-002.8A, before Cloudflare Stream/R2 media-library work. Full friends, invites, notifications, and listening-history product work remains in TASK-002.10.

Implementation direction:

- add Supabase Auth with Google OAuth as the account foundation;
- store app profile and role data in public profile tables, not directly in `auth.users`;
- start with basic profile scopes;
- request YouTube playlist/history scopes only when those features are implemented and user consent is clear;
- use offline access only when refresh-token behavior is actually required;
- enforce Stream/R2 upload and source-ingestion authority through a server-verified owner role, not through client-side UI state;
- keep guest-first room participation working while account-backed identity becomes available for ownership, saved rooms, media authority, and later social features.

## UI/UX Direction

All UI work follows `DESIGN.md`:

- dark Obsidian Lounge surfaces;
- Signal Aperture blue and gold accents;
- grounded panels instead of detached floating controls;
- compact, readable technical controls;
- responsive mobile behavior;
- reduced-motion support for ambient or decorative motion.

### Adaptive Listen Card Drift

The adaptive drift task is a listen-room UI enhancement, not a queue or recommendation data change.

Implementation direction:

- measure rail width, viewport width, card count, and available overflow before enabling drift;
- only loop when there is enough content to avoid visible blank gaps;
- use a slow, linear or near-linear motion that feels like ambient room movement rather than a marquee;
- pause on hover, focus, keyboard interaction, drag/touch interaction, and modal/drawer overlays;
- disable continuous movement for reduced-motion users;
- preserve card click, play, focus, and permission states.

### Cinematic Watch Room Purpose

The watch-room pass is a layout and interaction foundation task, not a storage/upload implementation task.

Implementation direction:

- top band: Signal Room identity, room name/code, connection state, compact room controls, members drawer trigger;
- center: dominant video stage with dark cinematic depth and slowly shifting ambient side glow;
- bottom: minimal transport bar with current time, progress, play/pause, sync state, volume, fullscreen, and compact next-item context;
- drawer: Up Next remains compact by default and can later expand into the watch media library/upload surface;
- members: presence should read as people gathered around the screening, not as a dashboard occupying permanent screen real estate;
- chat remains watch-room-only but should not dominate the default cinematic layout.

### AI DJ / Session Intelligence

The AI DJ task is intentionally later than accounts/friends. It should begin with room-session intelligence and only add personal memory after profile and consent boundaries exist.

Implementation direction:

- analyze real session inputs such as playback history, queue shape, duration, contributors, provider metadata, and room energy signals;
- label unavailable or low-confidence analysis clearly;
- keep suggestions advisory unless an authorized user acts;
- do not mutate the queue automatically;
- never present invented mood, energy, or personalization as verified fact.

### Easter Eggs And Achievements

The easter egg task belongs immediately after accounts because durable achievements need stable user identity.

Implementation direction:

- separate the trigger detector, effect renderer, sound playback, and achievement persistence so each part can be tested and replaced;
- keep easter egg effects local by default and never mutate shared room playback state;
- store achievements with stable IDs and idempotent unlock behavior;
- allow guest/local fallback effects before login, but reserve durable profile achievements for signed-in users;
- avoid firing hidden triggers from ordinary form fields unless that field is explicitly registered;
- support reduced-motion and reduced-audio alternatives;
- keep visual/audio assets replaceable so the project can later switch from inspired/private-use assets to original assets without rewriting the achievement system.

## Documentation Flow

After each implemented TASK-002 subtask:

- update the task status in `review-notes.md`;
- update or create `implementation-report.html`;
- report changed files, verification, manual QA, and next subtask.
