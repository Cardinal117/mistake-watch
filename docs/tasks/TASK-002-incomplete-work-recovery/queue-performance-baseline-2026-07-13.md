# TASK-002.5J Queue Performance Baseline

- Captured: July 13, 2026
- Source: Vercel Speed Insights production route metrics, P75, latest 7 days
- Production route: `/rooms/[roomId]`

## Field Baseline

| Metric |     P75 | Samples |   40% improvement reference |
| ------ | ------: | ------: | --------------------------: |
| TTFB   | 1296 ms |      29 |                      778 ms |
| FCP    | 3856 ms |      21 |                     2314 ms |
| LCP    | 7876 ms |      21 |                     4726 ms |
| INP    |  336 ms |      51 |                      202 ms |
| CLS    |  0.5868 |      36 | 0.1 or lower product target |

The primary TASK-002.5J field metric is room P75 INP because queue rendering, metadata fanout, and repeated derived-state work most directly affect interaction responsiveness. Field success requires at least 50 post-deployment room INP samples.

## Device Context

| Device  | Metric |     P75 | Samples | Interpretation                                                   |
| ------- | ------ | ------: | ------: | ---------------------------------------------------------------- |
| Desktop | INP    |  336 ms |      49 | Current usable field baseline.                                   |
| Desktop | LCP    | 7876 ms |      19 | Poor, but attribution points mainly to artwork/media loading.    |
| Desktop | FCP    | 3940 ms |      19 | Broader room-load concern.                                       |
| Desktop | CLS    |  0.7458 |      34 | Root room layout is the main follow-up concern.                  |
| Mobile  | INP    | 1752 ms |       2 | Warning only; sample count is too small for a reliable baseline. |
| Mobile  | LCP    | 9188 ms |       2 | Warning only; sample count is too small for a reliable baseline. |

## Attribution Notes

- LCP attribution identified blurred artwork, normal artwork, and the media element as the dominant candidates, with observed P75 values from `7876 ms` to `17088 ms`.
- CLS attribution identified the root room grid as the dominant shift source at approximately `0.7462`; the queue drawer selector was approximately `0.0216`.
- Queue work may reduce main-thread pressure, hydration cost, and INP. It must not claim to solve full room LCP or root-shell CLS unless measurements prove that outcome.
- Homepage P75 TTFB was `3777 ms` from 13 samples. That route is outside TASK-002.5J.

## Synthetic Baseline Contract

Batch A must record a pre-change benchmark before optimization:

- deterministic 250-item YouTube queue fixture;
- controlled mobile CPU/network profile;
- drawer-open-to-committed-row time;
- mounted full-row count while closed and open;
- initial metadata request count and peak concurrency;
- queue action latency for add, remove, reorder, and play-next;
- at least 5 runs, reporting median and P75;
- same browser, viewport, device profile, fixture, and build mode for before/after comparison.

The selected primary synthetic metric must improve by at least 40%. Supporting hard limits are 10 initial metadata requests, 3 concurrent requests, 0 full rows while closed, and no more than 30 mounted rows for a 250-item open queue.

## Batch A Algorithmic Benchmark

Captured locally after the Batch A implementation on July 13, 2026:

| Property              | Value                                    |
| --------------------- | ---------------------------------------- |
| Device profile        | Local Node.js CPU; no network throttling |
| Fixture               | 250 deterministic queue items            |
| Metric                | Queue derivation plus row index lookup   |
| Samples               | 25                                       |
| Iterations per sample | 500                                      |
| Pre-change median     | 87.655 ms                                |
| Pre-change P75        | 94.996 ms                                |
| Optimized median      | 7.542 ms                                 |
| Optimized P75         | 7.794 ms                                 |
| P75 improvement       | 91.795%                                  |

This is a deterministic algorithmic benchmark, not a browser/mobile field claim. The development-only drawer instrumentation must still capture open-to-committed-row timing, mounted rows, metadata pressure, and canonical queue action latency during manual browser QA.

## Measurement Commands

Use the authenticated Vercel CLI from the linked project and keep the Hobby-plan 7-day retention boundary in mind:

```powershell
npx vercel metrics --environment production --route '/rooms/[roomId]' --metric INP --stat p75 --since 7d
npx vercel metrics --environment production --route '/rooms/[roomId]' --metric LCP --stat p75 --since 7d
npx vercel metrics --environment production --route '/rooms/[roomId]' --metric FCP --stat p75 --since 7d
npx vercel metrics --environment production --route '/rooms/[roomId]' --metric CLS --stat p75 --since 7d
npx vercel metrics --environment production --route '/rooms/[roomId]' --metric TTFB --stat p75 --since 7d
```

If the installed CLI requires different flags, use `npx vercel metrics --help` and record the exact successful commands in review notes.
