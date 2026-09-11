import { MBID, type RecordingCore } from "./musicbrainz-core";
import {
  matchRecording,
  IDENTITY_RULE,
  type SourceSnapshot,
} from "./automatic-identity";
import type { EnrichmentProviders } from "./automatic-enrichment";
export type ShadowJobStore = {
  enqueue(account: string, limit: number): Promise<void>;
  claim(): Promise<unknown>;
  complete(jobId: string, token: string, outcome: unknown): Promise<boolean>;
};
const object = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
function source(v: unknown, now: number): SourceSnapshot | null {
  const s = object(v);
  if (
    !s ||
    typeof s.mediaId !== "string" ||
    !/^[A-Za-z0-9_-]{6,64}$/.test(s.mediaId) ||
    typeof s.title !== "string" ||
    s.title.length > 300 ||
    typeof s.channel !== "string" ||
    s.channel.length > 200 ||
    typeof s.durationSeconds !== "number" ||
    !Number.isFinite(s.durationSeconds) ||
    s.durationSeconds <= 0 ||
    s.durationSeconds > 86400 ||
    typeof s.expiresAt !== "number" ||
    !Number.isFinite(s.expiresAt) ||
    s.expiresAt <= now
  )
    return null;
  return s as SourceSnapshot;
}
function recording(v: unknown): RecordingCore | null {
  const c = object(v);
  if (
    !c ||
    typeof c.mbid !== "string" ||
    !MBID.test(c.mbid) ||
    typeof c.title !== "string" ||
    !c.title.trim() ||
    c.title.length > 200 ||
    typeof c.artistCredit !== "string" ||
    !c.artistCredit.trim() ||
    c.artistCredit.length > 500 ||
    typeof c.disambiguation !== "string" ||
    c.disambiguation.length > 200 ||
    typeof c.lengthMs !== "number" ||
    !Number.isSafeInteger(c.lengthMs) ||
    c.lengthMs <= 0 ||
    c.lengthMs > 86400000
  )
    return null;
  return c as RecordingCore;
}
export async function runShadowJob(options: {
  enabled: boolean;
  account: string;
  now(): number;
  deadline: number;
  store: ShadowJobStore;
  providers: EnrichmentProviders;
}): Promise<{
  status: "disabled" | "idle" | "invalid" | "stale" | "completed";
}> {
  const { now, store, providers } = options;
  if (!options.enabled || !MBID.test(options.account))
    return { status: "disabled" };
  if (!Number.isFinite(options.deadline) || now() + 25000 >= options.deadline)
    return { status: "idle" };
  await store.enqueue(options.account, 5);
  const claim = object(await store.claim());
  if (!claim || !Object.keys(claim).length) return { status: "idle" };
  const snapshot = source(claim.snapshot, now()),
    core = recording(claim.recording);
  if (
    typeof claim.jobId !== "string" ||
    !MBID.test(claim.jobId) ||
    typeof claim.token !== "string" ||
    !MBID.test(claim.token) ||
    typeof claim.leaseUntil !== "string" ||
    !Number.isFinite(Date.parse(claim.leaseUntil)) ||
    Math.min(Date.parse(claim.leaseUntil), options.deadline) < now() + 25000 ||
    !snapshot ||
    !["identity", "tags", "audio"].includes(String(claim.stage)) ||
    (claim.stage !== "identity" && !core)
  )
    return { status: "invalid" };
  let outcome: unknown;
  try {
    if (claim.stage === "identity") {
      const result = await providers.search(snapshot);
      outcome =
        result.status === "ready"
          ? matchRecording(snapshot, result.candidates, result.complete, now())
          : result.status === "retry"
            ? { status: "retry", retrySeconds: result.retrySeconds ?? 60 }
            : {
                status: "unresolved",
                rule: IDENTITY_RULE,
                reason: "provider-invalid",
              };
    } else if (claim.stage === "tags") outcome = await providers.tags(core!);
    else outcome = await providers.audio(core!);
  } catch {
    outcome = { status: "retry", retrySeconds: 60 };
  }
  return {
    status: (await store.complete(claim.jobId, claim.token, outcome))
      ? "completed"
      : "stale",
  };
}
