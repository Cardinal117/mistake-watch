# TASK-007 Acceptance Criteria

## Architecture

- Layout entrypoints compose feature modules rather than defining independent applications inline.
- New handwritten files do not exceed 700 lines without documented approval.
- Existing oversized files do not grow during the refactor.
- Compatibility exports prevent unnecessary call-site churn.

## Behavior preservation

- Watch/listen switching, playback, sync, queue operations, previous/next, autoplay, chat, members, permissions, search, recommendations, Add Media, playlist import, uploaded-media access, uploads, folders, processing, Media Session, and account flows remain behaviorally equivalent.
- No permission, schema, reducer, API payload, storage key, or persistent-data contract changes occur in Batch 1.
- No visual redesign occurs.

## Security

- Owner-only upload and management remain server enforced.
- Uploaded catalogue visibility remains account/allowlist enforced.
- Room playback access remains session scoped.
- No private or signed URL leakage is introduced.
- Host, queue, and playback authority remain reducer enforced.

## Verification

- `npm run typecheck`, `npm run lint`, and `npm run build` pass.
- Queue, YouTube, SpacetimeDB, identity, media, and player tests pass relative to the recorded baseline.
- `npm run test:sync` introduces no failures beyond the two documented baseline failures.
- Local desktop and mobile room QA passes for both modes.
- Mode switching does not lose queue, playback, member, or local-control state.
- Room JavaScript and CSS payloads do not regress; dynamic-boundary work records before/after measurements.

## Release

- Agent patches are inspected before integration.
- Every batch has an atomic rollback point.
- Nothing reaches `main` or production without final user approval.
