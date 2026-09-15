# Ordered implementation

1. [x] Establish passing current expiry/reference/lease/disabled-worker/event-delivery
       characterization in the isolated catalogue database and application tests.
2. [x] Add failing SQL contract and concurrency tests for due-state gating and
       rollback; create additive service-only migration with Supabase CLI.
3. [x] Implement atomic gate; test independent database sessions, crash/timeout,
       short lock waits, 512/513/4,096 row shadow backlogs and no-traffic daily call.
4. [x] Add failing application tests that busy/not-due still allow provider claims
       and shadow dispatch; replace the two prune calls with the coordinated RPC.
5. [x] Run retention/security SQL regression and advisors, recommendation tests,
       typecheck, lint and build. Review lock ordering and expiry independently.
6. [x] Record local evidence and prepare a scoped release report. Git/hosted schema/
       deployment operations remain separate from this planning work.

Stop/reconsider if the wrapper cannot meet the existing execution budget with
the current bounded catalogue or if lock order is cyclic. Do not weaken expiry
or silently shrink provider progress to pass tests.

Next implementation model: Sol 5.6 Medium using approved-task-implementation,
Supabase, risk-based-testing and qa-release-gate. A focused SQL concurrency and
retention review is useful; DeepSeek may assist read-only under the owner's
existing authorization, with lead verification of all findings.
