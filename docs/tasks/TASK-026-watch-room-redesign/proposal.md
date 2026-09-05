# TASK-026: Watch room browsing and cinema

Status: implemented and owner-accepted after physical-phone production QA, 2026-09-05; final Git integration authorized.

Build the agreed Watch room with persistent left player, artwork-led browsing, collections, media details, independent Queue/Social/Add/More workspaces, Cinema view, and responsive mobile dock. Implements the Watch portion of TASK-002.10F, aligned to the TASK-025 navigation/dock contract.

No table schema/auth/R2 delivery changes, Listen redesign, provider-account integration, new recommendation algorithm or subscriptions. The later approved autoplay refinement adds prepare/start reducers while preserving existing reducer arguments and room authority. Reuse real catalogue, room queue/history, Add Media, permissions and media-session contracts. No fake shelves or new season/resume metadata. Initial approval covered local work only; the integration and release authorization below supersedes that original release boundary.

Risk: layout transitions can restart media or conceal provider controls; catalogue cards can bypass existing permissions; growing shelves can regress performance. Protect with actual component/browser tests and existing regression suites. A full packet is appropriate for this substantial stateful redesign.

## Integration and release authorization — 2026-09-05

The owner approved reconciling the deployed playback fixes, local real-backend testing with two participants, an isolated shareable deployment, release after acceptance, and final main deployment checks. Local integration comes first. Production credentials may be copied into a Git-ignored local QA environment; never print or commit them. Physical-device and long private-media tests remain explicit gates, not claims inferred from emulation.

Reconciled the redesign onto origin/main f84a775 (merged PR #11). Retained the pre-integration stash as a recovery copy. The only conflict was DirectMediaPlayer: preserve main's player fixes and add only the Watch-owned fullscreen wrapper guard. Uncommitted Media Session/performance work in the original checkout is outside this candidate.

Vercel env export returns placeholders for protected secrets. Local QA therefore uses the existing local configuration: real Supabase and a local SpacetimeDB service. The private R2 gateway must be verified on HTTPS with deployment-provided protected values. No auth boundary or gateway lifetime is relaxed for testing.


## Accepted release - 2026-09-05

Owner physical Huawei Y9 Prime QA passed: "This is perfect, I will pass QA, it all works as requested." The owner explicitly approved documentation, atomic commits, push/PR merge to main and final production deployment. This supersedes the temporary-window restoration requirement: retain the accepted candidate while completing Git integration. Earlier limitations and deployment states below are chronological evidence, not the current release status.

Accepted application tree: `0fb144fd9569146eb808f477180c5835249508cc`; Vercel `dpl_8ayFXZG5sE2fUoR2W2iZk2z5MmuG`. The additive prepared-YouTube backend is deployed. See [release summary](release.md) and [bug reconciliation](bug-reconciliation.md). Final Git/deployment identifiers will be recorded in the release summary after merge.
