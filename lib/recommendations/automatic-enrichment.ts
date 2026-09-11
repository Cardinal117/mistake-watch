import {
  IDENTITY_RULE,
  matchRecording,
  type SourceSnapshot,
  type IdentityOutcome,
} from "./automatic-identity";
import type { RecordingCore } from "./musicbrainz-core";
import type { AudioEvidence, TagFailureReason } from "./enrichment-evidence";
export type ProviderResult<T> =
  | { status: "ready"; data: T }
  | {
      status: "missing" | "retry" | "invalid" | "disabled";
      retrySeconds?: number;
      reason?: TagFailureReason | "no-tags" | "track-not-found";
    };
export type SearchResult =
  | { status: "ready"; candidates: RecordingCore[]; complete: boolean }
  | { status: "retry" | "invalid"; retrySeconds?: number };
export type EnrichmentProviders = {
  search(source: SourceSnapshot): Promise<SearchResult>;
  tags(core: RecordingCore): Promise<ProviderResult<string[]>>;
  audio(core: RecordingCore): Promise<ProviderResult<AudioEvidence>>;
};
type CacheEntry = { fetchedAt: number; expiresAt: number; value: unknown };
export type EnrichmentCache = Map<string, CacheEntry>;
export type ShadowProfile = {
  sourceId: string;
  sourceSnapshot: string;
  identity: IdentityOutcome;
  tags?: ProviderResult<string[]>;
  audio?: ProviderResult<AudioEvidence>;
  expiresAt: number;
  mode: "shadow";
  provenance: Record<
    string,
    { provider: string; fetchedAt: number; expiresAt: number }
  >;
};
export async function runEnrichmentBatch(
  sources: SourceSnapshot[],
  options: {
    providers: EnrichmentProviders;
    cache: EnrichmentCache;
    now(): number;
    sleep(ms: number): Promise<void>;
    deadline: number;
    maxItems: number;
  },
): Promise<ShadowProfile[]> {
  if (
    !Number.isSafeInteger(options.maxItems) ||
    options.maxItems < 1 ||
    options.maxItems > 60 ||
    !Number.isFinite(options.deadline)
  )
    throw Error("Invalid batch bounds");
  const { now, cache, providers } = options;
  // Caller owns this isolated shadow cache. Production requires durable leases.
  for (const [key, entry] of cache)
    if (entry.expiresAt <= now()) cache.delete(key);
  if (cache.size > 4096) throw Error("Cache capacity exceeded");
  const rows: ShadowProfile[] = [];
  const receipts = new Map<string, CacheEntry>();
  async function cached<T extends { status: string }>(
    key: string,
    expiresAt: number,
    fetcher: () => Promise<T>,
  ): Promise<T | { status: "retry" }> {
    const found = cache.get(key);
    if (found && found.fetchedAt <= now() && found.expiresAt > now()) {
      receipts.set(key, found);
      return found.value as T;
    }
    if (now() + 18000 >= options.deadline) return { status: "retry" };
    const fetchedAt = now();
    let value: T | { status: "retry" };
    try {
      value = await fetcher();
    } catch {
      value = { status: "retry" };
    }
    const expiry = Math.min(
      expiresAt,
      fetchedAt + (value.status === "retry" ? 60000 : 30 * 86400000),
    );
    receipts.set(key, { fetchedAt, expiresAt: expiry, value });
    if (value.status !== "disabled" && expiry > now() && cache.size < 4096)
      cache.set(key, { fetchedAt, expiresAt: expiry, value });
    await options.sleep(2100);
    return value;
  }
  for (const source of sources.slice(0, options.maxItems)) {
    if (now() >= options.deadline) break;
    const snapshot = JSON.stringify(source);
    let identity = matchRecording(source, [], true, now());
    const row: ShadowProfile = {
      sourceId: source.mediaId,
      sourceSnapshot: snapshot,
      identity,
      expiresAt: source.expiresAt,
      mode: "shadow",
      provenance: {},
    };
    if (
      identity.status === "unresolved" &&
      ["stale-source", "missing-duration", "untrusted-artist"].includes(
        identity.reason,
      )
    ) {
      rows.push(row);
      continue;
    }
    const search = await cached(
      `musicbrainz-search:${IDENTITY_RULE}:${snapshot}`,
      source.expiresAt,
      () => providers.search(source),
    );
    identity =
      search.status === "ready"
        ? matchRecording(source, search.candidates, search.complete, now())
        : {
            status: "unresolved",
            rule: IDENTITY_RULE,
            reason: `provider-${search.status}`,
          };
    row.identity = identity;
    function record(label: string, key: string, provider: string) {
      const entry = receipts.get(key);
      if (entry) {
        row.provenance[label] = {
          provider,
          fetchedAt: entry.fetchedAt,
          expiresAt: Math.min(source.expiresAt, entry.expiresAt),
        };
        row.expiresAt = Math.min(row.expiresAt, entry.expiresAt);
      }
    }
    record(
      "identity",
      `musicbrainz-search:${IDENTITY_RULE}:${snapshot}`,
      "musicbrainz",
    );
    if (identity.status === "provisional") {
      const c = identity.recording,
        key = JSON.stringify(c);
      row.tags = await cached(`lastfm-track-v1:${key}`, source.expiresAt, () =>
        providers.tags(c),
      );
      row.audio = await cached(
        `acousticbrainz-offset0-v1:${key}`,
        source.expiresAt,
        () => providers.audio(c),
      );
      record("tags", `lastfm-track-v1:${key}`, "lastfm");
      record("audio", `acousticbrainz-offset0-v1:${key}`, "acousticbrainz");
    }
    if (source.expiresAt <= now()) {
      row.identity = {
        status: "unresolved",
        rule: IDENTITY_RULE,
        reason: "stale-source",
      };
      delete row.tags;
      delete row.audio;
      row.provenance = {};
    }
    rows.push(row);
  }
  return rows;
}
