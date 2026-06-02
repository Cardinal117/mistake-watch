# TASK-002 Proposal: Incomplete Work Recovery

## Problem

Mistake Watch has a strong working foundation, but the project has moved quickly across UI polish, sync behavior, playlist import, deployment, avatars, and listen-mode refinements. Several planned TASK-001 items are either incomplete, partially complete, or intentionally deferred.

Without a new ordered recovery packet, future implementation could keep jumping between visible polish, provider features, accounts, media storage, and hardening. That would make regressions more likely and make it harder to know what "current task" means.

## Goal

Create a single, ordered source of truth for unfinished TASK-001 work:

- Preserve the exact recovery order.
- Keep every future implementation bounded to one approved subtask.
- Separate partially complete polish from large future systems.
- Avoid re-litigating the same ordering decisions after each task.

## User Value

The user gets a stable implementation path that completes missing work in the right sequence while protecting existing watch/listen sync, queue behavior, permissions, and deployment stability.

## Scope

TASK-002 covers:

- Listen-mode quality pass.
- Live room chat.
- Seamless next-item loading and preload.
- YouTube availability hardening for embed-blocked, unavailable, restricted, or runtime-failed videos.
- Provider recommendations.
- Real audio-reactive waveform architecture.
- Avatar motion polish.
- Cloudflare R2 uploads.
- Voting and suggested-next queue collaboration.
- Accounts, friends, and friend invites.
- Shared browser prototype.
- Hardening and abuse controls.
- Final QA and release gate.

## Not In Scope

This packet does not itself implement product code. Each numbered TASK-002 subtask must be approved and implemented separately.

This packet also does not replace `TASK-001` as historical context. TASK-001 remains useful for understanding the original MVP and past implementation decisions.

## Success Criteria

- `tasks.md` gives a clear ordered sequence from TASK-002.1 through TASK-002.13.
- Each subtask has enough boundaries to prevent scope creep.
- Acceptance criteria make it clear when a subtask is complete.
- `review.html` gives a fast first-open status view for the recovery roadmap.
- Future agents can answer "current task" from TASK-002 without guessing.

## Risks

- Some later tasks, especially R2, accounts/friends, shared browser, and hardening, may require separate deeper design packets before implementation.
- Real audio-reactive waveform work has provider limitations because YouTube iframe audio cannot be sampled directly.
- YouTube availability can reduce failed playback but cannot guarantee every third-party video is playable in an embedded room.
- Provider recommendations must remain honest and avoid fake "personalized" data before accounts exist.
- Chat and notifications must not leak room data between rooms or users.
