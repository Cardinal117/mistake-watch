import { readBoundedJson } from "./bounded-json";
export const MBID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type RecordingCore = {
  mbid: string;
  title: string;
  artistCredit: string;
  disambiguation: string;
  lengthMs: number | null;
};
export function recordingReference(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 256) return null;
  const match = /^https:\/\/musicbrainz\.org\/recording\/([^/?#]+)\/?$/.exec(
    value.trim(),
  );
  return match && MBID.test(match[1]) ? match[1].toLowerCase() : null;
}
export async function lookupRecording(
  id: string,
  fetcher: typeof fetch = fetch,
): Promise<
  | { status: "ready"; core: RecordingCore }
  | { status: "retry" | "invalid" | "not_found"; retrySeconds?: number }
> {
  if (!MBID.test(id)) return { status: "invalid" };
  try {
    const response = await fetcher(
      `https://musicbrainz.org/ws/2/recording/${id}?inc=artist-credits&fmt=json`,
      {
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
        headers: {
          Accept: "application/json",
          "User-Agent":
            "MistakeWatch/0.1.0 (https://github.com/Cardinal117/mistake-watch)",
        },
      },
    );
    if (response.status === 404) return { status: "not_found" };
    if (response.status === 429 || response.status >= 500) {
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
          ? Math.min(86400, Math.max(60, seconds))
          : 60,
      };
    }
    if (!response.ok) return { status: "invalid" };
    const body = await readBoundedJson(response, 131072);
    if (
      !body.ok ||
      !body.value ||
      typeof body.value !== "object" ||
      Array.isArray(body.value)
    )
      return { status: "invalid" };
    const r = body.value as Record<string, unknown>;
    const text = (v: unknown, max: number, empty = false): v is string =>
      typeof v === "string" && v.length <= max && (empty || Boolean(v.trim()));
    if (
      r.id !== id ||
      !text(r.title, 200) ||
      (r.disambiguation !== undefined && !text(r.disambiguation, 200, true)) ||
      (r.length !== undefined &&
        r.length !== null &&
        (!Number.isSafeInteger(r.length) ||
          (r.length as number) < 0 ||
          (r.length as number) > 86400000)) ||
      !Array.isArray(r["artist-credit"]) ||
      r["artist-credit"].length > 20
    )
      return { status: "invalid" };
    const credit: string[] = [];
    for (const entry of r["artist-credit"]) {
      if (
        !entry ||
        typeof entry !== "object" ||
        !text(entry.name, 200) ||
        (entry.joinphrase !== undefined && !text(entry.joinphrase, 40, true))
      )
        return { status: "invalid" };
      credit.push(entry.name + (entry.joinphrase ?? ""));
    }
    if (credit.join("").length > 500) return { status: "invalid" };
    return {
      status: "ready",
      core: {
        mbid: id,
        title: r.title,
        artistCredit: credit.join(""),
        disambiguation: (r.disambiguation as string) ?? "",
        lengthMs: (r.length as number | null) ?? null,
      },
    };
  } catch {
    return { status: "retry", retrySeconds: 60 };
  }
}
