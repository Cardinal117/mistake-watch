// Offline benchmark only. Never imports a provider, database client or environment.
import {
  IDENTITY_RULE,
  matchRecording,
  type SourceSnapshot,
} from "./automatic-identity";
import { MBID, type RecordingCore } from "./musicbrainz-core";

type EvaluationCase = {
  source: SourceSnapshot;
  candidates: RecordingCore[];
  complete: boolean;
  expectedMbid?: string | null;
  labelEvidence?: string;
};
type Evaluation = {
  now: number;
  kind?: "observational" | "synthetic" | "independent";
  cases: EvaluationCase[];
};

export function evaluateIdentity(input: Evaluation) {
  const kind = input?.kind ?? "observational";
  if (
    !input ||
    !Number.isFinite(input.now) ||
    !Array.isArray(input.cases) ||
    input.cases.length > 1000 ||
    !["observational", "synthetic", "independent"].includes(kind)
  )
    throw Error("Invalid evaluation");
  const seen = new Set<string>();
  const summary = {
    rule: IDENTITY_RULE,
    kind,
    total: input.cases.length,
    provisional: 0,
    unresolved: 0,
    labelled: 0,
    correctProvisional: 0,
    wrongProvisional: 0,
    correctAbstentions: 0,
    missedIdentities: 0,
    reasons: {} as Record<string, number>,
  };
  for (const item of input.cases) {
    if (
      !item ||
      !item.source ||
      typeof item.source.mediaId !== "string" ||
      !/^[\w-]{11}$/.test(item.source.mediaId) ||
      typeof item.source.title !== "string" ||
      typeof item.source.channel !== "string" ||
      typeof item.complete !== "boolean" ||
      !Array.isArray(item.candidates) ||
      item.candidates.some((c) => !c || typeof c !== "object")
    )
      throw Error("Invalid case");
    if (seen.has(item.source.mediaId)) throw Error("Duplicate source");
    seen.add(item.source.mediaId);
    const labelled = Object.hasOwn(item, "expectedMbid");
    if (kind === "observational" && labelled)
      throw Error("Observational cases cannot have labels");
    if (kind !== "observational" && !labelled) throw Error("Missing label");
    if (
      labelled &&
      item.expectedMbid !== null &&
      (typeof item.expectedMbid !== "string" || !MBID.test(item.expectedMbid))
    )
      throw Error("Invalid label");
    if (
      kind === "independent" &&
      (typeof item.labelEvidence !== "string" ||
        item.labelEvidence.trim().length < 20 ||
        item.labelEvidence.length > 2000)
    )
      throw Error("Independent label requires provenance");
    const result = matchRecording(
      item.source,
      item.candidates,
      item.complete,
      input.now,
    );
    summary[result.status]++;
    if (result.status === "unresolved")
      summary.reasons[result.reason] =
        (summary.reasons[result.reason] ?? 0) + 1;
    if (labelled) {
      summary.labelled++;
      if (result.status === "unresolved") {
        if (item.expectedMbid === null) summary.correctAbstentions++;
        else summary.missedIdentities++;
      } else if (
        result.recording.mbid.toLowerCase() === item.expectedMbid?.toLowerCase()
      )
        summary.correctProvisional++;
      else summary.wrongProvisional++;
    }
  }
  const evaluated = summary.correctProvisional + summary.wrongProvisional;
  const independent = kind === "independent" && evaluated > 0;
  return {
    ...summary,
    sampleProvisionalRate: summary.total
      ? summary.provisional / summary.total
      : null,
    independentPrecision: independent
      ? summary.correctProvisional / evaluated
      : null,
    // Exact one-sided 95% binomial lower bound, only for the zero-error case.
    // Valid interpretation still requires representative independent sampling.
    zeroErrorPrecisionLowerBound95:
      independent && summary.wrongProvisional === 0
        ? Math.pow(0.05, 1 / evaluated)
        : null,
    promotionAllowed: false,
    note: "Provisional outcomes are not accepted links. Sample coverage is not catalogue coverage. Label provenance is asserted by the evaluator author, not verified by this tool. Confidence assumes representative independent samples; synthetic tests cannot establish real-song accuracy.",
  };
}
