# TASK-029 implementation sequence

Status: Steps 1–6 completed and locally verified; subsequent owner-approved production rollout completed. See [live receipt](live-rollout-2026-09-09.md).
Evidence: [implementation and QA](implementation.md).

1. Record reference and gradient override; freeze observable data/count/feedback
   contracts. Main owns UI/hooks/integration/docs; one agent owns disjoint database,
   server endpoint and backend tests. Preserve unrelated work.
2. Test-first regulars/feedback/queue projection contracts, database authorization,
   idempotency and revision conflicts. Characterize existing playback behavior.
3. Implement bounded Personal projection and durable feedback/diagnostics. Validate
   migration locally against a schema-only clone, not a production reset.
4. Implement Personal grid/list/rediscovery and desktop underline tabs with stable
   queue states, accessible feedback and Undo. Preserve current song gradients.
5. Integrate filters before Personal ranking, disable unsafe provider fallback, and verify that
   manual playback remains available. Test new contracts and existing regressions.
6. Run typecheck, lint, build and responsive browser QA. Independent agent reviews
   actual diff and important failure cases. Fix findings, record evidence and
   remaining real-device/hosted limits. The original local checkpoint preceded
   the owner's subsequent Git and production rollout authorization.

7. Completed: merge PR #17, apply the reviewed migration, deploy the merged
   revision, verify production health/access and signed-in Personal UI, and
   record the release receipt. Natural listening-quality evaluation remains open.
