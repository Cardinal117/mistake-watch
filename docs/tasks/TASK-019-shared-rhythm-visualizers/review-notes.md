# TASK-019 Review Notes

## 2026-08-21 Planning Review

- **Documentation level:** Full packet. The task crosses a private extension
  boundary, realtime authority, a public SpacetimeDB table, and synchronized
  rendering.
- **Base:** `task/task-019-rhythm-publication`, rebased onto remote `main` after
  TASK-018 PR #5 merged as `f65d94c`.
- **Release dependency:** Satisfied before implementation continued. TASK-019
  does not contain an accidental stacked TASK-018 release.
- **Architecture decision:** Prefer exact-origin `externally_connectable` plus
  a long-lived port over a broad content script. Add a stable private extension
  ID and prove Opera GX behavior before shared-state work.
- **Privacy decision:** Local detailed visual frames may reach only the same
  captured tab. Shared room state contains stable timing metadata only.
- **Authority decision:** Host-only publication in the first release. Existing
  playback permission does not grant rhythm-publication authority.
- **Fidelity decision:** Do not synthesize a fake live spectrum for devices
  without detailed frames. Shared-tempo support is renderer-specific.
- **Testing:** New bridge, reducer, phase, and fallback behavior is test-first.
  Existing renderer behavior uses characterization-first coverage.
- **HTML:** Not created. Markdown is sufficient for this architecture review.

## Implementation Evidence

### Batch A - 2026-08-21

- **Test-first record:** The initial bridge suite failed 5/5 before the external
  connection existed. The website client shell then failed 4/4 while its
  implementation deliberately threw. Both were implemented only after those
  meaningful failures were recorded.
- **Stable identity:** Extension `0.6.0` uses a manifest public key whose derived
  ID is `gjhgbhjblbbpcpallbnpakijoheemgdb`.
- **Boundary:** Manifest candidates are limited to the two production aliases
  and local development hosts. Runtime validation additionally requires an
  exact approved origin, `/rooms/*`, and a top-level sender.
- **Lifecycle:** Approved pages stay dormant while capture is inactive. Only the
  captured tab receives normalized rhythm and bounded visual frames. Stop
  clears authorization, pending frames, and timers without requiring polling or
  page reconnect.
- **Backpressure:** One visual frame may be in flight per port. Newer frames
  replace pending work, ACK timeout releases the stream, and listener failures
  cannot permanently stall delivery.
- **Resource gate:** Offscreen-to-worker detailed visual delivery is enabled
  only while an authorized website port exists.
- **Independent review:** One read-only reviewer found inactive-connect,
  freshness, lost-ACK, async-disconnect, localhost-scope, one-sided port cleanup,
  and idle-forwarding gaps. Regression tests were added before each correction.
  The final follow-up review found no remaining security or lifecycle issue.
- **Focused tests:** 16/16 bridge and website-client checks pass.
- **Extension suite:** 61/61 tests pass.
- **Full suite:** 439/439 repository tests pass.
- **Repository checks:** TypeScript, ESLint, `git diff --check`, and file-length
  policy pass. File length reports zero violations and 15 pre-existing warnings.
- **Browser-real proof:** Chromium loaded the unpacked extension by stable ID;
  an approved `http://127.0.0.1:5371/rooms/*` page opened the named external
  port and received the inactive state without starting capture. The existing
  Rhythm Lab startup and renderer-switch check also passed.
- **Pending gate:** Load this exact working-tree checkpoint in Opera GX and
  verify inactive-to-captured activation, bounded visual delivery, stop to
  dormant state, navigation cleanup, and no extension network/storage output.
- **Scope:** No SpacetimeDB, Supabase, room authority, queue, recommendation,
  upload, renderer, commit, push, or deployment change is included in Batch A.
