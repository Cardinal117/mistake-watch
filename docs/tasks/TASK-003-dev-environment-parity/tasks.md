# TASK-003 Tasks: Dev Environment Parity

## TASK-003.1: Audit Current Dev Startup

- Inspect `scripts/dev.mjs`, `package.json`, `.env.example`, `docs/COMMANDS.md`, and `/api/health`.
- Identify where startup can silently fail or produce unclear output.
- Confirm whether local SpacetimeDB module publishing is required before sync testing.

## TASK-003.2: Add Dev Doctor Script

- Add `scripts/dev-check.mjs`.
- Add `npm run dev:check`.
- Check environment shape, local URLs, ports, app health, and SpacetimeDB reachability.
- Never print secret values.
- Return non-zero exit code when required checks fail.
- Print clear remediation steps.

## TASK-003.3: Strengthen Dev Startup Feedback

- Improve `scripts/dev.mjs` output.
- Make local app and SpacetimeDB readiness explicit.
- Make missing CLI and blocked port cases easier to diagnose.
- Do not add automatic destructive cleanup.

## TASK-003.4: Document Canonical Local Workflow

- Update `README.md`.
- Update `docs/COMMANDS.md`.
- Update `docs/HANDOFF.md`.
- Document:
  - start command;
  - check command;
  - expected URLs;
  - env requirements;
  - stale process handling;
  - browser QA readiness checklist.

## TASK-003.5: Verify Local Browser Readiness

- Run `npm run dev`.
- Run `npm run dev:check`.
- Open `http://127.0.0.1:5371` in the browser.
- Confirm dashboard loads.
- Confirm health endpoint responds.
- Document any blocker instead of falling back silently to production.

## TASK-003.6: QA and Commit

- Run:
  - `npm run typecheck`
  - `npm run lint`
  - relevant tests for new script logic if added
  - `npm run dev:check`
- Update implementation report.
- Prepare a focused commit through `git-commit-assistant`.

## Safe Commit Point

Commit after TASK-003.6 when:

- docs are updated;
- diagnostics pass or clearly report expected local service absence;
- no secrets are staged;
- browser QA is documented.
