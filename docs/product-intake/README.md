# Mistake Watch Product Intake

This folder is a repository-owned Obsidian vault for bugs, feature requests,
quality-of-life ideas, operational work, and observations. It keeps capture fast
for the owner while preserving enough evidence for reliable planning and QA.

Open `docs/product-intake/` as an Obsidian vault. Start at [[INBOX]] for capture
or [[INDEX]] for the triaged backlog.

## Owner Workflow

1. Add any new report beneath **Quick Capture** in `INBOX.md`.
2. Write naturally. IDs, formatting, links, and classification are optional.
3. Tell Codex: `Triage the product inbox.`
4. Review the proposed priority and next action before implementation starts.

Do not wait for an existing task ID or search the roadmap before capturing a
finding. Capture first; triage later.

## Agent Contract

When asked to triage, plan work, choose the next task, or close QA:

1. Read this file, `INBOX.md`, and `INDEX.md`.
2. Preserve the owner's Quick Capture text before restructuring it.
3. Allocate the next immutable ID in the matching category.
4. Classify the entry, check for duplicates, and link related tasks or entries.
5. Separate observed behavior from inferred causes.
6. Recommend priority using impact and evidence; do not silently override the
   owner's product priority.
7. Do not implement a triaged entry without explicit approval.
8. After implementation and QA, add evidence and move completed item files to
   `archive/`, then record them in `ARCHIVE.md` without reusing their IDs.

Never delete an unresolved owner report. If an entry is superseded, retain it
with a link to the replacement.

## Stable IDs

| Prefix    | Use                                                   |
| --------- | ----------------------------------------------------- |
| `MW-BUG`  | Incorrect or unreliable existing behavior             |
| `MW-FEAT` | New product capability                                |
| `MW-QOL`  | Usability or workflow improvement                     |
| `MW-OPS`  | Provider, credential, deployment, or operational work |
| `MW-OBS`  | Evidence that is not yet actionable                   |

IDs use three digits and never change after assignment, for example
`MW-BUG-005`.

## Statuses

- `Inbox`: captured but not triaged.
- `Needs verification`: current behavior or implementation state is unclear.
- `Needs reproduction`: a bug report needs a controlled reproduction.
- `Confirmed`: evidence establishes the behavior and boundary.
- `Ready for planning`: requirements are clear enough to scope.
- `Planned`: linked to an approved or existing task direction.
- `In progress`: implementation is active.
- `Blocked`: an external dependency prevents progress.
- `Resolved`: implementation and required QA passed.
- `Not planned`: intentionally declined, with a reason retained.

## Priority Guide

- `P0`: active security, data-loss, uncontrolled-cost, or availability incident.
- `P1`: major broken workflow, privacy risk, synchronization failure, or release
  blocker.
- `P2`: meaningful usability or reliability improvement.
- `P3`: useful future capability or polish.

Priority is a recommendation until the owner approves scheduling.

## Documentation Levels

### Inbox-only

Use for a small, localized fix with an established architecture and focused
tests. The intake entry, code/tests, QA evidence, and Git history are sufficient.

### Compact task (default)

Use one `task.md` for bounded work that needs explicit scope and acceptance
criteria. Include objective, scope, exclusions, decisions, implementation
steps, risks, acceptance criteria, and evidence.

### Full packet

Use the established multi-file packet for security/privacy boundaries,
database migrations or RLS, realtime authority, costly providers, major UI
redesigns, or multi-release work.

HTML artifacts are optional. Create one only for an explicit request or when a
visual comparison, complex decision, stakeholder review, or QA dashboard is
materially easier to understand than Markdown.

## Portable Vault Rules

- Track this README, the inbox/index/item Markdown, templates, appearance
  settings, and CSS.
- Ignore workspace layout, caches, plugin state, and device-specific files.
- Keep the vault dependency-free; no community plugin is required.
- Copy this folder and update project-specific prefixes/design tokens to reuse
  the workflow in another repository.
