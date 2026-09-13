# Mode icon visibility correction — 13 September 2026

Owner reported that Watch/Listen loading did not visibly transition from the outgoing mode icon to the destination icon.

The existing aperture began its 650ms animation on mount while CSS hid the mark for the first 150ms. By first visibility the closing blades already obscured the source symbol. Mount the mark only when the grace ends, retaining the reserved space and existing source/destination props. Readiness, completion, playback and reduced-motion behavior remain unchanged; fast transitions still need not wait for an animation.

Test-first browser regression failed before the fix: first visible blade angle was 18.43 degrees from open (expected less than 1). The same check passed after the fix and verifies outgoing and destination symbols in both directions. A separate first green attempt hit a test-clock past-time setup error; the clock setup was corrected without changing the behavioral assertion.

Verification: 16 loading browser checks passed, including desktop/mobile sizing, hidden/reduced motion, timeout/recovery and nonblocking completion. Twenty brand/transition unit checks, TypeScript and scoped ESLint passed. Source and destination screenshots were visually inspected. Evidence: `.tmp/room-mode-icon/`, `.tmp/room-mode-icon-green-2`, `.tmp/room-mode-icon-regression`. This is local fixture evidence; no live room was mutated.

Only the screen, regression test and this note belong to the fix. Unrelated recording-review work remains excluded. Existing owner approval covers scoped Git and deployment after QA.

Production: implementation `aa769e1` pushed to main and the task branch. Clean-export Vercel build and candidate readiness passed; deployment `dpl_6gsekp6sDWCZNYGHNftGXC8iAtEQ` promoted. Custom-domain inspection confirms this Ready deployment. Live health/ready return 200; development loading and excluded recording-review routes return 404. No database or Spacetime publish. Refresh existing clients for the correction.
