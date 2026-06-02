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
5. Recommendations come before real waveform architecture because they rely on existing metadata and queue behavior rather than a new playback-analysis stack.
6. Real waveform architecture comes after listen/preload stability because it can affect playback, performance, and mobile behavior.
7. Avatar motion stays after core room features because it is identity polish, not room functionality.
8. R2, voting, accounts/friends, browser mode, and hardening remain later because they are larger systems with storage, auth, security, or infrastructure consequences.

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

### Supabase

Supabase remains the durable store for:

- rooms;
- guest identities;
- memberships;
- saved rooms;
- future auth/profile/friend data;
- future R2 media metadata;
- future durable chat history only if explicitly enabled.

### YouTube

YouTube integration must remain provider-safe:

- metadata and playlist APIs stay server-side;
- availability checks use official provider metadata where possible and runtime iframe errors where necessary;
- unplayable videos are represented as unavailable/blocked rather than silently failing;
- autoplay should skip blocked items only when room autoplay is enabled and the skip is caused by a classified provider failure;
- YouTube iframe remains visible and compliant;
- no hidden duplicate iframes for preloading;
- no fake dislikes or unavailable metrics;
- no claim of direct audio sampling from iframe playback.

### Cloudflare R2

R2 is the owner-uploaded media direction. It should not be mixed into earlier listen or chat tasks unless a specific subtask requires it.

## UI/UX Direction

All UI work follows `DESIGN.md`:

- dark Obsidian Lounge surfaces;
- Signal Aperture blue and gold accents;
- grounded panels instead of detached floating controls;
- compact, readable technical controls;
- responsive mobile behavior;
- reduced-motion support for ambient or decorative motion.

## Documentation Flow

After each implemented TASK-002 subtask:

- update the task status in `review-notes.md`;
- update or create `implementation-report.html`;
- report changed files, verification, manual QA, and next subtask.
