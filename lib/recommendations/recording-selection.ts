export type ClassificationEvidence = {
  id: string;
  recordingId: string;
  accountId: string;
  facet: "theme" | "instrumentation" | "genre" | "mood";
  value: string;
  polarity: "supports" | "excludes";
  status: "accepted" | "disputed" | "withdrawn";
  origin: "owner_reference" | "synthetic";
  reference: string;
  license: string;
  reviewedAt: number;
  expiresAt: number;
};

export type RecordingCandidate = {
  sourceId: string;
  recordingId: string;
  accountId: string;
  revision: number;
  linkStatus: "accepted" | "disputed" | "unresolved";
  exactVersion: boolean;
  available: boolean;
  suppressed: boolean;
  metadataExpiresAt: number;
  liked: boolean;
  plays: number;
  lastPlayedAt: number | null;
  evidence: ClassificationEvidence[];
};

export function selectRecordingTrial(
  candidates: RecordingCandidate[],
  options: {
    accountId: string;
    now: number;
    limit: number;
    strict: boolean;
    fixtures?: boolean;
  },
): {
  sourceId: string;
  recordingId: string;
  revision: number;
  reason: string;
  evidenceIds: string[];
}[] {
  if (
    !Number.isFinite(options.now) ||
    !Number.isInteger(options.limit) ||
    options.limit < 1 ||
    options.limit > 96 ||
    candidates.length > 10000
  )
    throw new Error("Invalid trial bounds");
  const counts = new Map<string, number>();
  for (const c of candidates)
    counts.set(c.sourceId, (counts.get(c.sourceId) ?? 0) + 1);
  return candidates
    .flatMap((c) => {
      if (
        counts.get(c.sourceId) !== 1 ||
        c.accountId !== options.accountId ||
        !c.available ||
        c.suppressed ||
        !Number.isFinite(c.metadataExpiresAt) ||
        c.metadataExpiresAt <= options.now ||
        c.linkStatus !== "accepted" ||
        !c.exactVersion ||
        !Number.isSafeInteger(c.revision) ||
        c.revision < 1 ||
        !Number.isSafeInteger(c.plays) ||
        c.plays < 0
      )
        return [];
      const evidence = c.evidence.filter(
        (e) =>
          e.accountId === options.accountId &&
          e.recordingId === c.recordingId &&
          e.status !== "withdrawn",
      );
      const evidenceIds: string[] = [];
      if (options.strict) {
        for (const [facet, value] of [
          ["theme", "fantasy"],
          ["instrumentation", "orchestral"],
        ]) {
          const relevant = evidence.filter(
            (e) => e.facet === facet && e.value === value,
          );
          // Unusable/conflicting evidence abstains; more positive votes cannot erase it.
          if (
            !relevant.length ||
            relevant.some(
              (e) =>
                e.status !== "accepted" ||
                e.polarity !== "supports" ||
                !e.reference.trim() ||
                !e.license.trim() ||
                (e.origin === "owner_reference" &&
                  (!e.reference.startsWith("owner:") ||
                    !e.reference.slice(6).trim() ||
                    e.license !== "owner-authored-private")) ||
                !Number.isFinite(e.reviewedAt) ||
                !Number.isFinite(e.expiresAt) ||
                e.reviewedAt > options.now ||
                e.expiresAt <= options.now ||
                e.expiresAt <= e.reviewedAt ||
                (e.origin !== "owner_reference" &&
                  !(options.fixtures === true && e.origin === "synthetic")),
            )
          )
            return [];
          evidenceIds.push(...relevant.map((e) => e.id));
        }
      }
      const rediscovery =
        c.plays > 0 &&
        c.lastPlayedAt !== null &&
        Number.isFinite(c.lastPlayedAt) &&
        c.lastPlayedAt <= options.now - 7 * 86400000;
      return [
        {
          c,
          rediscovery,
          result: {
            sourceId: c.sourceId,
            recordingId: c.recordingId,
            revision: c.revision,
            reason: c.liked
              ? "You liked this"
              : rediscovery
                ? "Worth another listen"
                : options.strict
                  ? "Supported Fantasy/orchestral classification"
                  : "Verified recording reference",
            evidenceIds: [...new Set(evidenceIds)],
          },
        },
      ];
    })
    .sort(
      (a, b) =>
        Number(b.c.liked) - Number(a.c.liked) ||
        Number(b.rediscovery) - Number(a.rediscovery) ||
        b.c.plays - a.c.plays ||
        a.c.sourceId.localeCompare(b.c.sourceId),
    )
    .slice(0, options.limit)
    .map((r) => r.result);
}
