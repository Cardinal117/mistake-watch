# TASK-029 Personal Discover — local implementation and QA

Date: 2026-09-09. Baseline main `77c1943`. This report records the local QA
checkpoint. The subsequent owner-approved release is documented in
[live rollout](live-rollout-2026-09-09.md); local-only statements below describe
the evidence available at the original checkpoint.

## Result

Personal Discover now uses the accepted reference hierarchy: wrapping regulars
cards, aligned recommendation rows and a subordinate Rediscover section. The
existing player rail, media transport and song-driven accent/gradient remain.
Discover/Visualizer use stable underline controls. Mobile keeps its established
toolbar and compact player. Non-Personal discovery retains its data behavior.

Regulars distinguish explicit Likes from recorded completed plays in the last
180 days. The expandable count explanation works with keyboard and touch.
Counts deduplicate trusted occurrence IDs; repeats may count and seeks can qualify.
They are not lifetime totals or proof of uninterrupted listening. Rediscover uses
older-than-seven-day completion history. Candidate supply is bounded to 24 IDs,
with separate liked/frequent/older selections so one group cannot starve another.

Recommendations use the existing provider retrieval and deterministic ranker.
Reasons are existing ranking explanations, not new invented affinity claims.
Unavailable Personal ranking shows an honest unavailable state. No automatic
queue fill or continuous Autoplay has been added.

Add displays pending until the existing queue projection confirms presence.
Rapid clicks and existing queue entries are coalesced; rejection/timeout permits
retry. Play and Play next use existing room-authoritative commands. Requests,
visible impressions and observed queue presence are separate diagnostic events.
Ignoring a suggestion does not create a dislike. Feedback offers seven-day Not now,
Don't suggest, Wrong version (this video), Undo and saved suggestion controls.
CAS revisions prevent stale Undo overwriting a newer device's choice. Manual play
and Likes remain independent of exclusions.

## Files and boundaries

- UI: Personal panel, track/menu, hook, CSS and shelf model; integration in the
  existing discovery wrapper and Listen stage. Design tokens and DESIGN.md updated.
- Preferences: expose loaded versus identity-known state, preserve projected Like
  fallback for favourites outside the older 250-item preference snapshot, and
  invalidate abandoned requests on effect cleanup. Existing Like mutation/CAS
  authority remains in place.
- Backend: Discover route/contracts/service and one additive migration with
  private RLS tables, service-only RPCs, owner checks, expiry, idempotency and
  retention cleanup. Existing room ranking loads Personal exclusions before ranking.
- QA: contract/service/SQL/concurrency tests, Personal fixture tests and an
  explicitly gated actual-route test against local synthetic Supabase/SpacetimeDB.
  Existing mobile swipe QA now waits for the rendered panel before sending touch
  events, instead of racing client hydration.

## Review and evidence

One backend agent implemented the isolated server/database slice; one independent
agent reviewed privacy, filtering and UI races. Review findings fixed:

1. Raw provider fallback could bypass unavailable durable exclusions.
2. Hidden/high-volume Likes could crowd out eligible/frequent/older candidates.
3. Back targeted a detached button; count help was title-only.
4. Direct Play could seed suggestions from the first regular instead of active music.
5. A partial preference snapshot could incorrectly mark a projected favourite unliked.

Test-first evidence: suppression returned the blocked candidate before the filter
and passed after; initial browser assertion could not find Your regulars; new
backend contracts/RPC tests failed before their implementation. Database candidate
starvation cases failed before the bounded-source fix. Setup errors (missing pinned
Worker test dependencies, local hydration timing) are distinguished from product bugs.

| Final check | Result |
| --- | --- |
| `npm test` | 699 passed, no failures/skips |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed, no warnings/errors |
| `npm run build` | Passed; routes generated successfully |
| Combined Playwright suite | 19 passed: 9 new fixture tests, 1 actual-route test, 9 existing mobile toolbar/navigation tests |
| SQL and concurrency | 39 SQL assertions; two simultaneous PostgreSQL sessions verified CAS/idempotent retry |
| Independent review | Findings above corrected and targeted regression-tested |
| Design hook and `git diff --check` | No remaining deterministic design findings or whitespace errors |

Browser command: `WATCH_DESIGN_QA=1 PERSONAL_DISCOVER_LOCAL_QA=1
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5387 npx playwright test
tests/e2e/personal-discover.spec.ts tests/e2e/personal-discover-live.spec.ts
tests/e2e/listen-home-navigation.spec.ts tests/e2e/listen-home-toolbar.spec.ts
--workers=1` (set environment variables with PowerShell `$env:` syntax).

Desktop1680×960, mobile390×844, landscape844×390 and tablet1024×768 screenshots
were inspected. Regulars wrap, recommendation rows align, no Personal horizontal
carousel remains, and the existing mobile transport stays present. Automated
artwork switching proves accent variables change while the radial-gradient layer
remains; Discover/Visualizer switches preserve the original media element.
The three responsive tests were additionally extended and rerun to scroll through
the lower content and click the last Rediscover queue action; all three passed.
The final rows remain reachable above the compact player in portrait/landscape.

Screenshots contain illustrative fixture artwork/music, not the owner's history:
[desktop](discover-implemented-desktop.png), [mobile](discover-implemented-mobile.png),
[mobile lower content](discover-implemented-mobile-lower.png),
[actual local route](discover-actual-route.png).

## Actual route and limits

The actual `/rooms/<id>` route was exercised on frontend5387 against the existing
local synthetic backend55421/55422 and SpacetimeDB. A new synthetic owner opened a
Personal room through the UI. Three synthetic trusted-store completion rows with
two distinct occurrences displayed 2 recorded plays, independent from a Like.
Feedback hid the track, survived reload, and was restored through saved controls.
Anonymous access was denied. The QA owner was deleted afterward. These fixtures
prove projection/auth behavior, not actual listening quality.

The schema-only clone passed 39 SQL assertions and true two-connection CAS/replay
checks; isolated advisors reported no warning/error issues. See
[backend verification](backend-verification.md) for commands and state. The reviewed
migration was applied only to the active local synthetic database, preserving
existing account/room data and services. Production migration history is unchanged.

Provider metadata may show Title unavailable when the local provider cannot
supply it; fixture screenshots deliberately use illustrative artwork and names.
Real recommendation usefulness/provider quota, physical-device playback and hosted
rollout remain unmeasured. The Fantasy/orchestral strict-theme trial and boundary
genre evaluation are deferred as already planned. Eventual release must apply the
reviewed migration before the frontend; missing schema fails honestly.
