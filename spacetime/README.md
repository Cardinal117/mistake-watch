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
