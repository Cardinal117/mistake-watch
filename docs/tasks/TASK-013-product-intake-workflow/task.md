# TASK-013: Product Intake Workflow

Status: Implemented
Documentation level: Compact task
Updated: 2026-08-17

## Objective

Replace the root freeform findings file with a portable Obsidian product-intake
vault that lets the owner capture notes immediately and lets agents triage them
later without losing wording, evidence, or history.

## Scope

- Add a repository-owned `docs/product-intake/` Obsidian vault.
- Preserve the complete legacy findings file in the intake archive.
- Triage every imported report into a stable, indexed record.
- Add repository instructions that make intake review and maintenance mandatory.
- Introduce three proportional documentation levels: inbox-only, compact task,
  and full packet.
- Make HTML review artifacts opt-in rather than a default deliverable.
- Add a reusable Codex intake-triage skill and align the existing spec-first,
  implementation, QA, and commit skills with the new policy.

## Exclusions

- No product bug or feature implementation.
- No database, API, authentication, or deployment change.
- No automatic prioritization that bypasses owner approval.
- No automatic staging, committing, or pushing.

## Decisions

- `INBOX.md` is the owner capture and active triage surface.
- Original imported wording remains available in a dated archive file.
- IDs are immutable and category-prefixed: `MW-BUG`, `MW-FEAT`, `MW-QOL`,
  `MW-OPS`, and `MW-OBS`.
- Agents may classify, deduplicate, link, and recommend priority, but must not
  implement an entry merely because it was triaged.
- Full task packets remain appropriate for security, privacy, migrations,
  realtime authority, costly providers, major redesigns, and multi-release work.

## Implementation

1. Create the vault operating guide, inbox, archive, template, and portable
   Obsidian appearance configuration.
2. Import and triage all legacy reports without dropping the source wording.
3. Link the intake checkpoint from `AGENTS.md`, README, handoff, and roadmap.
4. Add `product-intake-triage` and update the workflow skill family.
5. Validate Markdown links, JSON, skill metadata, file scope, and Git diff.

## Risks

- **Owner text loss:** Preserve the complete UTF-8 source before removing the
  root text file and compare it byte-for-text before migration completion.
- **Conflicting workflow defaults:** Update and validate the whole routed skill
  family, including reference templates and agent metadata.
- **Inbox concurrency:** Permit only one writer for the inbox and index while
  allowing read-only review and disjoint implementation work.
- **Editor state churn:** Track only approved portable Obsidian configuration
  and ignore device, plugin, workspace, graph, and hotkey state.

## Acceptance Criteria

- The owner can add unstructured notes beneath the Quick Capture marker.
- An agent can find the operating rules without conversation history.
- Every imported report has a stable ID, status, priority, area, and next action.
- The confirmed cross-device Like UI gap is linked to TASK-011 without claiming
  that the separate durable persistence proof is complete.
- Device-specific Obsidian state is ignored while the design snippet is tracked.
- Compact work no longer requires a generated HTML artifact.
- Existing full packets remain valid and readable.
- No application source file changes.

## Verification Evidence

- Legacy migration comparison passed before removing the root text file: all
  9,066 UTF-8 source characters matched the archived payload exactly.
- The vault contains 15 unique stable IDs derived from all 14 reports; the VR
  report was intentionally split so its privacy-notice request remains visible.
- Obsidian JSON parsed, item IDs were unique, and local links resolved.
- Changed authored vault/task files passed Prettier; the immutable legacy import
  is intentionally excluded from formatting.
- All seven created or changed Codex skills passed the official skill validator
  after installation.
- `npm test`: 324 passed, 0 failed.
- Typecheck, ESLint, production build, file-length policy, and
  `git diff --check` passed. Existing file-length warnings did not increase and
  no application source file changed.
- Independent agent QA found a stale HTML-default reference, an overbroad Like
  persistence claim, three undeclared statuses, a missing Risks section, and
  incomplete Obsidian state ignores. All were corrected and revalidated.
