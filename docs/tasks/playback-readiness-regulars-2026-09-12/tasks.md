# Implementation sequence

- [x] Inspect existing authority, startup, correction and clock code.
- [x] Record approved playback/UI scope before source changes.
- [x] Reproduce clock gate and native repeated-seek failures in regression tests.
- [x] Fix command identity, bounded clock sampling and native correction.
- [x] Extend manual YouTube readiness with server-side stale-command fencing.
- [x] Add timeout, autoplay-disabled and nonzero-resume regression coverage.
- [x] Complete Regulars UI and desktop/mobile interaction QA.
- [x] Independent GPT-5.6 medium review and resolve material findings.
- [x] Final verification report and handoff: [qa.md](qa.md).

Release: commit/push and server publish complete; clean frontend QA candidate ready.
Live-domain promotion awaits explicit approval after automatic review rejection.
See [release receipt](release.md).
