# Mistake Watch SpacetimeDB Module

SpacetimeDB owns active room presence, permissions, queue mutations, playback,
chat, and low-latency room events. Supabase remains the durable authority.

The configured local and production database/module name is
`mistake-watch-rooms`. The root `spacetime.json` is authoritative.

## Local Flow

```powershell
npm run dev
```

This starts local SpacetimeDB at `127.0.0.1:5372` and Next.js at
`127.0.0.1:5371`.

For module changes:

```powershell
npm run spacetime:generate
npm run spacetime:publish
npm run dev:check
```

`spacetime:publish` targets the local server explicitly. Generated TypeScript
bindings are written to `lib/spacetime/generated` and must not be edited by
hand.

Local environment:

```text
NEXT_PUBLIC_SPACETIME_URI=ws://127.0.0.1:5372
NEXT_PUBLIC_SPACETIME_MODULE=mistake-watch-rooms
```

Production uses `https://maincloud.spacetimedb.com` with the same module name.

## YouTube automatic-next readiness

TASK-026 adds prepare_youtube_autoplay and start_prepared_youtube. The server
checks current source/item/occurrence/revision and playback authority; preparation
selects the next YouTube item paused at zero, then readiness starts the clock.
Existing reducers and tables remain compatible. See [sync contract](../docs/sync-model.md).

Before a coordinated release, run the focused reducer tests and
`node scripts/verify-youtube-autoplay.mjs` from the repository root with an
isolated local Spacetime service on 127.0.0.1:5392. The script creates disposable
QA databases on that local service only, checks independent host/guest/rejoin
clients, and can accept a prior generated-bindings directory as its argument to
verify old-client compatibility. It does not target production.

Publish the additive backend before the new client. Always prohibit data deletion
for a code-only update (`--delete-data=never`). Preserve the exact deployed module
artifact before an emergency rollback; restore the previous frontend first.
