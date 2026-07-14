# Design Spec: Project Integrity, Security, and Roadmap Reconciliation

## Security Architecture

Treat an R2 object key as server-private. Catalogue and upload APIs may return
asset metadata and application-owned route references, but not a permanent
public object URL. Catalogue artwork and playable media should be resolved
through authenticated or room-session-bound routes with short expiry and
appropriate cache controls.

Uploaded catalogue authority and room playback authority remain separate:

1. An authorized signed-in account may browse and select catalogue media.
2. Starting media creates or reuses an opaque room media session.
3. Any valid room participant may request that session's playback route.
4. The route resolves the object server-side and returns a short-lived delivery
   response without placing a permanent object URL in durable room state.

## Runtime Readiness

Room connection state must be a typed application state. Inactive, connecting,
retrying, ready, and terminal error states must not be represented by throwing
an inactive SpacetimeDB object through the rendering boundary.

Split operational checks:

- `/api/health`: cheap process liveness, no remote dependency fan-out.
- `/api/ready`: bounded dependency readiness with timeouts and sanitized output.

Readiness should verify only dependencies that can be checked safely and cheaply.
External paid providers such as CloudConvert should report configuration state
without starting work or consuming credits.

## Database Integrity

Before changing migration history, compare local migration names, remote history,
and live schema objects. Record an already-applied migration only after its exact
schema effect is verified. Add FK indexes only when they support actual joins,
deletes, or advisor-backed integrity paths. Service-role-only tables keep RLS
enabled with documented deny-by-default client access.

## Test Architecture

- Add `npm test` as the complete deterministic local suite.
- Keep pure domain tests for queue and recommendation functions.
- Add route tests with mocked provider/storage boundaries.
- Add React interaction tests for Add Media and readiness states.
- Establish Playwright smoke coverage for signed-out/local-safe flows; keep
  Google-authenticated production QA as a separate manual gate.
- Replace source-text security assertions with behavior tests first.

## Documentation Architecture

The root README becomes a concise product and setup entrypoint. Detailed command,
deployment, architecture, and operational material remains in dedicated docs.
Every roadmap item must be labelled `implemented`, `partial`, `planned`,
`superseded`, or `draft`.

The recommendation roadmap must preserve a hard boundary: YouTube supplies
search, metadata, public playlist import, embeds, and explicitly consented
provider data; Mistake Watch owns room memory, first-party events, ranking,
explanations, and later advisory AI behavior.

## Edge Cases

- Existing public assets must continue to render while catalogue responses stop
  exposing permanent URLs.
- Poster delivery and video delivery may need different cache/range behavior.
- Guests may play an active uploaded room session but never browse the catalogue.
- Readiness must distinguish not configured, temporarily unavailable, and failed.
- Repeated playlist entries require stable row keys, not only video IDs.
- Local development without Google OAuth must still exercise meaningful fixtures.
