# TASK-002 Review Notes

## Current Status

Status: TASK-002.2 implemented.

TASK-002.1 Listen Mode Quality Pass is complete pending manual visual review in a live room.

TASK-002.2 Room Chat is implemented pending manual two-client browser QA in a live room.

Baseline handoff docs now exist at `docs/HANDOFF.md` and `docs/COMMANDS.md` so future agents can continue from TASK-002 without relying on chat memory.

## Canonical Next Task

Next implementation task: TASK-002.3 Seamless Next Item Loading.

## Decisions Locked

- TASK-002 is the recovery roadmap for incomplete TASK-001 work.
- TASK-001 remains historical context and original MVP background.
- Work proceeds in numeric TASK-002 order unless the user explicitly changes it.
- Each subtask needs a focused implementation report after completion.

## Important Assumptions

- Existing working systems are preserved by default.
- Chat comes before recommendations because it is a clear missing room feature.
- R2, voting, accounts/friends, shared browser, and hardening are later system-level tasks.
- Real waveform work must be technically honest: direct/HLS/R2 sources can support real analysis, YouTube iframe sources cannot be sampled directly.
- Provider recommendations must not fake personalized or trending data.

## Risks To Watch

- TASK-002.1 may touch visible listen-mode UI and must avoid remounting or interrupting playback.
- TASK-002.2 adds realtime message state and must avoid cross-room leakage.
- TASK-002.3 can accidentally mutate playback if preload logic is not isolated.
- TASK-002.4 can drift into fake recommendation content if provider data is unavailable.
- TASK-002.7 and TASK-002.9 likely need extra Supabase, Cloudflare, and security review before implementation.
- TASK-002.10 requires stricter isolation than normal UI work because browser mode can become resource-heavy and abuse-prone.

## Implementation Rule

When the user says "proceed", implement only the next incomplete TASK-002 subtask unless they name a different TASK-002 number.

## TASK-002.2 Implementation Notes

- Added a public SpacetimeDB `room_chat_message` table scoped by `room_id` with a room/created index.
- Added the `send_room_chat_message` reducer with participant ownership checks, room-scoped idempotency through `room_id:client_message_id`, empty/invalid message rejection, 500-character normalization, sender display metadata, avatar key, and host-role snapshotting.
- Added chat rows to room subscriptions and live snapshots so messages only stream for the current room.
- Replaced the Chat tab placeholder with a live room chat panel.
- Chat UI now shows sender avatar, display name, host/guest role, host crown state, timestamp, and sent/sending/failed state.
- Local sends are optimistic and can be retried when failed. Confirmed SpacetimeDB messages replace matching pending messages by `clientMessageId`.
- Chat history remains ephemeral in SpacetimeDB; no durable Supabase chat history, moderation, accounts, friends, or notification systems were added.

Verification:

- `npm run test:spacetime` passed.
- `npm run typecheck` passed.
- `npm run lint` passed after removing an unnecessary effect-state update.
- `npm run build` passed.
- `spacetime build` passed.
- `spacetime generate` passed after installing root and `spacetime/` dependencies.
- Local SpacetimeDB publish to `http://127.0.0.1:5372` succeeded for database `mistake-watch-rooms`.
- Local Next health check returned HTTP 200 at `http://127.0.0.1:5371/api/health`.
- Vercel production deploy succeeded with deployment URL `https://mistake-watch-jhlrp0kk2-cardinal117s-projects.vercel.app`.
- Production aliases `https://mistake-watch.vercel.app/api/health` and `https://watch.mistakestudios.com/api/health` both returned HTTP 200.

Manual review pending:

- In-app Browser automation was still blocked by a runtime setup failure in the Codex environment (`windows sandbox failed: spawn setup refresh`).
- A headless Edge fallback loaded `http://127.0.0.1:5371` successfully and confirmed the dashboard renders.
- Live room QA is currently blocked because the local dev server has no `.env.local`; the dashboard reports `Supabase-backed rooms are unavailable: Missing required environment variable: SUPABASE_SECRET_KEY`.
- Manual QA still needs two clients in one room exchanging messages live.
- Manual QA still needs a cross-room leakage check with two different room IDs.
- Manual QA should verify failed send/retry behavior by disconnecting or stopping the local SpacetimeDB server.

## TASK-002.1 Implementation Notes

- Listen queue drawer now has persisted Compact, Standard, and Tall height controls.
- Listen queue drawer now shows current item position over total queue size where the old total-only count appeared.
- Listen dynamic theming is stronger through additional active theme CSS variables, stronger ambient radial layers, and a more visible artwork-driven backdrop.
- Listen playlist import now opens a review overlay with select-all, per-item selection, Add All, and Add Selected actions before queue mutation.
- Listen center waveform bars now use the active listen theme variable instead of a fixed amber-only treatment.
- Playback, queue reducer semantics, and SpacetimeDB authority were not changed.
- Follow-up revision replaced the preset drawer height buttons with a generous persisted height slider.
- Follow-up revision derives the listen theme from the current artwork thumbnail when browser image sampling is available, with a warm non-blue fallback when sampling is blocked.
- Follow-up revision moves the dominant page gradient origin to the left player/artwork side instead of keeping a constant blue wash across the page.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:queue` passed.
- `npm run test:youtube` passed.
- `npm run build` passed.

Manual review pending:

- Browser visual QA for listen-mode drawer height controls and playlist overlay. A local dev-server browser check was attempted, but the local Next/Turbopack dev server hit a stale lock/process issue during background startup. Production build still passed.
