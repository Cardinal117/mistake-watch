# Approved Watch consolidation — 2026-09-12

Owner approved implementation, docs, Git and production after QA.

## Scope

- Desktop expanded Watch sidebar becomes the primary Queue with Queue/History
  switching, search and existing replay/requeue/Next/remove/reorder controls.
  Remove Open full queue and duplicate desktop queue navigation. Browse shortcut
  opens expanded Queue. Mobile keeps its dedicated queue. No-source desktop
  retains a usable queue workspace until a player exists.
- Fix unintended Browse navigation scrollbar without hiding content scrolling.
- Compact horizontal Recently watched items using existing art/title/metadata.
- Use current media thumbnail as a blurred room backdrop with readable dark wash;
  retain palette fallback when absent/failed. No media frame capture or API lookup.
- Library/collections default natural numeric episode sorting (season then episode),
  additional explicit ordering choices; sort before windowing and after filtering.
- Catalogue room History defaults to list with a cards option, preserving actions.

## Verification and boundaries

Characterize current queue permission/reorder behavior with existing regressions;
add focused behavior coverage for navigation/history and numeric ordering. New UI
coverage is post-hoc where no red baseline is recorded. Independently review.
Check desktop/mobile, small desktop, long queues, search/canonical indices, source
changes and missing art; typecheck/lint/build before clean scoped deployment.
No server/schema/learning changes. Preserve dirty recording-review work. Branding
integration stays pending and is not included.


Owner refinement: remove the docked Now playing heading, use consistent 12px
horizontal inset, prevent horizontal player overflow, and remove the inherited
1200px expanded transport cap so timeline/controls fill their stage. Preserve
reachable scrolling only for genuinely constrained heights/large text.


## Final local QA

- 41 legacy navigation, fullscreen, permission and artwork checks passed.
- 6 catalogue sorting/history and action checks passed; 3 sorting unit tests passed.
- 7 final layout checks passed at 1920x1080, 1440x900, 1024x768 and 1024x600,
  including full transport width, no horizontal player overflow and stable provider.
- 15 queue/history/resize and optimistic-response checks passed across the combined
  run and one targeted rerun (obsolete Open full queue test label corrected).
- Typecheck, full lint excluding temporary exports, production webpack build and
  file-length gate passed (0 violations; 25 advisory warnings).
- Sol/Terra independent reviews passed. Apparent text in collection thumbnails was
  confirmed as synthetic SVG artwork, not overflowing DOM metadata.
- Browser verification uses local deterministic media/service fixtures. Production
  audio and member-device behavior remain owner QA. No real room was mutated.

Production clean-export deployment and receipt pending. Unrelated recording-review
files remain excluded. The code keeps a no-source queue workspace and the mobile
queue destination; desktop with active media uses the attached Queue/History only.
