# Discover, queue feedback and eligible listening rollout

Date: 2026-09-11. Status: released; local QA and production service checks passed.
Owner accepted natural-use QA in the subsequent conversation: functionality and
appearance approved. Stage 2 implementation is now authorized.

## Approved scope

The owner authorized the compact Discover follow-up, desktop queue refinement,
immediate recommendation/queue feedback, learning permissions/history clearing,
and account listener records. After appropriate QA they explicitly authorized docs,
Git publication and deployment. Stage 2 identity/classification remains follow-on work.
Two assistants worked on disjoint permission and listener-authority slices.

## Result

- Compact recommendation rows reserve duration/duplicate space and use labelled
  icon controls. View all uses responsive one/two-column lists. Regulars default
  to list details, search, Likes and listening-count filters/sorts.
- Regular artwork fills its card. Card border/count badges derive each artwork's
  accent. Display labels trim only terminal ` - Topic`; stored metadata stays intact.
  The current-song room gradient remains unchanged.
- Desktop fine-pointer queue rows use 60px rather than 82px with aligned duration
  and actions. Virtualization, keyboard focus and drag geometry use the same height.
  Mobile and Watch row sizing remain as established.
- Recommendation add immediately hides the suggestion and shows a non-playable
  pending queue row. Canonical request correlation replaces it on confirmation.
  Rejection restores the suggestion; timeout permits the same request to retry.
  Pending rows offer retry/hide status; hiding is not cancellation of server work.
  Confirmation alone emits `queue_observed`; intentional repeat requests stay distinct.
  Accepted suppression lasts for its recommendation decision, not indefinitely.
- Personal/owned-Themed eligibility and separate individual Shared listening consent
  have service-only authorization, purpose/epoch checks and withdrawal. History
  clearing advances a generation; delayed receipts cannot resurrect cleared evidence.
  Likes and deliberate queue choices are independently retained.
- Direct/HLS local playback observations require current admitted session grants,
  eligible account context, canonical occurrence/time validation and 90% distinct
  audible coverage. Devices union coverage once per account/occurrence. Qualified
  compact receipts are private, leased for delivery and retained for 180 days.

## Provider and rollout limitations

Expanded YouTube API-derived listening measurements remain disabled pending an
affirmative provider-use review. Existing Personal YouTube badges retain their old
scope. The new direct/HLS count summary in listening settings is separate. These
new receipts currently support history/counts, not YouTube candidate classification
or a new cross-provider ranker. Shared consent does not imply community similarity
or permission to read other users' private taste profiles.

Unknown-duration/live sources, seeks, muted/buffering/disconnected intervals do not
qualify. Counts measure observed eligible playback, not human attention or OS sound.
Conservative sampling can omit terminal fragments. Delivery runs with the existing
leased event pump, interactive reads/renewals and daily scheduled fallback; it is
not guaranteed instantaneous after the final listener leaves.

## Verification

Chronology: new compact browse/desktop geometry, immediate rollback and permission
backend/API/UI cases had recorded failing baselines before implementation. Additional
late-response, observer integration and grant review tests are post-implementation
regressions with independent review, not fabricated test-first evidence.

- Node recommendation, queue and Spacetime suites: 360 passing at final combined gate.
- Permission SQL: 288 assertions and 3 actual lock/concurrency checks. Receipt SQL:
  32 cases, including bounded aggregation and service/private access. Local advisors
  and function lint clean. See the per-slice QA notes for exact test isolation.
- Actual loopback Spacetime protocol integration passes existing room/admission,
  replay and Like checks plus queue retry/canonical client-action correlation.
- Desktop/mobile browser checks cover lists, filters, expand/collapse, failure recovery,
  duplicate additions, consent/clear CAS, pending queue states and local player signals.
  58 distinct passing browser cases across the final scoped suites. Actual private
  listener protocol smoke additionally verifies two devices, one receipt, unauthorized
  read/ack denial and trusted acknowledgement after a real five-second interval.
- Final typecheck, lint and production webpack build passed. File-length gate:
  zero violations, 23 existing/architecture-review warnings. No untriaged owner
  intake notes changed or staged.
- Design review: the previously approved 180ms card width transition is retained
  intentionally to make neighbouring cards yield space; reduced motion bypasses it.
  No hook suppression was added. Desktop queue visually inspected in the browser.

## Release record

The three reviewed additive migrations were applied successfully to production
Supabase `qzmivwhzotuleivzphhm`:

- `20260911123216_owned_themed_choice_learning`
- `20260911123235_listening_permission_history`
- `20260911123251_listener_receipts`

Repository filenames follow the actual hosted migration versions; SQL content is
the locally tested content. Before/after: 2 accounts, 131 rooms and 241 members.
Listener receipts initially zero. Anonymous settings access and authenticated direct
count RPC execution denied; service-role execution permitted as designed.

Hosted advisors have no new schema warning/error. Their existing Auth warning is
[leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
This release does not alter Auth configuration. Private RLS/no-browser-policy and
fresh-unused-index INFO entries are intentional. Six INFO missing-FK-index findings
concern older unrelated tables; new receipt foreign keys are indexed.

Source `8ea2d08` was pushed atomically to main and the task branch. The corrected
runtime was published with `--delete-data=never --break-clients --yes=remote`.
Production retained 6,028 queue rows and 59 room sessions. Active clients reconnect
for the additive schema. No live data was deleted.

Vercel deployment `dpl_BcbNSbdQJLf64zKDV8NRAP6swETG` built successfully and was
promoted to [the live site](https://watch.mistakestudios.com). Inspecting that custom
domain resolved to the same Ready deployment. Custom-domain health returned
`{"ok":true,"service":"mistake-watch"}`. Candidate readiness reported Supabase
and Spacetime ready; the production development fixture returned 404.

Initial candidate `b5afcc8` built as `dpl_GTLEgeJTsKpfLBFaNw6pygPGRfn5` and passed
health, but was not promoted to the custom domain. Production runtime publication
with `--delete-data=never` correctly rejected insertion of `client_action_id` in
the middle of the existing queue schema. No runtime migration or deletion occurred.
The field was moved to the end and bindings regenerated; typecheck passes.
A populated baseline-to-candidate upgrade proof is required before continuing.

Rollback must retain the additive queue schema and regenerated bindings: do not
restore a pre-column module or use data deletion to bypass a migration warning.
If necessary disable new listener collection through a forward-compatible runtime
or frontend patch while preserving existing room and queue data.

## Next

Owner natural-use QA of queue feedback, repeat additions, mobile/desktop lists and
listening settings. Stage 2 then separates recording/version identity from playable
uploads and adds evidenced, source-attributed classification with confidence/unknown
states. Trial favourites/rediscovery first, Fantasy/orchestral as the strict theme,
and Classical/phonk as boundary cases. No invented genres, BPM or similar-listener claims.

Populated upgrade proof passed: two queued rows and two pending events preserved,
old rows received the optional default, and a new correlated addition succeeded.
The additive migration requires client reconnection (`--break-clients`); data
deletion remains prohibited. See listener-receipts-evidence.md.
