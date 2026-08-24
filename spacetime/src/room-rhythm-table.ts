import { table, t } from "spacetimedb/server";

export const roomRhythmProfile = table(
  { name: "room_rhythm_profile", public: true },
  {
    algorithm_version: t.string(),
    beat_interval_seconds: t.f64(),
    bpm: t.f64(),
    confidence: t.f64(),
    expires_ms: t.i64(),
    media_beat_offset_seconds: t.f64(),
    media_id: t.string(),
    playback_occurrence_id: t.string(),
    published_ms: t.i64(),
    revision: t.u32(),
    room_id: t.string().primaryKey(),
    source_type: t.string(),
  },
);
