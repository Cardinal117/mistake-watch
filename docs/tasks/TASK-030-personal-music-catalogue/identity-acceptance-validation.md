# 030.12c Identity acceptance validation — 2026-09-11

## Decision

The current matcher is suitable for a provisional-only shadow pilot. It is not
validated for accepted recording links or strict-theme ranking. No manual listening
confirmation UI is required. Normal playback and first-party recommendations continue.
This slice changes offline evaluation and documentation only: no provider requests,
hosted migrations, activation, account writes or deployment.

## Evaluation contract

Freeze `exact-credit-version-duration-v1` before measuring a holdout. Run:

```powershell
node scripts/evaluate-recording-matches.mjs <private-evaluation.json>
node --test tests/recommendations/identity-evaluation.test.mjs
```

Input is `{ now, kind, cases }`. Cases retain `source`, `candidates`, `complete`.

- `observational` (default): no labels; measures behaviour on the selected sample.
- `synthetic`: each case has `expectedMbid` (valid ID or null for abstention).
  Exercises boundaries; never contributes to real-song precision.
- `independent`: each case has `expectedMbid` and `labelEvidence`, a private
  reference explaining independently established recording/version identity.
  Search score, returned candidate and hydration are not independent truth.

For independent labels, null means independently justified abstention, never an
unknown or unreviewed identity. Keep unreviewed sources in the observational set.

Duplicate source IDs are rejected. Reports contain aggregates, never source titles,
IDs or label references. Correct abstentions and missed identities are separate.
The tool requires provenance but cannot verify the author's independence claim.
Keep private inputs ignored and expire source metadata on its existing schedule.
Historical replay uses the recorded evaluation time, not proof of present freshness.

Only independent samples report precision. With zero observed errors the tool also
reports the exact one-sided 95% binomial lower bound `0.05^(1/n)`. This assumes
representative independent sampling: 299 correct provisional outcomes with zero
errors puts that bound just above 99%. Correlated songs/artists, selected successes
and tuning against the holdout weaken that interpretation. The tool never authorizes
promotion, regardless of score or sample size.

## Measured results

Saved MusicBrainz replay: **10 unique sources, 4 provisional, 6 unresolved, zero
independent labels**. These are selected successful provider responses. The 40%
sample provisional rate is neither overall catalogue coverage nor identity accuracy.
Five abstentions lacked sufficient agreement; one lacked the artist-name heuristic.

Ten synthetic version cases: one correct provisional result, seven correct
abstentions and two deliberately exposed false provisional identities. Safeguards
reject explicit cover/live versions, another Classical performer, phonk slowed
title or duration mismatch, instrumental versions and unrelated artist credits.
Known failures are an unmarked rerecording with otherwise identical metadata and
artist credits whose separators collapse under punctuation normalization. These
are limitations recorded by passing characterization tests, not ten successful
identity decisions. No real-song accuracy is inferred from this set.

Independent review also confirmed: a Topic suffix is not verified channel ownership;
empty disambiguation is absence of information; a complete search response is not
proof every plausible recording exists in that response. Strict collaboration
credits miss legitimate matches. Do not loosen the rule to improve sample rate.
A future rule revision needs regression evidence, fresh holdout and new rule keys.

## Next controlled shadow pilot

Use the existing single configured account, disabled-by-default flag and durable
budgets. Apply prerequisite migrations before publishing the maintenance caller.
Verify the release excludes the superseded manual-confirmation product flow; the
dirty checkout contains older local work needing scoped release review.

Observe one initial catalogue pass rather than repeating broad provider searches.
Record aggregate admission/completion counts, retry/abstention reasons, requests and
feature availability; retain source-level provenance privately. Verify account-bound
claims, unchanged accepted links/ranking, reload survival and withdrawal/expiry
fencing. Existing isolated SQL/concurrency tests prove local contracts; hosted
smoke checks remain necessary.

Pause on any privacy/accepted-link mutation, stale result exposure or budget violation.
Provider unavailability must cause bounded retries and normal playback. Disable
the flag to stop new processing; preserve cleanup. Compare with an independently
verified version-sensitive holdout before accepting identities. Fantasy/orchestral
ranking follows supported recording-level evidence, with Classical and phonk as
boundaries. Artist tags and classifier scores never become certain genres.

## QA

Eight evaluation tests pass, including the ten-case characterization benchmark.
Initial execution failed on the absent module, not behavioural assertions: this is
contract-first/post-implementation verification, not a behavioural red gate.
Private offline replay produced the counts above. Independent review approved only
the provisional shadow scope and identified the limitations recorded here.
Review also identified malformed JSON errors exposing private input excerpts. An
actual subprocess regression reproduced this before generic parse/read errors fixed
it. This privacy regression has behavioural red/green evidence.

Final regression suite: 244 recommendation/YouTube tests pass. Typecheck and
changed-file ESLint pass. No runtime/UI/schema change in this slice, so the prior
durable-worker build/SQL evidence was not rerun or represented as a new live check.
