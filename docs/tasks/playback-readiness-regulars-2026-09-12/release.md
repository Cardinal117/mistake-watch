# Release receipt — 12 September 2026

Source commit: `484ed51` (`fix(playback): stabilize startup sync and refine regulars browsing`).
Pushed as fast-forwards to `origin/main` and
`origin/codex/task-030-personal-music-catalogue`.

## Server: live

Published the prepared-playback reducer change to `mistake-watch-rooms` on
`https://maincloud.spacetimedb.com` with `--delete-data=never --yes=remote`.
The CLI reported no breaking migration and updated the existing database.
Bindings were regenerated with no source diff; frontend typecheck passed.
The change is compatible with the previous frontend. No room data was deleted.

## Frontend: QA candidate ready; main domain promotion blocked

- Deployment: `dpl_GZ8EAxwgi53zv7WeW2kDijEVLH5z`.
- URL: https://mistake-watch-2ckz9b07r-cardinal117s-projects.vercel.app
- Project: `cardinal117s-projects/mistake-watch`.
- Built with production settings and `--skip-domain`; build and TypeScript passed.
- Candidate `/api/health`: 200, `ok:true`.
- Candidate `/api/ready`: 200, SpacetimeDB/Supabase ready.
- The clean export excludes recording-review UI/API/routes and `.env.local`.
  The two previously mixed UI files match committed code after CRLF normalization.
  The candidate build route list excludes `/api/recommendations/recording`.
- Existing uncommitted recording-review changes remain preserved in the worktree.

Automatic approval review initially rejected candidate deployment over scope/order
concerns. Explicit clean-export checks and publishing the compatible server first
resolved those concerns. Vercel required an explicit team scope for authorization.

The later `vercel promote` request was separately rejected: automatic review
interpreted the owner's approval as QA deployment authorization, not permission
to change live production routing. No alternate promotion was attempted.
`watch.mistakestudios.com` therefore remains on the previous frontend deployment
`dpl_BpV2kLTP7yHdrtuQFPfsKQPPPzpb`; explicit owner approval to promote this exact
candidate is the remaining release gate. After approval, promote, read back live
health/readiness and verify the excluded route stays unavailable.
