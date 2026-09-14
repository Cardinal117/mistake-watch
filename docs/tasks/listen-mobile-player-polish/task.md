# Mobile Listen player reference implementation

Owner-approved 2026-09-12: match the generated reference, with smaller media,
unboxed inline YouTube/views/likes metadata, existing desktop play/pause glyphs,
song-accent heart, ambient thumbnail background, compact Watch-style navigation,
quiet header and one Up next row. Preserve actual video
aspect/visibility and one mounted provider across expansion and resizing.

Reference: [approved generated mockup](reference.png).
Fit ordinary portrait phones without scrolling; short landscape/large text must
retain reachable controls rather than clip them.

Owner subsequently approved the same unboxed metadata, compact volume control,
and accent heart on desktop. Keep desktop artwork, transport glyphs and rail
layout otherwise consistent with the existing design.

Owner correction 2026-09-14: keep the volume slider and numeric percentage
visible in the expanded player. The temporary tap-to-open volume popover crowded
the artwork and controls. Also stop an empty Personal-room queue cleanly when a
YouTube source ends: retain the terminal player state, publish one authoritative
end, and never replay the final frames or project the displayed position beyond
the known duration.

Separate scoped copy: only the verified Kay Nest account in its own Personal room
gets 'Fokof vir 7 dae' and 'Fok nee, vat die kak weg' for snooze/exclusion menu
actions. Their behavior stays unchanged. Read-only identity lookup verified
Kaiy nest; a server-only exact account mapping supplies a presentation flag.
The client additionally requires active sign-in, Personal kind, host role and
the current member's user ID matching the account. Display names are not used.

QA: browser fit, metadata styling, volume open/outside/Escape dismissal,
Visualizer navigation, keyboard/touch targets, provider node retention, desktop
regression; account-label positive and negative tests. Extra agent reviews.
Preserve unrelated uncommitted recording-review changes; only approved hunks
may be released. Git/deployment authorized after QA.

## Implementation and verification

- One mounted provider retained; only decorative backdrop is conditional.
  Artwork scales with height, with a 200px provider floor. Scroll remains a
  fallback for landscape, enlarged text and exceptionally long titles.
- YouTube, views and likes use one unboxed, wrapping icon/text row. Portrait
  fit verified with a two-line title and 3.9M views / 28K likes at 375x667,
  390x844 and 412x915; desktop at 1440x900 and 1440x600.
- Volume remains visible with its existing local-only slider callback and a
  tabular numeric percentage. Mobile and desktop layouts keep the full slider
  hit area without an overlapping popover. Header actions close their menu after
  selection.
- 19 browser checks passed, including source-node continuity, rotation,
  permissions, transport, seek, drag/cancellation, navigation and metadata.
  Screenshots: ignored `.tmp/listen-youtube-375.png`, `-390.png`, `-412.png`,
  `-1440.png`; media frame is explicitly a synthetic provider fixture.
- Three personalization tests cover every account/room eligibility gate.
  Independent gpt-5.6-sol medium reviewer verified the real durable membership
  path supplies the authenticated owner's user ID and the ID mapping remains
  server-only. No new account or database writes.
- Test-first fit baseline: direct fixture overflowed by 11px / 166px before
  changes. Additional YouTube case caught 27px overflow on the shortest phone;
  spacing adjustment passed. Additional feature tests are post-hoc, independently
  reviewed. Existing Discover navigation tests now open the approved header menu.
- Typecheck, production build and lint passed. Lint excluded ignored `.tmp/**` release archives to avoid scanning generated copies; application source remained included.
- Design hook's 11px findings belong to unchanged desktop Up Next text, outside
  the approved desktop metadata/audio/heart scope. New mobile text uses the
  existing 12/14/16/24px ramp; no hook suppressions added.

Owner listening/audio and exact-device aesthetic QA remain useful after release;
synthetic browser proof does not claim real YouTube playback/audio validation.

## Production receipt — 2026-09-12

Implementation `2da2d7d` pushed to main and the task branch. Clean export
`.tmp/listen-player-release` excludes local environment files and unrelated
recording-review code. Vercel clean build and clean-export personalization tests
passed. Candidate readiness passed before promotion.

Promoted deployment: `dpl_AaGqRvFpavG6p3NZdgKpV9qSQKYJ`
(`https://mistake-watch-doawv3am6-cardinal117s-projects.vercel.app`).
Custom-domain inspection confirms watch.mistakestudios.com resolves to this Ready
deployment. Live checks: health 200, ready 200 (Supabase and Spacetime ready),
excluded recording-review route 404. No database migration or Spacetime publish.
Refresh existing clients before owner visual/audio QA.

## Terminal playback and volume correction — 2026-09-14

The canonical Listen, Watch transport and direct-media builders now carry the
known source duration, so projected UI time is bounded. YouTube provider end
events remain observable while a remote correction is settling. The periodic
sync loop recognizes the local terminal state before applying a seek/play
correction, publishes or advances only while authority is still playing, and
therefore cannot repeatedly replay the final frames when no next item exists.
The unbounded internal YouTube projection remains intentional for the existing
missing-END fallback when a playable next queue item does exist.

Test-first evidence: focused playback tests failed for the missing duration and
terminal reconciliation before implementation, then 39/39 passed. A real-browser
fixture now drives a YouTube ENDED event with an empty queue and verifies one end
publication, no advance, and no repeat after the 750 ms sync tick. The expanded
Listen browser suite also verifies the visible slider and percentage at the
supported mobile and desktop sizes.

Independent review caught a stale-end/replay race before release. Terminal
evidence now requires both provider and canonical positions near the finite
provider duration and canonical status playing. Earlier rewinds, paused/ended
states and fresh same-source replays ignore the old end. YouTube joins the
existing completed-media replay-to-zero command. The browser fixture ends at
60 seconds, then replays and rejects a delayed end; the existing real-hook
replay tests cover YouTube alongside direct/HLS. Replay coverage is post-hoc;
the terminal evidence predicate has recorded red/green coverage.

Final targeted gate: 380 player, YouTube, queue and Spacetime tests passed;
19 mobile/desktop browser tests passed. Typecheck and lint passed. The full
bounded run before the final review adjustment had 924 passes and three
pre-existing mock failures in compact-playback and room-reload-recovery;
their tested source and mocks are unchanged from HEAD. An earlier unbounded
parallel run exhausted host memory; bounded concurrency completed normally.
The independent Sol Medium reviewer found no remaining release blocker.
No database or live-room module changes are required.
