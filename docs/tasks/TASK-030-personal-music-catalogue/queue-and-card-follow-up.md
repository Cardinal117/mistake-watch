# 030.9 Intentional repeats and coordinated card transitions

Status: approved by owner on 2026-09-11; implemented, verified and deployed.
Extends the existing packet. Previous duplicate-blocking acceptance is superseded.

## Scope and approach

- Allow repeated deliberate Add to queue and Add next actions for the same source.
  Keep permissions, unavailable-source checks and short in-flight protection.
  Existing live reducer `allowDuplicate` support remains authoritative; no schema
  or provider change. Repeated transport delivery is still idempotent.
- Show a compact accessible duplicate icon in discovery and active queue rows.
  Match source identity, never title; played history alone is not a duplicate.
  Preserve the existing bulk-import duplicate choice rather than silently
  changing playlist imports. Individual discovery additions need no prompt.
- Confirm Personal additions only when a new matching queue occurrence appears;
  an existing occurrence or a reordered projection cannot confirm a new request.
- Clicking closed card B while A is expanded starts A's graceful close and B's
  graceful opening together. Cover Personal regulars and the existing mobile
  RecommendationCard wherever mounted, including Browse all. Retain click-away,
  Escape, keyboard focus, inert closing content and reduced-motion behavior.
- Preserve song accent/gradient, queue order/authority and existing motion timing.

## Plan and verification

1. Record behavioral RED for adding an existing source and switching cards.
2. Implement duplicate confirmation/indicators and shared card coordination in
   disjoint scopes (two assistants permitted by the owner).
3. Test repeated adds, pending/rejection/timeout, current and historical sources,
   active duplicate badges, permissions, rapid card switching and reduced motion.
4. Run affected unit/browser suites, typecheck, lint, build and desktop/mobile
   visual review. No synthetic live queue/preference mutations.

Risk: simply removing disabled state would falsely confirm from old queue rows;
snapshot occurrence IDs before sending. Pointerdown-driven closing can move the
second card before its click lands; coordinate activation rather than stealing it.

## Evidence

Additional owner reports in the same approved turn: reload redirects Personal
to Home; IVORY TOWER repeats do not increase recorded plays. Investigate and
fix before release, preserving authorization and truthful counts. Owner also
requested replacing repeated count text with a dark, song-accented top-right
number badge, with accessible label and explanatory tooltip.

Reload investigation found database/membership read failures converted into
denied/missing-room null, then Home redirect. Fix this confirmed failure path
with generic same-route retry UI; actual missing/nonowner/anonymous stays denied.
Owner observed desktop reload without visible error; exact incident cause is
not yet reproduced. Do not label a speculative auth refresh change as proven.

Production IVORY TOWER `49vfCkAmJS8`: start 10:26:23, automatic transition
10:29:21, ingested 10:29:30. It was classified playback_skipped with ratio2bps.
Source uses stored session.position_seconds (clock anchor) without elapsed
server time. Correct current and prepared automatic transitions and recorded
ratio using server-owned running clock; paused time never accumulates. Do not
rewrite prior events based only on duration or fabricate retrospective plays.

Existing width transition is intentional: owner requested preserving this
in-flow expand/close behavior; a transform would overlap rather than reflow
adjacent cards. Keep its bounded 180ms duration and reduced-motion bypass.

Baseline: `d37a6ef`, clean worktree.

## Verification and implementation

- Repeat browser regression failed because Add next stayed disabled for an
  existing source. Same test now passes, checking a second intentional addition
  and excluding old/unrelated occurrences from confirmation. Pending double-click,
  permission and timeout tests remain passing. Request-token fencing prevents a
  late rejection of a confirmed request cancelling its newer repeat; that extra
  race test is post-hoc coverage from independent review, not original RED.
- Card switching reproduced missed activation in Personal desktop/mobile before
  the shared hook fix. Five switching tests now pass including touch, rapid
  activation, keyboard and reduced motion. Existing closing timing retained.
- Queue identity tests cover aliases, distinct uploads, played history and stable
  occurrence IDs. Watch desktop/mobile and Listen virtualization tests pass;
  full queue counts are independent of the visible window.
- Completion regression uses the actual prepared reducer with real policy:
  before fix automatic end after 178 seconds returned skipped; afterwards
  completed. Eight further clock/pause/rate/unknown-duration/manual-next edge
  tests passed. All ordinary and prepared advance sites use canonical clock
  evidence, with existing permissions and stale-occurrence fences unchanged.
- Reload: seven intended RED cases covered query failure, admission redirect and
  stale retry notice; corrected paths pass. Missing/private/nonowner access stays
  denied. No auth Proxy or ownership bypass was introduced. Dashboard callers
  already handle snapshot errors. Exact user reload incident remains unconfirmed.
- Final combined queue/recommendation/Spacetime/YouTube/room/identity suite:
  **465 passed**. Combined UI run: **34 passed**, then two repeat/race cases passed
  after the token guard. Typecheck and module TypeScript passed; lint and build
  passed. Spacetime build passed; its missing module-local tsc warning is covered
  by the explicit root TypeScript command.
- Desktop 1680 and mobile 390 count badges and expanded cards visually reviewed.
  Dark accented numeric badges have accessible labels and 180-day tooltip.
  Queue drawer helper extraction preserves behavior and keeps it below the
  existing file ceiling. No live user actions or historical event rewrites.

Ready for publication under the ongoing owner-approved rollout. No schema or
reducer argument changes; publish playback runtime correction before frontend.
Retain actual live deployment receipts below after verification.

## Release receipts

Source `8556ce15a3046ff439903e6f9517f97a4007fd7d` published to main and task branch.
Spacetime production `mistake-watch-rooms` updated successfully, with empty
breaking-change plan and no `--break-clients`. Tables and reducer arguments are
unchanged. Bindings regenerated with no semantic diff; module/root TypeScript
passed after publication.

Clean Git archive built as `dpl_DbDbZX416GQLHM7YdQ5uERk2VjGL`:
`https://mistake-watch-66ojgwifc-cardinal117s-projects.vercel.app`.
Protected health returned HTTP200 and `{ok:true,service:"mistake-watch"}` before
promotion. Custom alias checked against the prior `dpl_7MoZvQqUPzXKBcQ48RdVYSoUFthi`
before issuing promotion. Promotion succeeded; final custom alias read-back
confirms `dpl_DbDbZX416GQLHM7YdQ5uERk2VjGL` is serving production.

No Supabase migration or account/event rewrite in this follow-up. Next natural-use
check is owner reload plus a full new qualifying playback; historical misclassified
events are preserved. Exact prior reload trigger was not reproduced, so keep
that uncertainty separate from the tested recovery paths.
