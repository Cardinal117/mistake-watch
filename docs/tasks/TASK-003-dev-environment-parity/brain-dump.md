# TASK-003 Brain Dump: Dev Environment Parity

## User Intent

The local development environment must be reliable enough for UI inspection, browser testing, and realtime sync testing without depending on production.

User requirement:

> Current issue I am seeing with our testing approach is getting on my nerves. We must make sure that the dev environment is always working just as well as the production environment.

The practical expectation is:

- Codex must be able to see the dashboard and UI locally when needed.
- The user must be able to run tests locally without fighting startup issues.
- Local behavior should match production behavior closely enough that regressions can be trusted before deployment.
- Failures should be explicit and actionable, not silent or confusing.

## Current Context

Current local command:

```bash
npm run dev
```

Current behavior:

- `scripts/dev.mjs` starts local SpacetimeDB if needed.
- It then starts Next.js on `http://127.0.0.1:5371`.
- Local SpacetimeDB defaults to `127.0.0.1:5372`.

Known pain points from recent work:

- stale Next/Turbopack processes or locks can block local testing;
- browser QA sometimes shifts to production because local is unreliable;
- local SpacetimeDB status is not strongly validated before UI testing;
- environment mismatch can hide bugs until Vercel production;
- there is no single "doctor" command that reports what is wrong;
- there is no reliable scripted proof that dashboard, health endpoint, Supabase config, SpacetimeDB, and YouTube metadata are ready locally.

## Desired Outcome

Local development should become a first-class test target:

- start reliably;
- report readiness clearly;
- detect common misconfiguration;
- expose local/prod parity problems early;
- give Codex and the user one dependable workflow for local UI checks.

## Scope Boundary

This task is about development reliability and parity. It is not a feature task and should not change room UX unless a tiny diagnostic UI state is required.
