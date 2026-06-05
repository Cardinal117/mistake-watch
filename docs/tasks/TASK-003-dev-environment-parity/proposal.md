# TASK-003 Proposal: Dev Environment Parity

## Problem

Mistake Watch now depends on multiple runtime systems: Next.js, Supabase, SpacetimeDB, YouTube metadata, and browser-based YouTube playback. Production can work while local development is partially broken, which slows debugging and weakens confidence in pre-deploy tests.

The current setup starts services, but it does not provide a strong enough readiness contract.

## Goal

Make the local development environment reliably mirror production behavior for dashboard, room UI, queue, metadata, and live-room testing.

## User Value

- The user can run local tests without guessing whether the environment is broken.
- Codex can inspect local UI instead of relying on production.
- Bugs can be reproduced and fixed before deployment.
- Future tasks move faster because local startup has a clear operational contract.

## Scope

In scope:

- Add a dev environment health/doctor command.
- Strengthen local startup readiness checks.
- Document exact local/prod parity expectations.
- Validate required environment variables without printing secrets.
- Validate local Next.js and SpacetimeDB reachability.
- Validate app health endpoint behavior.
- Add actionable output for stale process, port conflict, missing CLI, and missing env cases.
- Add a repeatable browser QA startup checklist.
- Add tests for new diagnostic/parity logic where practical.

Out of scope:

- changing production infrastructure;
- replacing SpacetimeDB;
- changing Supabase schema;
- changing room feature behavior;
- implementing YouTube availability hardening itself;
- adding accounts or deployment automation.

## Success Criteria

Local development is considered reliable when:

- one command starts the app and local SpacetimeDB;
- one command reports whether local dev is ready;
- common failures produce clear remediation steps;
- docs explain local and production environment differences;
- Codex can open `http://127.0.0.1:5371` and inspect the dashboard during UI work;
- verification commands are documented and current.

## Risk

The main risk is over-automating process cleanup on Windows. This task should prefer diagnostic clarity over destructive cleanup. Any forced process termination must be explicit and opt-in.
