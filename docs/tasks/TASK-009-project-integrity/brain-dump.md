# Brain Dump: Project Integrity, Security, and Roadmap Reconciliation

## Goal

Bring Mistake Watch's security, runtime readiness, database history, tests, and
documentation back into one verified state before new product work continues.

## Why It Matters

The recent modularization and live QA proved that the core room experience is
working, but the project audit found several boundaries that are weaker than the
UI implies. The user wants these handled in manageable batches without repeating
an approval loop for every basic correction.

## Confirmed Work

- Make `owner_only` uploaded media object-private rather than metadata-private.
- Preserve authorized room playback through short-lived playback sessions.
- Fix fresh-room create/connect readiness before the Watch layout mounts.
- Reconcile local and Supabase migration history without replaying live DDL.
- Strengthen health/readiness checks without leaking infrastructure details.
- Add aggregate, route-level, browser, and behavior-oriented test foundations.
- Fix the Add Media playlist selection-key mismatch.
- Review Supabase advisor findings and production dependency advisories.
- Condense and correct README, HANDOFF, migration, and task-status documentation.
- Restore missing roadmap objectives for recommendation intelligence, Add/Discover,
  Watch discovery, YouTube account data, and AI DJ.

## Constraints

- Do not expose permanent private R2 URLs to clients.
- Do not break guest playback of an uploaded item already started by an authorized user.
- Do not grant guests or non-authorized accounts uploaded catalogue access.
- Do not replay an already-applied production migration.
- Do not accept the audit-suggested Next.js downgrade.
- Do not implement the future recommendation brain, provider-account features,
  AI DJ, Add/Discover redesign, or Spatial Cinema in this cleanup task.
- Keep releases migration-first where a code path depends on new database state.

## Execution Preference

Use two agents for disjoint implementation lanes. Continue through ordinary
local batches without repeated approval prompts, but stop before cloud migration,
production deployment, or a material security-contract change that was not
captured in this packet.
