# Acceptance Criteria: Project Integrity, Security, and Roadmap Reconciliation

## Security

- Catalogue and upload APIs do not return permanent R2 media or poster URLs.
- Object keys are not treated as authorization tokens.
- Uploaded catalogue browsing remains app-authorization protected.
- Valid room guests can play an active uploaded session without catalogue access.
- Expired, unrelated-room, unauthorized, and missing sessions fail closed.
- No readiness or error response exposes secrets, credentials, or sensitive topology.

## Functional Correctness

- Add Media default playlist selection imports the intended rows.
- Duplicate video IDs at different playlist positions remain independently selectable.
- Fresh room creation shows a stable connection state and reaches the room when ready.
- Retryable connection failures do not immediately reach the global error boundary.
- Liveness remains cheap; readiness reports dependency state with bounded timeouts.

## Database

- All local migrations have an explained remote-history state.
- Already-applied schema changes are not replayed.
- New indexes have named query/integrity justification.
- Service-role-only RLS behavior is tested for anon and authenticated clients.
- Advisor findings are resolved, accepted with rationale, or tracked explicitly.

## Testing

- `npm test`, typecheck, lint, build, and file-length policy pass.
- Media authorization and Add Media correctness have behavioral tests.
- Room create/connect and readiness routes have integration coverage.
- A minimal browser E2E harness can run without Google OAuth.
- Production-only and provider-only checks are explicitly separated from local proof.

## Documentation

- README is concise and current.
- HANDOFF points to TASK-009 while active and no longer calls the AI DJ shell a feature.
- Supabase and SpacetimeDB docs reflect current migrations and database names.
- Recommendation brain, Add/Discover, Watch discovery, YouTube subscriptions/
  playlists, and AI DJ are represented as future work rather than completed scope.

## Must Not Break

- YouTube, direct, HLS, and uploaded playback.
- Watch/Listen switching and playback continuity.
- Queue order, Play Next consumption, autoplay, previous, and synchronized playback.
- Owner upload/management and authorized catalogue access.
- Guest-first room joining and active uploaded-media viewing.
- Existing Google identity sign-in scopes.
- The untracked TASK-008 Spatial Cinema draft.
