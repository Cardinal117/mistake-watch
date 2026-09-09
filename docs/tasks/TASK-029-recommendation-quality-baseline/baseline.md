# Recommendation baseline — 2026-09-09

Source: `77c1943c3e712ccfec57054eee8d99254ddba205`.
Read-only source inspection and existing local characterization checks.
This is not a listening-quality result, new release certification or quota audit.

## Pipeline and gaps verified in source

| Stage | Current behavior | Evaluation implication |
| --- | --- | --- |
| Seed | `media-cards.tsx` builds a query from current artist/channel plus title; no current item gives no query | Cold start lacks this provider seed; no account-wide candidate retrieval established by this path |
| Candidate supply | `discovery-panel.tsx` sends provider items to `buildRoomRecommendationRequest` | Likes influence supplied candidates; this path does not itself retrieve absent liked tracks |
| Retrieval | `lib/youtube/recommendations.ts` requests up to eight search IDs, then one batched metadata request when IDs exist, filtering playable items | Eight results is not eight searches; actual calls depend on caches and failures |
| Metadata | `youtubeMetadataToQueueItem` sets both artist and channel to `channelTitle` | Matching artist labels may really mean matching channels; recording correctness is unproven |
| Identity | `ranking-inputs.ts` deduplicates by normalized source/media identity | Different uploads of the same recording can remain distinct |
| Eligibility | Current, queued and supplied recent-history identities are excluded before ranking | `room-client.ts` supplies up to 160 played identities; this exclusion is not an elapsed-time rediscovery policy |
| Ranking | `rank.ts` uses deterministic scores, media-key tie breaks and iterative artist/channel/source diversity penalties | Stable computational baseline; no evidence yet these weights improve real listening |
| Preferences | `room-service.ts` reads requesting-account liked/neutral preferences, capped at 250 | No explicit do-not-suggest state in this preference contract; no fair opted-in group blend established |
| New-kind learning | Personal/Shared adapter maps revocable evidence to queue-added/Play Next counts and last-event time | Do not assume Legacy completion/replay/skip weights all receive equivalent new-kind signals |
| Legacy learning | Legacy adapter maps historical completion, replay, skip and removal counters | Older penalty semantics must not silently define the newer learning direction |
| Room policies | Themed and Temporary automatic suggestions suppressed in client, provider route and ranking service; Listen service removes uploaded candidates | Preserve suppression until separately accepted behavior; manual history remains distinct |
| Fallback | Pending/unavailable first-party ranking uses provider items; available empty ranking remains empty | Quality reports must identify fallback results separately from ranked results |
| Shelves | Room Picks remains queue-derived; contextual shelf uses ranked provider items or room-history fallback | Do not label every discovery row as personal intelligence |

File references are repository-relative to the baseline SHA. Key entry points:

- `components/room/listen/discovery/discovery-panel.tsx`
- `components/room/listen/discovery/media-cards.tsx`
- `lib/youtube/recommendations.ts`, `recommendations-client.ts`
- `app/api/youtube/recommendations/route.ts`
- `lib/recommendations/room-client.ts`, `room-service.ts`, `room-service-core.ts`
- `lib/recommendations/rank.ts`, `ranking-inputs.ts`, `scoring.ts`, `listen-discovery.ts`

## Cache and request accounting

- Browser provider client: process/module-lifetime Maps keyed by room/kind/query;
  coalesces matching pending requests; caches both successful and failed responses.
  No TTL, capacity limit or failure expiry appears in this client module.
- Upstream search and metadata fetches declare one-hour Next revalidation.
  This is source configuration, not a measured hosted hit rate or provider-retention decision.
- First-party service: bounded cache defaults are 30 seconds success, 5 seconds
  failure, 500 entries. Only Legacy policies use it; new-kind reads deliberately
  bypass cached consent-dependent recommendations.
- Provider route requests a 20-per-minute member guard; first-party request-budget
  constants include 30 recommendation reads per window. These are application
  guards, not evidence of Google project-wide quota enforcement.
- Actual Google allocation, consumed quota, upstream hit/miss counts and calls per
  useful selection were not inspected. Do not reuse old provider quota assumptions.

Confirmed source gaps worth evaluating, not automatically approved fixes: browser
failure-cache recovery, candidate supply beyond the current search, recording
identity, artist/channel semantics and recent-history versus rediscovery policy.

## Executed local evidence

The worktree was refreshed from clean `23cd524` to `77c1943` after verifying the
main checkpoint. No application edits, installs, live requests or provider imports.
This checkout has no `node_modules`. Existing tests ran against this checkout's
source using a temporary Node loader resolving only `typescript` from the existing
root checkout installation. No shared dependency junction or package changes were made.

Commands (PowerShell, repository root):

```powershell
node --loader ./.tmp/recommendation-baseline/typescript-loader.mjs --test tests/recommendations/ranking-fixtures.test.mjs tests/recommendations/ranking-performance.test.mjs tests/recommendations/room-service.test.mjs tests/recommendations/listen-discovery.test.mjs
node --loader ./.tmp/recommendation-baseline/typescript-loader.mjs scripts/benchmark-recommendation-baseline.mjs
```

The ignored temporary loader is:

```js
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'typescript') return {
    url: 'file:///C:/Users/Admin/dev/Personal/watch-together-platform/node_modules/typescript/lib/typescript.js',
    shortCircuit: true,
  };
  return nextResolve(specifier, context);
}
```

With normal dependencies installed, omit the loader argument. Tests transpile
current source through existing helpers. The Node experimental-loader warning is
a harness warning, not an application failure. Local logs remain ignored under
`.tmp/recommendation-baseline/`.

| Check | Result | Limit |
| --- | --- | --- |
| Four existing recommendation test files | 43 passed, 0 failed | Synthetic fixtures/mocked service dependencies; no physical or database integration rerun |
| Pure ranker, 500 candidates | p95 8.83 ms, existing 50 ms gate passed | 60 timed samples after warmup; local machine, no provider/network latency |
| Warm service test | Existing 250 ms gate passed | Mocked dependencies; not live Personal/Shared cache performance |
| Discovery derivation, 250 queue items | Median 0.107 ms; reported p95 0.129 ms | Legacy-default heuristic path, not the ranker |
| Discovery derivation, 1,000 queue items | Median 0.351 ms; reported p95 0.359 ms | Five batch averages of 250 calls; reported p95 is maximum batch average, not individual-call p95 |

No new tests were needed for Markdown. These existing checks characterize the
baseline only. Full typecheck/build/browser suites were not repeated for this
documentation stage. Historical release counts remain in TASK-028.

## Evidence still needed

- Owner-judged representative sequences and intended recording versions.
- Coverage of familiar/rediscovery tracks in current candidate supply.
- Theme eligibility and uncertainty labels, followed by classifier validation.
- Authorized real-provider quota allocation and usage, cache behavior and failure recovery.
- Same-candidate ranking comparison versus separate expanded-supply comparison.

Next scope and acceptance gates: [task.md](task.md).
