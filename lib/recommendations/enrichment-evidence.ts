import type { RecordingCore } from "./musicbrainz-core";
import { identityText } from "./automatic-identity";

type JsonObject = Record<string, unknown>;
const object = (v: unknown): JsonObject | null =>
  v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as JsonObject)
    : null;
const probability = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;
function version(v: unknown): JsonObject | null {
  const o = object(v);
  return o && Object.keys(o).length > 0 && JSON.stringify(o).length <= 4096
    ? o
    : null;
}
export type AudioEvidence = {
  bpm: number | null;
  key: string | null;
  scale: string | null;
  version: { low: JsonObject; high: JsonObject };
  classifiers: Record<
    string,
    {
      value: string;
      probability: number;
      all: Record<string, number>;
      version: JsonObject;
    }
  >;
  submission: 0;
};
export function normalizeAudio(
  low: unknown,
  high: unknown,
  duration: number,
): AudioEvidence | null {
  const l = object(low),
    h = object(high),
    lm = object(l?.metadata),
    hm = object(h?.metadata);
  const lv = version(lm?.version),
    hv = version(hm?.version);
  if (!lv || !hv || !Number.isFinite(duration) || duration <= 0) return null;
  for (const m of [lm, hm]) {
    const length = object(m?.audio_properties)?.length;
    if (
      typeof length !== "number" ||
      !Number.isFinite(length) ||
      Math.abs(length - duration) > 3
    )
      return null;
  }
  const rhythm = object(l?.rhythm),
    tonal = object(l?.tonal),
    classifiers: AudioEvidence["classifiers"] = {};
  const models = object(h?.highlevel);
  if (!models || Object.keys(models).length > 64) return null;
  for (const [name, raw] of Object.entries(models)) {
    if (
      !/^(genre_[a-z_]+|mood_[a-z_]+|danceability|voice_instrumental|tonal_atonal|timbre)$/.test(
        name,
      )
    )
      continue;
    const c = object(raw),
      all = object(c?.all),
      model = version(c?.version);
    if (
      !c ||
      !all ||
      !model ||
      typeof c.value !== "string" ||
      !probability(c.probability) ||
      !Object.hasOwn(all, c.value) ||
      Object.keys(all).length > 64 ||
      !Object.values(all).every(probability)
    )
      return null;
    if (
      Math.abs((all[c.value] as number) - c.probability) > 0.001 ||
      Object.values(all).some(
        (v) => (v as number) > (c.probability as number) + 0.001,
      )
    )
      return null;
    classifiers[name] = {
      value: c.value,
      probability: c.probability,
      all: all as Record<string, number>,
      version: model,
    };
  }
  const key =
    typeof tonal?.key_key === "string" && /^[A-G](#|b)?$/.test(tonal.key_key)
      ? tonal.key_key
      : null;
  return {
    bpm:
      typeof rhythm?.bpm === "number" &&
      Number.isFinite(rhythm.bpm) &&
      rhythm.bpm > 0 &&
      rhythm.bpm <= 500
        ? rhythm.bpm
        : null,
    key,
    scale:
      tonal?.key_scale === "major" || tonal?.key_scale === "minor"
        ? tonal.key_scale
        : null,
    classifiers,
    version: { low: lv, high: hv },
    submission: 0,
  };
}
export function normalizeTrackTags(
  body: unknown,
  core: RecordingCore,
): string[] | null {
  const track = object(object(body)?.track),
    artist = object(track?.artist);
  if (
    typeof track?.name !== "string" ||
    typeof artist?.name !== "string" ||
    identityText(track.name) !== identityText(core.title) ||
    identityText(artist.name) !== identityText(core.artistCredit)
  )
    return null;
  const tags = object(track.toptags)?.tag;
  if (track.mbid != null && track.mbid !== "" && track.mbid !== core.mbid)
    return null;
  if (
    track.duration != null &&
    track.duration !== "" &&
    track.duration !== "0" &&
    track.duration !== 0
  ) {
    const duration = Number(track.duration);
    if (
      !Number.isFinite(duration) ||
      duration <= 0 ||
      core.lengthMs === null ||
      Math.abs(duration - core.lengthMs) > 3000
    )
      return null;
  }
  if (!Array.isArray(tags) || tags.length > 100) return null;
  const names: string[] = [];
  for (const tag of tags) {
    const name = object(tag)?.name;
    if (typeof name !== "string" || !name.trim() || name.length > 100)
      return null;
    names.push(name.trim());
  }
  return [...new Set(names)].slice(0, 20);
}
