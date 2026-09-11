import { MBID, type RecordingCore } from "./musicbrainz-core";

export const IDENTITY_RULE = "exact-credit-version-duration-v1";
export type SourceSnapshot = {
  mediaId: string;
  title: string;
  channel: string;
  durationSeconds: number;
  expiresAt: number;
};
export type IdentityOutcome =
  | { status: "provisional"; rule: string; recording: RecordingCore }
  | { status: "unresolved"; rule: string; reason: string };

// Keep Unicode and version words. Lossy transliteration can merge identities.
export function identityText(value: string): string {
  return value
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim();
}
export function sourceIdentity(source: SourceSnapshot) {
  if (!source.channel.endsWith(" - Topic")) return null;
  const feature = /\s*\(feat\.\s*([^()]+)\)\s*$/i.exec(source.title);
  const title = feature ? source.title.slice(0, feature.index) : source.title;
  const artist = source.channel.slice(0, -8);
  if (!identityText(title) || !identityText(artist)) return null;
  return {
    title,
    artistCredit: artist + (feature ? ` feat. ${feature[1]}` : ""),
  };
}
export function matchRecording(
  source: SourceSnapshot,
  candidates: RecordingCore[],
  complete: boolean,
  now: number,
): IdentityOutcome {
  const no = (reason: string): IdentityOutcome => ({
    status: "unresolved",
    rule: IDENTITY_RULE,
    reason,
  });
  if (
    !Number.isFinite(now) ||
    !Number.isFinite(source.expiresAt) ||
    source.expiresAt <= now
  )
    return no("stale-source");
  if (
    !Number.isFinite(source.durationSeconds) ||
    source.durationSeconds <= 0 ||
    source.durationSeconds > 86400
  )
    return no("missing-duration");
  const wanted = sourceIdentity(source);
  if (!wanted) return no("untrusted-artist");
  if (!complete || candidates.length > 25) return no("incomplete-candidates");
  const distinct = new Map<string, RecordingCore>();
  for (const c of candidates) {
    if (
      !MBID.test(c.mbid) ||
      typeof c.title !== "string" ||
      typeof c.artistCredit !== "string" ||
      typeof c.disambiguation !== "string"
    )
      return no("invalid-candidate");
    const id = c.mbid.toLowerCase();
    const previous = distinct.get(id);
    if (previous && JSON.stringify(previous) !== JSON.stringify(c))
      return no("conflicting-recording");
    distinct.set(id, c);
  }
  const matches = [...distinct.values()].filter(
    (c) =>
      !c.disambiguation.trim() &&
      identityText(c.title) === identityText(wanted.title) &&
      identityText(c.artistCredit) === identityText(wanted.artistCredit) &&
      c.lengthMs !== null &&
      Number.isSafeInteger(c.lengthMs) &&
      c.lengthMs > 0 &&
      Math.abs(c.lengthMs / 1000 - source.durationSeconds) <= 3,
  );
  return matches.length === 1
    ? { status: "provisional", rule: IDENTITY_RULE, recording: matches[0] }
    : no(matches.length ? "ambiguous-recording" : "insufficient-agreement");
}
