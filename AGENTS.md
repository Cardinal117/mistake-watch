# AGENTS.md

## Project

Mistake Watch

Mistake Watch is a polished, room-based watch/listen website for synchronized direct media playback, host-led music queues, and a later shared remote browser mode.

## Source Of Truth

- Use `docs/tasks/TASK-002-incomplete-work-recovery/` as the current recovery roadmap for unfinished and partially completed work from TASK-001.
- Use `docs/tasks/TASK-001-watch-together-platform/` as historical MVP context and the original planning source for completed foundation work.
- Use `docs/HANDOFF.md` and `docs/COMMANDS.md` for current handoff state, required commands, production URLs, environment expectations, and the next-task pointer.
- Read the task packet before implementing product, architecture, realtime, Supabase, UI, or deployment changes.
- When a `DESIGN.md` exists, treat it as the visual source of truth for UI, CSS, layout, components, animation, and responsive behavior.

## Workflow

- Follow the spec-first workflow for large, ambiguous, cross-cutting, realtime, database, media, browser, or design-heavy work.
- Do not expand scope silently. Update the task packet first when new requirements change product behavior, architecture, data models, permissions, or phases.
- Keep implementation aligned to the current approved task slice in `tasks.md`.
- Prefer small, reviewable implementation slices with clear QA evidence.
- Treat Markdown task files as the durable source of truth, and use HTML review artifacts as companion review surfaces when they improve comprehension.
- Do not create decorative HTML artifacts for tiny tasks. Use them for UI milestones, architecture decisions, implementation handoff, QA readiness, or complex risk review.

## Skill Checkpoints

- Use `spec-first-workflow` when creating or changing product scope, architecture, data models, feature phases, or task packets.
- Use `approved-task-implementation` when implementing an approved task from `docs/tasks/TASK-002-incomplete-work-recovery/tasks.md`. Use TASK-001 task text only as historical context when a TASK-002 subtask references it.
- Use `design-md-enforcer` for UI, CSS, layout, component, animation, responsive, or visual review work.
- Use `html-spec-artifact` for HTML review artifacts, implementation reports, QA reports, stakeholder summaries, decision dashboards, or visual task reviews when available.
- Use `supabase:supabase` for any Supabase database, auth, storage, RLS, migration, Edge Function, or client integration work.
- Use `browser:browser` after meaningful frontend UI changes when a local URL is available and visual/interaction verification is needed. The local app URL is `http://127.0.0.1:5371` unless changed deliberately.
- Use `qa-release-gate` before release readiness, final task review, or commit preparation.
- Use `git-commit-assistant` only after QA passes and the user asks for commit preparation.

## Current Product Decisions

- Build guest-first for an early friends-and-family release.
- Use Supabase for database and auth.
- Use Vercel for the frontend.
- Use SpacetimeDB as the live room-state and sync authority instead of a hand-rolled Node/WebSocket service.
- Use direct media URLs and HLS streams for the first media MVP.
- Prefer YouTube as the first provider integration after direct media; keep Spotify out of scope.
- Use Cloudflare R2 as the chosen object storage direction for owner-uploaded raw media files and HLS assets.
- Keep Google Cast as a later playback-device integration.
- Keep shared remote browser mode as phase two.
- Host controls playback.
- Guests can add queue items by default.
- Host can remove, reorder, and clear queue items.
- Host should have per-user permission toggles for queue, playback, and later browser-control capabilities.
- Later queue collaboration should support voting/approval modes, including a 75% progress suggested-next-song moment.

## Architecture Guardrails

- Use a room-authoritative sync model. SpacetimeDB owns canonical live playback state, queue state, permissions, presence, and control ownership.
- Do not rely on Supabase Realtime alone for low-latency media sync. Use SpacetimeDB reducers and subscriptions for live room events.
- Keep Supabase as the durable source of truth for rooms, guest identities, memberships, settings, permissions, and queue data.
- Keep large media files out of Supabase Postgres. Use Cloudflare R2 for uploaded media objects, while Supabase stores metadata, ownership, room attachment, and access records.
- Keep the Supabase/SpacetimeDB boundary explicit: Supabase stores durable product data; SpacetimeDB owns ephemeral, latency-sensitive room sessions and may mirror selected durable IDs.
- For Supabase schema/auth/RLS work, check current Supabase documentation, use migrations for DDL, document RLS intent before applying policies, and run security/performance advisor checks after schema changes when project access is available.
- Treat browser mode as a separate subsystem with isolated workers, resource limits, cleanup, and abuse controls.
- Do not claim or imply support for DRM-protected or restricted third-party playback unless it is technically and legally verified.

## UI Guardrails

- The room experience is the primary product surface. Do not start with a marketing landing page unless explicitly requested.
- Prioritize the media stage, transport controls, source input, queue, participants, and sync status.
- Keep controls compact, stable, accessible, and responsive.
- Avoid adding visual styles, colors, motion, or layout conventions that conflict with `DESIGN.md` once it exists.

## QA Expectations

- Add tests proportional to risk.
- Realtime sync math, queue reducers, permissions, and room events should receive focused tests.
- Frontend changes that affect layout or interactions should be checked across desktop and mobile.
- After major UI milestones, run `npm run typecheck`, `npm run lint`, `npm run build`, and a browser visual check on `http://127.0.0.1:5371` when the dev server is available.
- For dashboard, room, listen-mode, and other visual milestones, create or update `implementation-report.html` or `qa-report.html` only when the report makes review easier than Markdown alone.
- Before commit or handoff, use the QA/release checklist from the task packet and document blockers clearly.

## Git And Handoff

- Do not stage, commit, or push unless the user explicitly approves.
- Once a git repository exists, use report-first commit prep through `git-commit-assistant` after QA passes.
- If no git repository exists, report that limitation before commit prep and keep task summaries in the task packet.
