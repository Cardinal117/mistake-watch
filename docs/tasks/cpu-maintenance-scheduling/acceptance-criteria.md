# Acceptance and testing

- Independent concurrent callers cause only one cleanup execution; contenders
  finish promptly with busy/not-due and do not reserve provider budgets.
- Repeated calls during cooldown perform zero deletion/reference scans.
- A new request after due time runs cleanup even on a fresh application instance.
- Failure/timeout rolls back cleanup and schedule advancement; retry can run.
- Lost response after commit does not repeat successful cleanup immediately.
- Disabled YouTube key or shadow pilot cannot disable retention cleanup.
- Busy/not-due leaves metadata claims and shadow wake-ups operational; unavailable
  cleanup retains truthful failure reporting and event-drain recovery behavior.
- Expired metadata is absent from reads before cleanup; no consent/exclusion,
  source reference, identity acceptance or ranking behavior changes.
- Pending/leased source semantics survive; tests cover jobs expiring during work.
- Shadow batch boundary tests cover 0, 512, 513, 4,096 and the reachable 12,288
  identity/tags/audio job capacity; possible
  backlog never receives the normal completed cooldown.
- No-traffic scheduled path still performs cleanup; Vercel cron configuration
  remains unchanged. No assertion claims subdaily enrichment while idle.
- anon/authenticated cannot read state or execute the new RPC; service role can.
- Missing RPC and malformed responses fail with fixed diagnostic stages.
- Test-first evidence for scheduling changes and characterization-first evidence
  for preserved retention/authorization are recorded separately.
- Local QA uses synthetic data only. Release evidence later distinguishes source
  state, migration application, scheduled execution and measured CPU savings.
