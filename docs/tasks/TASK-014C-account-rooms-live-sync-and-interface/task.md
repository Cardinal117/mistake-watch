# TASK-014C: Account Rooms Live Sync And Interface Refinement

Status: Implemented - production QA passed, guest footer refinement pending release
Documentation level: Compact task
Updated: 2026-08-18

## Objective

Keep Account Rooms current across signed-in devices and improve the panel's
information density without weakening the private account-room data boundary or
changing room lifecycle authority.

## Scope

- Refresh the signed-in Account Rooms projection while its tab is visible.
- Refresh immediately after local room actions and when the browser regains
  focus or visibility.
- Prevent overlapping requests and stale responses from replacing newer room
  state.
- Consolidate duplicate Rooms headings into one responsive command-panel
  header with a room count and concise description.
- Add local room-name search, relationship filtering, sorting, and separate
  Open rooms and Closed history disclosure groups.
- Move Google identity scope copy and signed-in sign-out action into the Account
  tab. Preserve a compact persistent sign-in footer for guests so optional
  account access remains discoverable across tabs.
- Preserve all existing room relationship labels, lifecycle commands,
  confirmations, loading states, and authorization behavior.

## Exclusions

- No database migration, RLS policy, direct client table subscription, or new
  public API contract.
- No permanent room deletion, automatic archive, ownership transfer, or
  archived-room restoration.
- No dashboard, queue, playback, recommendation, uploaded-media, SpacetimeDB,
  or provider change.
- No new dependency, broad Account Command Panel redesign, or new visual token.
- No Batch B or Batch C implementation during the Batch A checkpoint.

## Decisions And Approach

- Use bounded polling through the existing authenticated
  `/api/account/rooms` route rather than exposing service-role-only Supabase
  tables to browser subscriptions.
- Poll every four seconds only while the Rooms tab is mounted and the document
  is visible. Refresh immediately on window focus and document visibility.
- Keep one request in flight at a time, abort on unmount, and ignore stale
  completions. A failed background refresh keeps the last good room list while
  exposing a recoverable error.
- Treat Open and Closed as room-state groups. Treat Owned, Joined, and Saved as
  relationship filters because saved state can overlap ownership.
- Keep Open rooms expanded and Closed history collapsed by default. Archived
  rooms remain excluded from the account projection.
- Keep one visible Rooms heading at every viewport. Desktop may enrich the
  command-panel header; mobile must not lose the active-tab title.
- Place identity scope and the signed-in sign-out action inside the Account tab.
  Signed-in users do not reserve persistent footer space. Guests retain one
  persistent Continue with Google footer across tabs without duplicating that
  action inside Account.

## Implementation

1. **Batch A - Cross-device freshness**
   - Extract a small polling/freshness helper where it improves deterministic
     tests.
   - Refresh on a four-second visible-tab interval, focus, and visibility.
   - Preserve immediate local refresh after Unsave, Leave, Close, and Archive.
   - Prevent overlapping fetches and stale response commits.
   - Add focused timing, visibility, cleanup, and source-boundary coverage.
   - Safe review point: synchronization behavior is independently releasable.
2. **Batch B - Rooms information architecture**
   - Consolidate the Rooms header and recover duplicate vertical space.
   - Add local search, relationship filtering, sorting, and Open/Closed
     disclosure groups with counts.
   - Preserve command availability and stable room IDs through every view.
   - Safe review point: desktop/mobile room discovery and management pass.
3. **Batch C - Account action placement and final QA**
   - Move identity scope and signed-in sign-out control into the Account tab.
   - Remove the persistent footer for signed-in users while preserving one
     compact guest sign-in footer for discoverability.
   - Run accessibility, responsive, authorization, lifecycle, and regression
     QA across signed-in and guest states.
   - Safe review point: TASK-014C is ready for release and owner QA.

## Risks

- **Request amplification:** poll only while the Rooms tab is mounted and the
  document is visible; do not create a global timer.
- **Stale overwrite:** serialize loads and guard response revisions before
  updating state.
- **Error flicker:** retain the last successful list during background failures
  and reserve the full loading state for the initial request.
- **Privacy regression:** continue deriving identity server-side and return only
  the existing room summary contract.
- **Action drift:** filters and groups must render the original room object so
  commands cannot become attached to a different row.
- **Mobile hierarchy loss:** preserve one active Rooms title when consolidating
  the desktop and content headings.

## Acceptance Criteria

- A room Unsave, Leave, Close, or Archive completed on one signed-in device is
  reflected on another device with the Rooms tab open within five seconds.
- Returning focus to a stale Rooms tab refreshes it immediately.
- Polling pauses while the document is hidden, resumes on visibility, does not
  overlap requests, and stops when the tab unmounts.
- Initial loading, retained-data refresh errors, empty state, and manual Retry
  remain understandable and keyboard accessible.
- Search, filters, sorting, and status groups never duplicate, skip, or attach
  commands to the wrong room.
- Open, Closed, Owned, Joined, and Saved state remains legible on desktop and
  mobile.
- The Account tab owns identity scope and signed-in Sign out. Signed-in users
  reserve no authentication footer space; guests retain one persistent
  Continue with Google footer across tabs.
- Guests receive no account-room data, and account-room responses continue to
  exclude invite secrets, participants, queue data, emails, provider data, and
  source URLs.
- Existing room creation, joining, saving, playback, queue, and uploaded-media
  authorization behavior remains unchanged.

## Evidence

- Owner QA confirmed account-aware creation and lifecycle persistence across
  devices, then found that remote Unsave, Close, and Archive changes require a
  reload or Rooms-tab remount before another open device updates.
- Inspection confirmed the Rooms client currently fetches on mount and local
  request revision only; no cross-device invalidation is active.
- Open unsaved rooms retain the existing one-hour idle-close policy. Closed
  rooms remain visible until manual archive; archive hides but does not delete
  the durable room record.
- Batch A now refreshes the existing private account-room route every four
  seconds only while the Rooms tab is mounted, visible, and online. Focus,
  visibility, online, local lifecycle actions, and Retry trigger immediate
  refreshes.
- Requests are serialized, aborted on unmount, sequence-guarded against stale
  application, and retain the last successful room list during background
  failures.
- Focused projection, lifecycle, and refresh tests passed 16/16. The full suite
  passed 346/346.
- Typecheck, ESLint, changed-file Prettier, file-length policy, and the
  production build passed. Scoped task diff checks are clean; the repository's
  unrelated owner-authored Quick Capture retains a pre-existing trailing-space
  warning and remains outside this task.
- Signed-in cross-device timing remains the Batch A production owner-QA gate
  because local Google OAuth is unavailable.
- Batch A is committed locally as `1aaa331`; it has not been pushed or deployed.
- Batch B replaces the duplicate signed-in Rooms content heading with one
  responsive command-panel title, description, and total room count. Guest copy
  remains browser-accurate and the mobile header retains one close control.
- Room-name search, Owned/Joined/Saved relationship filtering, Recent/Name/Oldest
  sorting, result counts, and accessible Open rooms and Closed history
  disclosures now operate locally on the existing safe room summaries.
- Saved filtering includes rooms whose primary relationship is Owned, filtered
  groups reveal matching results, and every rendered row retains its original
  room object and stable ID for lifecycle commands.
- Focused lifecycle, projection, refresh, and list-view tests passed 24/24. The
  final full suite passed 354/354.
- Final typecheck, ESLint, changed-file Prettier, file-length policy, production
  build, and scoped task diff checks passed.
- Local guest browser QA passed at desktop and 390x844: the active Rooms title
  remained visible, the mobile duplicate close control was removed, content did
  not overlap, and no browser warnings or errors were recorded.
- Signed-in room controls, filtering, and disclosure behavior remain the Batch B
  production owner-QA gate.
- Batch B is committed locally as `6c92f33`; it has not been pushed or deployed.
- Batch C removes the persistent authentication footer and places the unchanged
  Google identity scope, sign-in route, and sign-out route inside the Account tab.
  Other tabs now use the recovered panel height and render no authentication
  action or identity-scope copy.
- Focused account-room tests passed 25/25 and the full suite passed 355/355.
  Typecheck, ESLint, changed-file Prettier, file-length policy with zero
  violations, and the production build passed.
- Local guest browser QA passed at desktop and 390x844. Account showed the
  identity scope and Continue with Google action; Rooms showed neither, kept one
  mobile close control, and produced no browser warnings or errors.
- Signed-in Sign out placement and the combined Batches A-C cross-device room
  workflow remain the production owner-QA gate because local Google OAuth is
  unavailable.
- Production owner QA passed cross-device Save/Unsave, Close, Archive, focus
  refresh, action targeting, search, relationship filters, sorting, counts,
  disclosure groups, keyboard navigation, signed-in authentication placement,
  desktop/mobile layout, private account-room API responses, and core room
  playback/queue regression checks. Remote changes appeared in about 2.8
  seconds without refresh.
- Owner QA requested one final behavior adjustment: guests should retain a
  persistent Continue with Google footer across tabs, while signed-in users
  keep the reclaimed space and Sign out remains only inside Account.
- The supplied recommendation trace showed sequential requests in the captured
  sample, but separate console evidence contained recommendation preference
  `429` responses. A SpacetimeDB client cache warning also appeared after guest
  admission. These are tracked as separate follow-ups because this task does
  not change recommendation or live-room synchronization behavior.
- Authorized uploaded-playback regression QA remains unavailable while the
  revoked CloudConvert credential prevents preparing new uploaded media. Guest
  catalogue denial still passed, and no uploaded-media behavior changed here.
