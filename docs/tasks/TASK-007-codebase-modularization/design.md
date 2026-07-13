# TASK-007 Technical Design

## File-length policy

- Healthy target: 250-400 lines.
- Mandatory architecture review: over 500 lines.
- New handwritten file ceiling: 700 lines.
- Ordinary handwritten files above 1,000 lines require immediate decomposition.
- Single component/hook/function review: 200-250 lines.
- Generated bindings, database types, migrations, and mechanical fixtures are exempt.
- Existing violations use a ratchet: they may not grow and exceptions must shrink by batch.

## Target boundaries

```text
components/room/
  listen/
    listen-mode-layout.tsx
    now-playing/
    header/
    tv/
    discovery/
    queue/
    add-media/
    settings/
    theme/
  watch/
    watch-mode-layout.tsx
    header/
    audience/
    queue/
    media-hub/
      library/
      folders/
      uploads/
  shared/
    add-media/

lib/media/
  contracts.ts
  uploads/
  library/
  folders/
  processing/
  source-matches/

lib/spacetime/live-room/
  connection.ts
  snapshot.ts
  permissions.ts
  commands/
```

## Integration strategy

1. Move code without redesigning behavior.
2. Keep compatibility files at established import paths.
3. Land agent commits independently and review their full diffs.
4. Run focused tests after each commit and the complete gate after each batch.
5. Extract shared behavior only after both room layouts compile from their new boundaries.
6. Add dynamic imports only after stable module seams exist.

## Parallel ownership

- Listen agent owns only `components/room/listen-mode-layout.tsx` and new `components/room/listen/**` files in Batch 1.
- Watch agent owns only `components/room/watch-mode-layout.tsx` and new `components/room/watch/**` files in Batch 1.
- The integrator owns task docs, baselines, reviews, merge resolution, and QA.
- Agents must not edit shared queue, media, SpacetimeDB, configuration, or task files during Batch 1.

## Security and authority

- All permission checks and reducer calls remain unchanged during move-only work.
- No private/signed media URLs may be introduced into persistent or event state.
- Owner upload and catalogue gates remain server-authoritative.
- SpacetimeDB remains canonical for live room state.
