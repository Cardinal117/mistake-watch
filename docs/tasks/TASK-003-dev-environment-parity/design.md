# TASK-003 Design: Dev Environment Parity

## Technical Approach

Add a small development diagnostics layer around the existing runtime instead of replacing the current scripts.

Recommended additions:

- `scripts/dev-check.mjs`
  - validates local env shape;
  - checks required commands and local ports;
  - checks whether Next.js is responding;
  - checks whether SpacetimeDB is responding;
  - checks `/api/health`;
  - prints actionable remediation.

- `scripts/dev.mjs` improvements
  - keep current combined startup behavior;
  - make readiness messages more explicit;
  - fail clearly when SpacetimeDB CLI is missing;
  - optionally print the exact browser URL and SpacetimeDB URL;
  - avoid destructive process cleanup.

- `npm` scripts
  - `dev:check`
  - optional `dev:health`
  - optional `dev:prod-parity`

## Parity Checks

The checker should compare the required local contract against production expectations without exposing secrets.

Check categories:

- Node/package availability;
- `.env.local` exists;
- required env names exist;
- no server-only key is accidentally exposed with `NEXT_PUBLIC_`;
- `NEXT_PUBLIC_APP_URL` points to local app during local dev;
- `NEXT_PUBLIC_SPACETIME_URI` points to local or explicitly configured remote;
- Next app responds on `127.0.0.1:5371`;
- `/api/health` returns a successful response;
- SpacetimeDB server responds on configured port;
- optional: YouTube metadata endpoint returns a non-secret configured/unconfigured state.

## Windows Process Handling

Do not automatically kill processes by default.

Better behavior:

- detect port occupation;
- identify likely process if possible;
- print the exact safe command the user can run;
- provide an optional future `dev:clean` only if the user approves it later.

## Documentation Updates

Update:

- `README.md`
- `docs/COMMANDS.md`
- `docs/HANDOFF.md`
- TASK-003 implementation report after implementation

The docs should state:

- the canonical local URL;
- the canonical local SpacetimeDB port;
- the expected startup command;
- the expected diagnostic command;
- how to handle stale Next/Turbopack or port conflicts;
- what must be true before browser QA.

## QA Approach

After implementation:

- `npm run dev:check` before local startup should report missing services accurately;
- `npm run dev` should start services;
- `npm run dev:check` after startup should pass;
- browser should load `http://127.0.0.1:5371`;
- `/api/health` should return success;
- existing `typecheck`, `lint`, and relevant tests should pass.

## Future Considerations

Later, this can become a stronger local harness:

- Playwright smoke test;
- multi-client room sync test;
- optional local SpacetimeDB module publish/check;
- CI smoke test against Vercel preview;
- local R2/S3-compatible test bucket checks when R2 lands.
