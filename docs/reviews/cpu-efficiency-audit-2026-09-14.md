# CPU efficiency audit — 2026-09-14

Status: the first three bounded optimization slices were released on 2026-09-15.
This remains a source audit and rollout record, not a measured production savings
result.

Implementation update 2026-09-15: sequence item 1 is released in
[`cpu-efficiency-slice-2026-09-15`](../tasks/cpu-efficiency-slice-2026-09-15/task.md).
Sequence item 2 is released in
[`cpu-auth-context-2026-09-15`](../tasks/cpu-auth-context-2026-09-15/task.md):
recommendation authorization now performs one request-local Supabase identity
validation and reuses the fresh account summary without cross-request caching.
Sequence item 3 coordinates bounded catalogue retention across instances; its
hosted migration and application release are documented in the
[release receipt](../tasks/cpu-maintenance-scheduling/release.md). Production CPU
savings are not yet measured.

## Scope and evidence

User requested whole-site CPU efficiency investigation, including unexpected sources. No implementation, configuration, Git publication, production load test or deployment in this audit. Checkout HEAD 87674685a89333779bdee195ce9b07c5d6ad0b6e, application release e63667d. Existing dirty manual-review files and AGENTS.md preserved. Those manual-review additions are excluded from deployed-source conclusions.

Opera Vercel dashboard evidence, captured 2026-09-14, local Africa/Johannesburg date selections:

| Period        |          Active CPU | Function invocations |
| ------------- | ------------------: | -------------------: |
| Aug 31–Sep 6  |             36m 53s |               50,742 |
| Sep 7–13      | ~1h 7m (UI rounded) |               78,913 |
| Sep 13        |               9m 7s |          not sampled |
| Sep 14 so far |              3m 26s |          not sampled |

Week-over-week: ~82% CPU increase, ~56% invocation increase, ~17% increase in aggregate CPU per invocation. This does not isolate deployment causality or request mix. 30-day active CPU was 75.5% of four hours; warning threshold accumulation is confirmed, no demonstrated runaway instance.

Prior last-12-hour production route view: /rooms/[roomId] 395 invocations/36s CPU; preferences480/34s; discover463/29s; ready760/18s; health~760/9s. Routes aggregate methods and server actions; /rooms is NOT equivalent to page renders. Whole-month route attribution remains unavailable in the inspected free view. No claim of savings measured in production.

## Prioritized source findings

1. **Hidden Discover work (high confidence, low implementation risk).** listen-content-stage.tsx:155–174 keeps discovery mounted using hidden. use-personal-discovery.ts:117–172 refreshes every30s, focus/visibility/preferences; document visibility does not reflect the selected visualizer. 120 scheduled GET/hour per visible Personal Listen tab, plus event-driven requests. Pass panel activity into polling, retain cached UI and enforce metadata expiry independently. Refresh on return; preserve immediate mutation feedback.
2. **Discover event overlap (high confidence).** Request versioning drops stale responses but does not suppress concurrent server requests. Add single-flight and coalesced refresh with a queued dirty generation so mutations during a request are not lost. Client abort is not guaranteed to stop already-started server work.
3. **Preferences poll and connection churn (high confidence).** use-media-preferences.ts:22,187–211 polls every10s (360/hour per visible online room tab), in both Watch and Listen. preference-service.ts:31 loads live preferences and full durable account pages; room-preference-bridge.ts creates/closes a trusted connection per operation. Existing in-flight, event throttle, visibility and429 handling should be retained. First coalesce reads scoped to authenticated account/session AND relevant room, clearing on identity change and retaining per-tab authorization/withdrawal checks; consider revision-based invalidation with bounded fallback. Do not truncate account rows or leak between users; stale overlays/unlikes and cross-device changes must remain correct.
4. **Interactive maintenance fanout (high confidence).** app/api/recommendations/discover/route.ts:52 onward schedules delivery plus catalogue preparation after GET. catalogue-service.ts prepares/reconciles, then runMusicCatalogueMaintenance; catalogue-worker-core.ts:56–60 calls prune before even checking provider-disabled/idle. pruneMusicCatalogue invokes both catalogue and shadow pruning. Move physical pruning to bounded maintenance cadence while keeping read-time expiry eligibility. Gate unchanged reconciliation using durable due/revision state. after() is not free compute.
5. **Delivery empty work (high confidence, safeguards exist).** preferences GET/PUT and Discover/grants/counts can attempt delivery. durable-outbox-drain.ts:17 claims globally before work; successful acquisition opens operational outbox then separate listener authority connections. SQL delivery lease already excludes concurrent work and applies10s cooldown (30s failure); do not claim every request drains. Consider adaptive empty backoff with prompt dirty wakeup and existing at-least-once/idempotent acknowledgement intact. Never replace reliable delivery with a once-daily cron alone.
6. **Repeated auth within one request (high confidence).** room-authorization.ts:86 onward calls auth.getUser and later getAccountSummary(), which calls auth.getUser again (account/server.ts:31). Reuse the validated request-local account context and retain fresh membership, account-disabled and room status checks. Never introduce a global user/auth cache. Existing profile is read, not rewritten every time (server.ts:306).
7. **Room heartbeat (high confidence, lifecycle-sensitive).** use-room-connection.ts:77–112 sends touchRoomActivityAction on mount, every60s and lifecycle events; interval not hidden gated. actions.ts:249 onward branches through durable room/expiry/membership lookups and activity updates. Coalesce burst events and avoid repeated equivalent lookups first. Background audio remains active; do not expire occupied rooms or delay access withdrawal through indiscriminate suspension.
8. **Health checks (measured request count, source verified).** ready/route.ts creates Spacetime connection + Supabase availability request per probe. health is a small no-store JSON response. Around760 requests each in12h suggests roughly minute cadence but caller ownership is unverified. Investigate monitor configuration; a less frequent deep check or very short explicitly stale status cache can reduce work if detection SLA allows. Do not weaken real deployment readiness checks or change monitoring without scope approval.
9. **Account Rooms pane (verified, not global).** account-room refresh policy4s means900 nominal calls/hour only while Rooms pane open, visible and online. Existing specification TASK-014C requires4s freshness. Share same-account tab data and reduce endpoint repeated work; cadence changes need contract amendment.
10. **Upload processing status (verified conditional workload).** upload-transport.ts:382–398 polls1.5s initially then4s up to45min, approximately675 calls per stalled job ignoring latency. Add cancellable observer lifetime and adaptive unchanged-status backoff with timely completion. Background server job must survive UI closure; do not cancel the job itself. Check per-asset observer deduplication.
11. **Library overfetch/duplicate load (verified).** Watch parent and Manage hub separately mount useMediaLibrary. Share controller/invalidation to avoid duplicate opening fetch. lib/media/library/catalogue.ts selects full asset rows (160 cap), all folders, then ready source matches. Use explicit projection and scoped folder query where contract permits. SQL resource savings belong to Supabase; JSON parsing/serialization belongs to Vercel.
12. **Browser work, separate budget.** Listen clock updates250ms even paused; isolate progress state and profile paused/hidden frames. Dashboard15s projection reads subscribed Spacetime tables, not Vercel. Visualizer, queue derivation and animation are primarily device CPU/GPU. Do not advertise browser render improvements as Vercel savings.

## Existing protections / exclusions

YouTube metadata client caches and deduplicates in-flight requests. Catalogue jobs have leases, daily provider budgets and bounded batches. Shadow worker is pilot-gated, handles one claimed stage/run with deadline, and accepted links/ranking remain gated. Content asset route redirects to R2 rather than relaying media bytes through Vercel. External provider waits are not equivalent to active CPU duration. Generated bindings/import work and connection establishment may contribute but require profiling. Three scheduled daily crons alone do not explain minute-level traffic.

## Savings bounds and validation

Do not promise an overall percentage. Eliminating hidden Discover removes its nominal120 GET/hour while the visualizer is selected and the document is visible; switching preferences10s to30s would mathematically remove240 of360 scheduled reads/hour (67% of that stream), but changes freshness and is NOT yet recommended as an automatic behavior-preserving edit. Same-browser account/session/room-scoped cross-tab coalescing can eliminate eligible duplicate reads (not across devices), not necessary device-specific listening grants or room leases. Each proposed change must measure requests and CPU separately.

Offline validation matrix: five-minute Watch/Listen playing/paused, Discover/Visualizer, account pane open/closed, hidden/visible, offline/online, simultaneous focus+visibility, two tabs, rapid like/unlike, account switch, delayed/out-of-order response, denied grants, stalled upload, empty/full delivery backlog, metadata expiry and permission withdrawal. Count API calls using stubs; assert freshness/authority/feedback contracts. For backend changes, characterize exact auth/RPC/connect counts and empty/dirty paths; use local synthetic DB for query plans rather than production load testing. Production before/after measurement should use matched route/method/traffic mix, not raw day totals.

Next: implement the first bounded slice only after approval: active-panel Discover gating and request coalescing, with delayed-response/mutation/focus tests. Follow with request-local auth reuse and separately leased maintenance cadence. Sol Medium fits implementation once acceptance criteria are fixed; use independent final review for multi-tab invalidation and delivery correctness. Unresolved delivery scheduling architecture warrants Astra Medium decomposition. Relevant skills: spec-first-workflow, approved-task-implementation, risk-based-testing, qa-release-gate; Supabase skill before DB changes.

Memory: watch index/current-state loaded,2 files/4556chars/no truncation. Automatic cwd resolution failed; verified Git remote matched registry and explicit-project resolution succeeded. Memory predates current player release, so source/handoff used for current state. Checkpoint proposed: repeated hot reads schedule maintenance and connection work; preserve findings in this repository report. No vault candidate or write applied.

## Final independent review and validation

DeepSeek run 34b185a7c9e04cac98a4220d2220cff1 completed read-only in217.54s; source sharing explicitly approved after initial automatic-review rejection. Worker received a clean git archive produced from HEAD8767468, excluding credentials, local logs and unfinished manual review files. Worker had no git metadata, dependencies or SQL migrations; lead verified source revision and relevant SQL separately. Wrapper before/after state unchanged. Native reviewer independently challenged the report and corrected rate wording, cross-tab scope and missing grant coverage. No claim of exhaustive profiling of every source line or every hosted service.

Lead accepted/qualified these additional points:

- Personal authorization has THREE explicit auth.getUser calls through resolveAccountAccess, isPersonalRoomOwner and getAccountSummary, with two profile reads. Other room kinds do not all take the third call. This is source-level call count, not measured HTTP count; confirm SDK request behavior in a characterization test. Reuse authenticated request context, never cross-request permission caching.
- Direct/HLS listening grants renew every60s and on source/settings changes, even after denial (use-local-listener.ts:58–75,119–132). Device grants must remain independent. Five-second playback observations go to Spacetime, not Vercel. Denial backoff needs consent-change recovery.
- Spacetime recommendation-authority.ts:285,310 scans preference rows before filtering room/member. Outbox read/ack at:42,58 also scans. Consider indexed access as room counts grow; this saves Spacetime CPU, not directly the Vercel CPU allowance. Requires schema/runtime-specific verification.
- Full feedback payloads and full durable preference reads scale with history. Measure payload bytes and parse time before changing projections. Never drop suppression/revision fields or truncate account likes to save CPU.

Rejected/corrected DeepSeek proposals:

1. Never skip listener receipts merely because the separate operational outbox is empty. They are independent streams.
2. Room recommendation reads live AND durable preferences; this is intentional reconciliation, not the same account read performed twice. /api/recommendations/room is not the observed /rooms/[roomId] route.
3. A daily-only shadow trigger currently processes at most one stage/run; replacing active scheduling with that would severely reduce progress. Any slower scheduling must preserve bounded throughput and backlog-age targets. Read-time eligibility and retention also remain enforced.
4. Measured dashboard metric is explicitly Fluid Active CPU, not generic execution duration. I/O waits are not counted as equivalent CPU seconds. Twenty-second and eight-second drain budgets also exclude some connection/claim overhead and are not CPU budgets.
5. In-memory TTL guards are only per warm instance, not durable fleet coordination. A simple15–30s preference cache with local PUT invalidation is insufficient for other devices, authorization withdrawal and unchanged-looking state. Revision/invalidation design must precede it.
6. Provider daily limit100 is a media/job budget with batch size50, not100 batches/day. Shadow source path uses runShadowJob and its providers; a sleep in a different evaluation helper is not evidence that production executes that helper.

Executed local existing benchmarks (all exited0):

- benchmark:recommendations:250 items median0.094ms;1000 items median0.372ms. Synthetic listen-discovery processing only; excludes database, auth and provider work.
- benchmark:media-hub: existing progressive mount projection caps24 grid/12 list for1000 fixtures. Structural counts, not rendered browser CPU timing.
- benchmark:queue:250 items,500 iterations/sample; optimized p75 batch6.791ms vs legacy92.516ms. Existing implementation comparison, not savings achieved by this audit.

No application edits, production calls/load tests, Git publication or deployment occurred. Only this report was created/updated; ignored clean snapshot/task artifacts retained locally. The previous live dashboard evidence was reused rather than running another production probe.

## Proposed sequence and acceptance

Implementation update 2026-09-15: sequence item 1 is complete locally under
[CPU efficiency slice — Personal Discover refresh control](../tasks/cpu-efficiency-slice-2026-09-15/task.md).
It is not yet committed, deployed or measured against production traffic.

1. Discover active-panel gating, one in-flight refresh and queued mutation invalidation. Acceptance: no scheduled Discover GETs on visible Visualizer; one coalesced read for focus/visibility burst; mutations while pending always produce a fresh follow-up; metadata expiry still removes stale candidates; room/account switches cannot reuse stale responses.
2. Remove repeated request-local auth/profile reads using verified server context. Acceptance: one intended auth validation per request, unchanged anonymous/disabled/member/owner/revocation outcomes; preserve missing-profile creation behavior.
3. Separate physical pruning and idle preparation from interactive reads through durable due-time/lease control. Acceptance: one maintenance claim across racing instances, read-time expiry preserved, queued jobs progress within an agreed budget, empty delivery backs off without starving newly arrived records.
4. Consider a single per-delivery trusted connection for both independent streams and revision-based read sharing. Acceptance: both streams persist/ack independently with reconnect/failure fencing; no permission or account cache leakage; multi-tab and multi-device freshness defined and tested.
5. Address conditional upload/account/library polling, monitor cadence and browser paint work with separate budgets. No hidden reduction of the documented four-second Account Rooms freshness or active playback leases.

Do not estimate total savings by adding nominal request-rate reductions. Establish per-route/method CPU and request baseline, apply one slice, and compare normalized workload. A first optimisation pass can remove much avoidable traffic, but no evidence supports an80–90% overall CPU reduction or a guarantee of staying within Hobby indefinitely.
