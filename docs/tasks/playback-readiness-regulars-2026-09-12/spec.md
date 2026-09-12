# Playback and Regulars contract

The approved scope and exclusions are in [task.md](task.md).

## Playback authority and readiness

SpacetimeDB owns the canonical position/status/occurrence. The initiating admitted
controller may prepare a YouTube queue selection at paused zero, or resume a
paused source at its existing position. The player starts loading at that position;
its PLAYING callback submits a start with the exact source, queue item, occurrence
and unadjusted server revision. The server rejects stale, unauthorized, already
playing or out-of-window acknowledgments. Manual starts do not depend on the
automatic-next setting. Automatic queue preparation continues to require it.

Preparation is local intent, not durable user preference. Disconnect, authority
loss, superseding command or a 15-second timeout cancels it. Followers have no
start intent and cannot rewind the room by reporting readiness. Slow followers
catch up; a shared readiness barrier is deliberately not introduced in this slice.

## Clock and correction

Adjusted local timestamps are estimates, not command identifiers. New commands
are identified using source, queue item, occurrence, raw server revision, status,
position and rate. A clock-only shift must not bypass YouTube settling/deadband.

A matching admission join can provide a request midpoint clock estimate. Admission
identity prevents attributing another device's request to this client. Other fresh
reducer arrivals provide one-way samples, filtered for low delay and bounded
convergence. This does not claim continuous RTT measurement or symmetric networks.

Native media uses pitch preservation and at most a 2% corrective speed offset for
drift up to 1.5 seconds, returning to canonical speed when settled. Larger drift
can seek. An in-flight seek must not be reissued every 750ms; a distinct command
can supersede it and stalled seeks have a bounded retry. YouTube retains its
provider-aware deadband and settling gate rather than arbitrary fractional rates.

## Regulars

All available regulars remain browsable. Only the current bounded page mounts
track components; viewport size determines page capacity. Arrows and horizontal
drag/swipe navigate without turning a completed drag into a card click. Vertical
touch scrolling remains available. Count information is an accessible dismissible
info control. Skeletons, accent scrollbars, themed filters and reduced-motion
behavior follow DESIGN.md. Song-specific accents and existing card actions remain.

## Acceptance

- Slow manual YouTube starts retain the opening and resume position.
- Old readiness cannot overwrite a later command or bypass permission checks.
- Clock-only changes do not trigger repeated subsecond correction seeks.
- Native delayed seeks are not continuously restarted; rate correction settles.
- Desktop/mobile browsing reaches later regulars without mounting the full list.
- Filter controls, info dismissal, keyboard operation and reduced motion work.
- Report local deterministic/browser proof separately from real device/audio QA.
