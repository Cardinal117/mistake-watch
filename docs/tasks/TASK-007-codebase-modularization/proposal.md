# TASK-007 Proposal

## Problem

A small number of integration files now contain several independent products and workflows. This increases patch risk, hides duplicated behavior, weakens review precision, and prevents useful client-side lazy boundaries.

## Goal

Create stable feature modules around listen mode, watch mode, queue/add-media, media services, and realtime authority without changing user-visible behavior or trusted authority boundaries.

## Scope

- Move-only room layout decomposition before behavioral cleanup.
- Shared queue/add-media contracts and controller logic after the move-only phase.
- Server media service decomposition behind compatibility exports.
- Live-room hook and SpacetimeDB helper decomposition without reducer/schema changes.
- Dynamic boundaries for inactive room modes and hidden heavy workflows after files are separated.
- Dead-code and stale-copy cleanup where repository-wide references prove removal is safe.
- File-length and bundle baselines that can be ratcheted down.

## Not in scope

- UI redesign or copy overhaul.
- New room, queue, upload, account, or playback features.
- Supabase migrations, RLS changes, or SpacetimeDB schema/reducer behavior changes.
- Permission changes.
- Provider changes.
- Production deployment before all batches and final QA are approved.

## Success criteria

- Listen and watch layout entry files become composition-focused.
- Independent hidden workflows can be lazy-loaded.
- Duplicate add-media behavior has one controller/contract source.
- Public facades preserve existing imports during server/realtime decomposition.
- No new failures beyond the documented sync baseline.
- Local watch/listen browser workflows retain behavior and visual structure.
- Room client payload does not regress and should improve after dynamic boundaries.
