# Compact Discover lists — approved 2026-09-11

Status: implemented and QA passed locally. Owner requested this UI fix and QA before
continuing 030.10. Preserve the existing uncommitted listening/Stage 2 plans.

Scope: give recommendation names more width; compact Add to queue icon with
tooltip/accessibility label; stable duration/duplicate slot; fix View all
overflow and use two columns only when each row has sufficient room. Regulars
View all defaults to a list exposing title, artist, count, Like and queue controls.
Provide title/artist search, count sorting and minimum-count/liked filters.
Genre filtering waits for actual Stage 2 metadata. Search/filter only the
available catalogue results, not an implied complete or external library.

Reuse room tokens, accents, queue permission/pending/duplicate behavior and
existing menu portals. Home regular tiles keep their existing expansion behavior.
No automatic playback/queue actions or provider calls from browsing/filtering.

QA: browser regression for wide/narrow View all overflow and controls, default
regular list/search/filter/sort, empty results and explicit Add next; existing
Personal queue/card/feedback tests; typecheck, lint, build and visual screenshots.
Record behavioral red/green evidence here. No schema change in this UI slice.

Owner additions: display artist labels without the terminal ` - Topic` suffix;
retain original provider metadata and action payloads. Shared card artwork uses
centered cover fitting and the standard widescreen YouTube thumbnail variant for
known padded URLs, with original-image fallback. Regular tile border and count
badge use that track's extracted artwork accent, lifted for text contrast; the
room gradient still follows the currently playing song.

Implementation: dedicated browse component and row container styles. Two columns
activate at 1120px of actual Discover content width; narrower layouts retain one.
Rows reserve duration/duplicate space and two 44px icon actions. Regulars exposes
count, Like and queue controls directly, search by title/artist, favourites/most/
least/title sorting, minimum count and Liked only. Scope copy says available
tracks and this room's 180-day counts. Genre controls remain deferred.

Behavioral red: initial four Playwright cases failed against original source:
1440/768 browse overflow, missing compact button tooltip at 390, and zero regular
list rows instead of 12. A separate accent test failed because no per-card accent
existed. Green: 33 combined Personal browser checks, plus two regular-list visual
checks; two presentation utility checks passed (post-hoc, low-risk formatting).
The large split assertion uses 1920px viewport because 1440px includes the player
sidebar and leaves less than 1120px of actual content width.

Independent review found the 88px action column omitted its 4px gap; corrected
all responsive definitions to 92px. Metadata/queue commands remain unchanged.
Inspected recommendation and Regulars screenshots at desktop/mobile sizes.
Design hook's width-transition warning is contextual: the existing owner-approved
180ms coordinated tile expansion is intentionally preserved, with reduced-motion
coverage; this slice adds no new layout animation. Existing label-sm typography
uses the project's tokens. No hook suppression was added.

Next-step local progress: [owned-Themed explicit choices](owned-themed-choice-qa.md)
passed 219 isolated SQL assertions. This is only the first part of 030.10a;
Shared listening consent, listener receipts and account-wide counts remain pending.

Final checks: 35 distinct browser cases passed (33 regression cases plus two
regular-list cases); all eight browse cases passed again after the 92px spacing
fix. Typecheck and production build passed. Full source lint passed with `.tmp/**`
and generated `test-results/**` excluded: plain lint was cancelled after scanning
old release checkouts/npm caches inside `.tmp`, not due to a source error. File
length check: zero violations, 23 warnings, including the existing Listen layout
crossing the 500-line advisory threshold by three lines after its display helper.
The touched playlist artist label now uses label-sm instead of literal 11px.
No commit, deployment or hosted database changes in this follow-up.
