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
npm run typecheck
npm run lint
npm run build
```

Targeted tests:

```bash
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
YOUTUBE_API_KEY
```

Do not commit `.env`, `.env.local`, `.env.*.local`, Vercel secrets, Supabase secret keys, or provider API keys.
