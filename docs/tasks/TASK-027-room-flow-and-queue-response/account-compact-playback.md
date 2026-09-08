# Account-specific compact playback

Approved 2026-09-08; committed and deployed for owner live QA.

## Contract

- Separate server-only `COMPACT_PLAYBACK_ACCOUNT_IDS` allowlist, initially the
  two active Google-connected accounts currently authorized for the catalogue.
  Read-only verification confirmed exactly two. IDs stay in ignored local
  configuration, not source, fixtures, client bundles or documentation.
- Verified Supabase Google identity plus active profile plus exact allowlisted
  user ID is required. Guests, disabled users, other owners and future catalogue
  grants do not inherit the capability. Missing configuration fails closed.
- Watch: enabled accounts may minimize during playback, keep the draggable bar,
  and restore without replacing the player. Other accounts retain paused-only
  minimization. Minimizing is an explicit device-local action.
- Listen mobile: eligible accounts can choose compact thumbnail presentation
  using a control on the browsing player; tap/swipe expands normally. Save that
  choice per account on this device. Allow restoring the visible browsing embed.
  Desktop Listen stays unchanged. Provider type remains truthful; compact
  geometry is a separate presentation flag.
- Same provider instance and room authority throughout. This is an app-side
  presentation exception, not an exemption from YouTube's published player
  requirements. Mobile background/locked-screen continuation is not promised.

## Verification

Test-first eligibility and browser minimize cases. Verify denial, account change,
stored preference isolation, Watch play/minimize/drag/restore, Listen compact/
expand/revert, desktop and mobile layout, and provider DOM identity. No hosted
data mutations, schema changes, pushes or deployment in this slice.

## Prior commits

`dc3ba38`: membership alignment. `f84c287`: minimized Watch movement.
Both committed locally as authorized; neither pushed in this turn.

## Local QA evidence

- Test-first eligibility: `tests/identity/compact-playback.test.mjs` failed on
  missing capability before implementation, then passed active/exact-ID/Google
  identity and denial cases. User-editable metadata cannot grant access.
- Browser red: eligible Watch still had a disabled minimize button; Listen had
  no compact control. Both failed before UI changes.
- Browser green: account tests plus minimized-drag/dock regressions passed 6/6.
  The strengthened account tests then passed with a mocked YouTube IFrame API,
  retained iframe identity, landscape sizing, capability revocation/restoration,
  isolation from another eligible account's preference, and storage-write failure.
- Identity/Spacetime regression suites passed 111/111. Typecheck and focused lint
  passed. `npx next build --webpack` passed compilation, TypeScript and page
  generation; webpack avoids the documented linked-node_modules Turbopack
  worktree limitation. No claim of a Turbopack build pass.
- Mobile screenshots of both compact presentations inspected. Existing palette,
  radii and room treatments retained; no new design-hook suppression added.
- Provider mocking establishes UI/player-instance behavior, not physical-phone
  audio continuation or real Google sign-in acceptance. Those remain owner QA.

The ignored `.env.local` contains only the separate compact allowlist, not hosted
service credentials. The two eligible accounts were identified by a read-only
profile/catalogue/Google-identity query; no hosted rows were changed. Revocation
via profile/identity/config changes takes effect when server account state is
refreshed; it does not terminate an already-rendered view remotely.

## Review and activation

Development-only fixture links simulate eligibility (no sign-in needed):

- http://127.0.0.1:5383/dev/watch-design?owner&compact
- http://127.0.0.1:5383/dev/listen-design?owner&compact&youtube

In Watch, play then minimize. In Listen, use the compact icon beside transport
controls; expand normally or choose Show browsing player. Listen stores the
choice per account/device, while Watch minimization remains per current source.

Production activation was explicitly approved and completed on 2026-09-08. The
server-only allowlist is configured without exposing its values. Owner QA must
still verify both intended accounts plus an unlisted/guest control. Never use a NEXT_PUBLIC
variable or enable the capability based on a query string in a real room. The
query parameters above exist only in the development-gated design fixture.

## Deployment record — 2026-09-08

Feature commit `2dadc20` includes the prior membership/drag fixes. Vercel Ready
candidate `dpl_9ud5VPgopYH3SKJewBuyTEgPCWDH` was built from a clean Git archive
(1,159 tracked files; Vercel selected 1,156 upload files), passed the production
Turbopack build and was promoted to https://watch.mistakestudios.com.
Health/readiness returned 200/ready, both design routes returned 404, and browser
inspection confirmed the public dashboard loaded. No hosted data/schema or
Spacetime module changes. The previous accepted deployment
`dpl_2szjneG7xb5SpDtdaKjC1ijGkrGL` is retained for rollback. Branch commits remain
local, with no main merge. Live two-account and physical-phone QA is pending.
