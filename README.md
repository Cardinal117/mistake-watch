# Mistake Watch

Mistake Watch is an experimental, AI-assisted private watch/listen-together
application. Product direction, acceptance decisions, and manual QA remain
human-controlled. Documentation is proportional to risk: intake records for
small findings, compact tasks by default, and full packets for sensitive or
cross-cutting work.

Production:

- https://watch.mistakestudios.com
- https://mistake-watch.vercel.app

## What Exists

- Guest-first private rooms with optional Google account identity.
- Account-linked room history, saved-room management, and cross-device room
  projection with explicit lifecycle controls.
- Watch and immersive responsive Listen layouts with synchronized host-led
  playback, multi-shelf discovery, visualizer presentation, and bounded Up Next.
- SpacetimeDB live presence, queue, playback, chat, and permission state.
- Supabase durable rooms, accounts, media records, uploads, and authorization.
- YouTube, direct media, HLS, and first-party uploaded playback.
- Search, playlist review/import, queue ordering, play next/now, shuffle,
  history, auto-advance, and large-queue virtualization.
- Private Mistake Watch Likes, authoritative room-event capture, deterministic
  first-party ranking, and explainable Listen Room Picks.
- Owner upload catalogue with folders, multipart recovery, browser-safety
  inspection, optional CloudConvert processing, and room-scoped playback.
- Media Session metadata and media-key integration as progressive enhancement.
- An optional private Chromium audio companion that performs user-invoked local
  rhythm analysis without uploading or persisting captured audio.
- Vercel Speed Insights for production performance telemetry.

The detailed product state is in [docs/ROADMAP.md](docs/ROADMAP.md). Do not infer
that a feature is shipped merely because an older task packet discusses it.

## Current Product State

- TASK-009 private-object hardening, TASK-010 Media Hub performance, and TASK-011
  first-party recommendation intelligence are complete and released.
- TASK-018 local companion analysis and TASK-019 bounded shared-rhythm
  publication passed their production gates. The companion remains a private,
  explicitly activated enhancement rather than a required website dependency.
- TASK-021's Listen Room overhaul is released with the immersive player rail,
  Discover shelves, Visualizer stage, artwork-derived palette, fuller Up Next,
  participant entry point, and floating queue treatment.
- TASK-015 visualizer performance work remains active. Static Artwork is the
  safe default; animated modes remain optional and experimental until their
  affected-device performance evidence is complete.
- TASK-014B account-room lifecycle behavior is deployed but still requires its
  final owner acceptance pass.
- TASK-022 direct-play action parity is released. Directly loaded YouTube media
  now has canonical Like identity and pasted-link Play Next parity; signed-in
  Like and Unlike persistence passed production QA.

Use [docs/HANDOFF.md](docs/HANDOFF.md) for the verified working state and next
release order. Use [docs/ROADMAP.md](docs/ROADMAP.md) for broader sequencing.

## Product Intake

Owner findings, bugs, feature ideas, and operational work are captured in the
portable [Obsidian product-intake vault](docs/product-intake/README.md). Add
unstructured notes to [INBOX.md](docs/product-intake/INBOX.md), then ask Codex to
triage them into the [active index](docs/product-intake/INDEX.md). Agents assign
stable IDs, preserve the source report, and link work to tasks without
implementing it automatically.

## Architecture

Supabase owns durable product data: accounts, room records, memberships,
settings, uploaded-media metadata, upload sessions, processing events,
recommendation events and preferences, and server-managed authorization.

SpacetimeDB owns active room state: presence, permissions, queue mutations,
playback authority, chat, synchronized session events, room-scoped preference
state, and the authoritative recommendation-event outbox.

The optional Watch Audio Companion owns only user-invoked local tab capture and
bounded audio analysis. Captured PCM remains on-device. Shared room consumers
receive only bounded rhythm state through the existing room-authority boundary.

Cloudflare R2 stores original, processed, and poster objects. Private catalogue
responses use application-owned delivery routes and short-lived signed URLs;
permanent object URLs must not enter client contracts or room state.

CloudConvert is a costed conversion provider, not the storage authority.
Direct-ready media should bypass conversion. Completion and job startup must
remain idempotent.

## Stack

- Next.js 16, React 19, TypeScript, Tailwind CSS
- Supabase Database and Google Auth
- SpacetimeDB
- YouTube Data and IFrame APIs
- HLS.js
- Cloudflare R2 and CloudConvert
- Vercel and Speed Insights

## Local Setup

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

The app runs at `http://127.0.0.1:5371`; local SpacetimeDB runs at
`127.0.0.1:5372`. Check both:

```powershell
npm run dev:check
```

Run services separately when needed:

```powershell
npm run spacetime:start
npm run spacetime:publish
npm run dev:next
```

Required public configuration:

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SPACETIME_URI
NEXT_PUBLIC_SPACETIME_MODULE
```

Core server configuration:

```text
SUPABASE_SECRET_KEY
SPACETIME_SERVER_AUTH_TOKEN
YOUTUBE_API_KEY
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_R2_BUCKET
CLOUDFLARE_R2_ACCESS_KEY_ID
CLOUDFLARE_R2_SECRET_ACCESS_KEY
CLOUDFLARE_R2_ENDPOINT
CLOUDCONVERT_API_TOKEN
CLOUDCONVERT_WEBHOOK_SECRET
CRON_SECRET
```

CloudConvert is optional while conversion is disabled. Scripts may also use
`CLOUDCONVERT_WEBHOOK_URL`, `GOOGLE_YOUTUBE_API_KEY`,
`MEDIA_UPLOAD_MAX_BYTES`, and media-ingest owner/folder identifiers.

Never commit environment files or provider credentials. R2 public-base
configuration is not part of the private-media contract.

Google OAuth callback:

```text
https://watch.mistakestudios.com/auth/callback
```

CloudConvert webhook:

```text
https://watch.mistakestudios.com/api/media/cloudconvert/webhook
```

Generate a SpacetimeDB server identity/token when live-room seed authority
changes:

```powershell
npm run spacetime:server-token
```

The expected local and production module name is `mistake-watch-rooms`.
Generated bindings under `lib/spacetime/generated` must not be edited manually.

## Verification

Deterministic local gate:

```powershell
npm test
npm run typecheck
npm run lint
npm run build
npm run check:file-lengths
```

Browser smoke harness:

```powershell
npx playwright install chromium
npm run test:e2e
```

The browser install is a one-time machine setup after Playwright upgrades.

Google OAuth, multi-participant synchronization, provider playback, R2 range
requests, and CloudConvert webhooks still require environment-aware manual QA.
Use `/api/health` for shallow liveness and `/api/ready` for sanitized,
bounded Supabase/SpacetimeDB readiness.

Dependency advisories and remediation constraints are recorded in
[docs/DEPENDENCY_SECURITY.md](docs/DEPENDENCY_SECURITY.md).

## Database Changes

Read [supabase/README.md](supabase/README.md) and
[supabase/MIGRATION_HISTORY.md](supabase/MIGRATION_HISTORY.md) before applying
SQL. Local filenames and remote history versions are not identical. Never replay
DDL from timestamp comparison alone.

## Deployment

```powershell
npx vercel --prod
```

Deployment is not migration application. For a release containing schema work:

1. verify the exact live schema and migration history;
2. apply the approved migration;
3. rerun Supabase advisors;
4. deploy the pinned Git commit;
5. verify aliases, `/api/health`, `/api/ready`, and manual QA.

TASK-009 private-object hardening is live: the R2 custom domain is disabled and
purged, while authorized application routes issue five-minute signed delivery
redirects. Do not re-enable a public R2 domain for this bucket.

TASK-011 recommendation persistence uses the daily
`/api/recommendations/drain` cron. A registered cron route is not proof that the
latest outbox batch is durable; verify Maincloud acknowledgement and Supabase
rows when closing account-persistence QA.

## Known Constraints

- YouTube playback is subject to provider, region, embedding, age, and browser
  autoplay restrictions.
- The website cannot directly analyse cross-origin YouTube iframe audio. The
  optional private companion can provide bounded local rhythm data after an
  explicit user action; Static Artwork remains the no-companion fallback.
- Animated visualizers are experimental and may use substantially more CPU/GPU
  than Static Artwork or Off on lower-power devices.
- Browser Media Session support varies; Opera GX sidebar integration is not the
  same as Opera's built-in service integrations.
- Multipart upload resume requires reselecting the same local file.
- CloudConvert credits are a production cost boundary.
- This remains an experimental application, not a hardened commercial service.

## Engineering Entry Point

Read in order:

1. `AGENTS.md`
2. `DESIGN.md`
3. `docs/product-intake/README.md`
4. `docs/product-intake/INBOX.md`
5. `docs/product-intake/INDEX.md`
6. `docs/HANDOFF.md`
7. `docs/ROADMAP.md`
8. the active task under `docs/tasks/`

TASK-009 security/integrity, TASK-010 Media Hub performance, TASK-011
recommendation intelligence, TASK-018 companion analysis, TASK-019 shared
rhythm, and TASK-021 Listen Room overhaul are complete. Continue from
`docs/HANDOFF.md` and `docs/ROADMAP.md` rather than older recovery-packet status
summaries.
