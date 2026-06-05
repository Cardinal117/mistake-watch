# TASK-003 Acceptance Criteria

## Functional

- `npm run dev` remains the canonical local startup command.
- A new diagnostic command exists and can be run independently.
- The diagnostic command checks:
  - `.env.local` presence;
  - required public env variable names;
  - required server-only env variable names;
  - local app reachability;
  - `/api/health` reachability;
  - SpacetimeDB reachability;
  - obvious local/prod URL mismatch.
- Diagnostic output is actionable and does not print secret values.
- Failure cases return non-zero exit codes.

## Documentation

- README explains the local dev parity workflow.
- `docs/COMMANDS.md` includes the diagnostic command and failure remediation.
- `docs/HANDOFF.md` points future agents to the local readiness workflow.
- TASK-003 implementation report records verification results.

## Safety

- No `.env`, `.env.local`, or secret-bearing file is committed.
- No process is killed automatically without an explicit future user-approved command.
- Production deployment settings are not changed by this task.

## QA

- `npm run typecheck` passes.
- `npm run lint` passes.
- New diagnostic logic has tests where practical.
- Browser loads the dashboard locally at `http://127.0.0.1:5371` after startup.
- If local browser QA is blocked, the blocker is documented with exact remediation.

## Must Not Break

- Production build.
- Vercel deployment flow.
- Supabase-backed rooms.
- SpacetimeDB live sync.
- YouTube metadata and playback behavior.
- TASK-002 ordering and active feature roadmap.
