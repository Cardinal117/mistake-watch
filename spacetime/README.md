# Mistake Watch SpacetimeDB Module

This folder contains the Task 11 live-room engine skeleton.

SpacetimeDB owns active room state only:

- presence and connection lifecycle
- room snapshots
- host/controller locks
- active playback timeline shell
- active queue snapshot shell
- room-level error payloads

Supabase remains the durable source of truth for rooms, guest identities,
memberships, settings, permissions, queue records, and playback history.

## Current Status

The local SpacetimeDB CLI is installed for this workspace and the local
database name is `mistake-watch-08qfy`.

## Expected Local Flow

For normal local development, use the root dev command:

```bash
npm run dev
```

That command starts SpacetimeDB on `127.0.0.1:5372` when it is not already
running, then starts the Next.js app on `127.0.0.1:5371`.

For SpacetimeDB module changes:

```bash
npm run spacetime:generate
npm run spacetime:publish
```

The root `spacetime.json` sets the database to `mistake-watch-rooms`, points the
CLI at this module folder, and writes generated TypeScript bindings to
`lib/spacetime/generated`.

The local publish script targets `http://127.0.0.1:5372` explicitly so local
development cannot accidentally publish to Maincloud through the global default
server.

The generated bindings should not be manually edited. The frontend adapter in
`lib/spacetime/` is intentionally written against a small interface so generated
bindings can be plugged in without changing room UI code.

## Local URL

The app expects:

```bash
NEXT_PUBLIC_SPACETIME_URI=ws://127.0.0.1:5372
NEXT_PUBLIC_SPACETIME_MODULE=mistake-watch-rooms
```

Use the same port when starting the local SpacetimeDB server. Port `3000` is
avoided because this workspace already uses that range for other local apps.
