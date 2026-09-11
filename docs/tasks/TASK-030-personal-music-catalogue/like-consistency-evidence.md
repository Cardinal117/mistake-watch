# TASK-030.7 Account Like consistency — local evidence

Owner approved this slice in `approved-follow-ups.md`. Implementation based on
the source audit after delivery repair commit `55b4837`. No historical Likes or
plays were reconstructed, and no production preferences were changed for testing.

## Result and contracts

- Preference hearts and room ranking compare live `updated_ms` with durable
  `source_event_at`, not ingestion time or incomparable room revision counters.
  Durable state wins an equal timestamp; a strictly newer live action remains
  immediate while delivery catches up. The response retains the room-local CAS
  revision even when durable account state supplies the Like value.
- Account preference reads use ordered 500-row pages; uploaded access checks
  use 200-ID chunks. Account scoping remains on every page. Likes do not depend
  on catalogue metadata admission.
- Neutral records expire 30 days after **ingestion**, per the existing durable
  migration. If no durable record exists, a live YouTube/uploaded account row
  whose occurrence is at least 30 days old no longer contributes a Like. Its
  revision remains a neutral CAS baseline. This prevents an old room overlay
  resurrecting a subsequently pruned account unlike. Guests, direct/HLS room
  preferences, existing durable Likes and younger pending events are unchanged.
- Initial loading/read failure cannot initiate a toggle. A transient refresh
  failure retains the last loaded preference and exposes a retry message.
  Reads, callbacks and mutation responses are guarded by room plus account/member
  identity; previous-principal state is hidden immediately after a scope change.
  A missing key in a complete loaded snapshot is neutral; stale catalogue Like
  fallback cannot change the toggle direction. The optional controller argument
  remains source-compatible but does not override loaded account state.
- New additive trusted reducer `set_verified_account_media_preference_intent`
  permits same-state explicit account intent to emit a new revision/event.
  Trusted-server checks, active participant checks, action deduplication and CAS
  remain. Existing `set_verified_room_media_preference` and guest clients retain
  their no-op semantics. The bridge checks the initial CAS and reports conflicts
  rather than treating unchanged state as successful account reassertion.

## Test chronology

`node --test tests/recommendations/account-like-consistency.test.mjs`:

1. Before backend changes: 1 pass, 4 intended failures. Newer account Like/unlike
   returned the stale room value; 1,251-row fixture returned only 250; explicit
   same-state intent retained revision 1 instead of producing revision 2.
2. Before hook changes: 5 pass, 2 intended failures. Initial heart was actionable
   and a same-room identity switch applied the former account's pending response.
3. Retention regression: 8 pass, 1 intended failure before the 30-day overlay rule.
4. Retained callback regression: 9 pass, 1 intended failure before the pre-write
   identity guard; an old account callback initiated a write.
5. Final: all 11 pass. The unchanged newer-live/account-isolation case is
   characterization coverage. Mutation-settlement/old-response coverage was
   added during review (post-hoc), as was the stale catalogue-fallback toggle
   regression; do not describe all coverage as test-first.

Combined focused run: **48 passed**, covering the new cases, preference
reconciliation, uploaded authorization, existing UI contracts, room ranking and
Spacetime recommendation authority. Root TypeScript and
`node node_modules/typescript/bin/tsc --project spacetime/tsconfig.json --noEmit`
passed. Targeted ESLint passed after removing an unnecessary callback dependency.
Root coordinates the complete application build and browser verification.

## Actual local module proof

Started an isolated **in-memory** SpacetimeDB 2.8.2 server on
`http://127.0.0.1:5372`, data directory `.tmp/task030-like-runtime`, and used only
the dedicated fixture database `task030-like-proof`. The runtime script now
refuses non-loopback targets or arbitrary database names before resetting data.

`node scripts/verify-recommendation-reducers.mjs` with that explicit local URL
and database passed the existing runtime suite plus:

- untrusted client cannot call account reassertion;
- trusted first intent produces one event;
- retrying its action ID produces no duplicate;
- same-state new intent advances revision and produces the required event;
- stale CAS cannot overwrite it;
- old reducer same-state request remains a no-op;
- explicit unlike advances the next revision and event.

The first runtime attempt failed on a test-only optional-column SQL literal,
not an implementation assertion. Replaced that query with a bounded fixture
outbox count delta and reran successfully. The isolated server was stopped after
proof; no production module or data was touched by this agent.

## Release order and limits

Publish the additive Spacetime module **before** deploying the frontend/server
that calls the new reducer. No table shape or existing reducer parameters change;
existing frontend clients remain compatible during the transition. Revert the
frontend first if necessary; leaving the unused additive reducer is safe.

Bindings were generated from the local module with the installed CLI; its
module-local `tsc not found` warning was followed by an explicit successful
Spacetime TypeScript check. Only generated index/reducer registration and the new
reducer binding are semantically changed. Generator-only line endings and the
unrelated Next environment file were checked/normalized without source rollback.

These are local fixture and source proofs. Real user cross-device listening,
future outage behavior and hosted rollout receipts remain separate evidence.
No new claim about the owner's remembered historical Likes is inferred.

The design hook's Watch CSS color/type findings were unrelated to the two
identity-prop additions: no Watch CSS or visual design was changed or suppressed.

Supabase pagination semantics were checked against the official
[range documentation](https://supabase.com/docs/reference/javascript/using-modifiers-range).
The changelog Markdown endpoint could not be read through the web tool; this
slice introduces no Supabase schema/client-version change.
