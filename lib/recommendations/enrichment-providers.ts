import { readBoundedJson } from "./bounded-json";
import { MBID, type RecordingCore } from "./musicbrainz-core";
import { sourceIdentity } from "./automatic-identity";
import { normalizeAudio, normalizeTrackTags } from "./enrichment-evidence";
import type { EnrichmentProviders } from "./automatic-enrichment";

const object = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
const text = (v: unknown, max: number): v is string =>
  typeof v === "string" && !!v.trim() && v.length <= max;
// This adapter is for an isolated serial shadow batch, not concurrent deployment.
export function createEnrichmentProviders(
  options: {
    fetcher?: typeof fetch;
    lastfmKey?: string;
    pause?: (ms: number) => Promise<void>;
  } = {},
): EnrichmentProviders {
  const fetcher = options.fetcher ?? fetch,
    paused = new Set<string>();
  async function get(
    url: URL,
    bound: number,
  ): Promise<
    | { status: "ready"; data: unknown }
    | { status: "missing" | "retry" | "invalid"; retrySeconds?: number }
  > {
    if (paused.has(url.hostname)) return { status: "retry" };
    try {
      const response = await fetcher(url.toString(), {
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
        headers: {
          Accept: "application/json",
          "User-Agent":
            "MistakeWatch/0.1.0 (https://github.com/Cardinal117/mistake-watch)",
        },
      });
      if (response.status === 404) return { status: "missing" };
      if (response.status === 429 || response.status >= 500) {
        paused.add(url.hostname);
        const raw = response.headers.get("Retry-After");
        const seconds =
          raw && /^\d+$/.test(raw)
            ? Number(raw)
            : raw
              ? Math.ceil((Date.parse(raw) - Date.now()) / 1000)
              : 60;
        return {
          status: "retry",
          retrySeconds: Number.isFinite(seconds)
            ? Math.max(60, Math.min(86400, seconds))
            : 60,
        };
      }
      if (!response.ok) return { status: "invalid" };
      const parsed = await readBoundedJson(response, bound);
      return parsed.ok
        ? { status: "ready", data: parsed.value }
        : { status: "invalid" };
    } catch {
      paused.add(url.hostname);
      return { status: "retry" };
    }
  }
  return {
    async search(source) {
      const wanted = sourceIdentity(source);
      if (!wanted || source.title.length > 300 || source.channel.length > 200)
        return { status: "invalid" };
      const escape = (s: string) =>
        s.replace(/([+\-!(){}\[\]^"~*?:\\/]|&&|\|\|)/g, "\\$1");
      const url = new URL("https://musicbrainz.org/ws/2/recording");
      url.search = new URLSearchParams({
        query: `recording:"${escape(wanted.title)}" AND artist:"${escape(wanted.artistCredit)}"`,
        fmt: "json",
        limit: "25",
      }).toString();
      const result = await get(url, 262144);
      if (result.status !== "ready")
        return {
          status: result.status === "missing" ? "invalid" : result.status,
          retrySeconds: result.retrySeconds,
        };
      const body = object(result.data),
        rows = body?.recordings;
      if (
        !body ||
        !Array.isArray(rows) ||
        rows.length > 25 ||
        !Number.isSafeInteger(body.count) ||
        (body.count as number) < rows.length ||
        body.offset !== 0
      )
        return { status: "invalid" };
      const candidates: RecordingCore[] = [];
      for (const raw of rows) {
        const r = object(raw),
          credits = r?.["artist-credit"];
        if (
          !r ||
          !text(r.id, 36) ||
          !MBID.test(r.id) ||
          !text(r.title, 200) ||
          !Array.isArray(credits) ||
          !credits.length ||
          credits.length > 20
        )
          return { status: "invalid" };
        let artistCredit = "";
        for (const rawCredit of credits) {
          const c = object(rawCredit);
          if (
            !c ||
            !text(c.name, 200) ||
            (c.joinphrase !== undefined &&
              (typeof c.joinphrase !== "string" || c.joinphrase.length > 40))
          )
            return { status: "invalid" };
          artistCredit += c.name + (c.joinphrase ?? "");
        }
        if (
          artistCredit.length > 500 ||
          (r.disambiguation !== undefined &&
            (typeof r.disambiguation !== "string" ||
              r.disambiguation.length > 200)) ||
          (r.length != null &&
            (!Number.isSafeInteger(r.length) ||
              (r.length as number) <= 0 ||
              (r.length as number) > 86400000))
        )
          return { status: "invalid" };
        candidates.push({
          mbid: r.id.toLowerCase(),
          title: r.title,
          artistCredit,
          disambiguation: (r.disambiguation as string) ?? "",
          lengthMs: (r.length as number) ?? null,
        });
      }
      return {
        status: "ready",
        candidates,
        complete: body.count === rows.length,
      };
    },
    async tags(core) {
      if (!options.lastfmKey) return { status: "disabled" };
      const url = new URL("https://ws.audioscrobbler.com/2.0/");
      url.search = new URLSearchParams({
        method: "track.getInfo",
        api_key: options.lastfmKey,
        artist: core.artistCredit,
        track: core.title,
        autocorrect: "0",
        format: "json",
      }).toString();
      const result = await get(url, 262144);
      if (result.status !== "ready") return result;
      const error = object(result.data)?.error;
      if (error === 6) return { status: "missing" };
      if (error !== undefined) {
        paused.add(url.hostname);
        return { status: "retry" };
      }
      const data = normalizeTrackTags(result.data, core);
      return data === null
        ? { status: "invalid" }
        : data.length
          ? { status: "ready", data }
          : { status: "missing" };
    },
    async audio(core) {
      if (!MBID.test(core.mbid) || core.lengthMs === null)
        return { status: "invalid" };
      const low = await get(
        new URL(`https://acousticbrainz.org/api/v1/${core.mbid}/low-level?n=0`),
        2097152,
      );
      if (low.status !== "ready") return low;
      await (
        options.pause ??
        ((ms: number) =>
          new Promise<void>((resolve) => setTimeout(resolve, ms)))
      )(1100);
      const high = await get(
        new URL(
          `https://acousticbrainz.org/api/v1/${core.mbid}/high-level?n=0`,
        ),
        2097152,
      );
      if (high.status !== "ready") return high;
      const data = normalizeAudio(low.data, high.data, core.lengthMs / 1000);
      return data ? { status: "ready", data } : { status: "invalid" };
    },
  };
}
