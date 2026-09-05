# Mistake Watch Commands

This file documents the operational commands another agent should use before relying on chat context.

## Local Development

Install dependencies:

```bash
npm install
```

Start the app and local SpacetimeDB together:

```bash
npm run dev
```

The app runs at:

```text
http://127.0.0.1:5371
```

The local SpacetimeDB service runs at:

```text
127.0.0.1:5372
```

If the combined development command is not appropriate, run each service separately:

```bash
npm run spacetime:start
npm run dev:next
```

Check local development readiness:

```bash
npm run dev:check
```

Use `npm run dev:check` in a second terminal after startup. It verifies:

- `.env.local` exists;
- required public and server-only environment variable names exist;
- known secret values are not exposed through forbidden `NEXT_PUBLIC_` names;
- the Next.js app port is reachable;
- the SpacetimeDB port is reachable;
- `NEXT_PUBLIC_SPACETIME_MODULE` matches the database in `spacetime.json`;
- the app URL and `/api/health` respond.

The command never prints secret values. A non-zero exit code means local browser QA is not ready.

If port `5371` is already in use, close the existing Next.js process or start with a deliberate alternate port:

```bash
$env:MISTAKE_WATCH_PORT="5373"; npm run dev
```

If port `5372` is already in use, confirm whether it is the intended local SpacetimeDB process before testing sync.

If listen/watch rooms show reducer argument errors such as `invalid arguments for reducer join_room`, check:

```bash
npm run dev:check
```

Then align local SpacetimeDB module settings and republish:

```bash
# .env.local and spacetime.local.json should both point to mistake-watch-rooms
npm run spacetime:publish -- --break-clients
```

## SpacetimeDB

Start local SpacetimeDB:

```bash
npm run spacetime:start
```

Publish the local module to the local server:

```bash
npm run spacetime:publish
```

Generate client bindings:

```bash
npm run spacetime:generate
```

If PowerShell reports `spacetime is not recognized`, the SpacetimeDB CLI is not on PATH for the current shell. Restore the CLI/PATH first, then rerun:

```bash
spacetime build
npm run spacetime:generate
```

Production SpacetimeDB uses:

```text
NEXT_PUBLIC_SPACETIME_URI=https://maincloud.spacetimedb.com
```

The database/module name is configured through:

```text
NEXT_PUBLIC_SPACETIME_MODULE
```

## Verification

Run these after meaningful implementation work:

```bash
npm run dev:check
npm run typecheck
npm run lint
npm run build
```

Targeted tests:

```bash
npm run test:dev
npm run test:identity
npm run test:queue
npm run test:sync
npm run test:youtube
```

For UI changes, also run a browser check against:

```text
http://127.0.0.1:5371
```

If local browser QA is blocked by a stale Next/Turbopack process or lock, document the blocker in the active task notes and verify with `npm run build` plus production/manual review.

## Production Deploy

Deploy to Vercel production:

```bash
npx vercel --prod
```

Primary production URL:

```text
https://watch.mistakestudios.com
```

Vercel fallback alias:

```text
https://mistake-watch.vercel.app
```

Health checks:

```text
https://watch.mistakestudios.com/api/health
https://mistake-watch.vercel.app/api/health
```

## Environment Variables

Use `.env.example` as the non-secret template.

Required public variables:

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SPACETIME_URI
NEXT_PUBLIC_SPACETIME_MODULE
```

Required server-only variables:

```text
SUPABASE_SECRET_KEY
SPACETIME_SERVER_AUTH_TOKEN
YOUTUBE_API_KEY
```

Do not commit `.env`, `.env.local`, `.env.*.local`, Vercel secrets, Supabase secret keys, or provider API keys.

Live-room seed grants use a SpacetimeDB server identity:

```bash
npm run spacetime:server-token
```

Store the printed token as `SPACETIME_SERVER_AUTH_TOKEN` in `.env.local` and Vercel. Add the printed identity hex to the private `trusted_seed_issuer` table for the same SpacetimeDB database. The identity hex is an allowlist value, not a secret; the auth token is secret.

## TASK-026 isolated Watch visual QA

The normal application remains on port 5371. The redesign fixture is explicitly
opt-in and uses port 5381 in its isolated worktree:

```powershell
$env:WATCH_DESIGN_QA = '1'
npx.cmd next dev --webpack --hostname 127.0.0.1 --port 5381
```

In another terminal:

```powershell
$env:WATCH_DESIGN_QA = '1'
$env:PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:5381'
$watchSpecs = Get-ChildItem tests/e2e/watch-*.spec.ts | ForEach-Object { 'tests/e2e/' + $_.Name }
npx.cmd playwright test $watchSpecs --workers=1
node --test tests/*/*.test.mjs
```

`/dev/watch-design` renders the real layout with fictional services; `/rooms/[id]`
uses actual backends. Do not count fixture playback as live provider or private
R2 proof. Do not enable WATCH_DESIGN_QA in production; its route must return 404.
See the TASK-026 integration/release notes for actual backend and phone evidence.

For this Windows machine, a local production check used
`$env:CIRCLE_NODE_TOTAL='3'; npm.cmd run build -- --webpack` to bound build workers.
Run lint excluding local archived deployment exports:
`npm.cmd run lint -- --ignore-pattern '.tmp/**'`. Those exports are QA artifacts,
not application source. Keep credentials and uploads out of release exports.
